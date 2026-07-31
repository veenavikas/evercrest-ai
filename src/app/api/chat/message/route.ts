import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages, workOrders, aiUsageLogs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, desc } from "drizzle-orm";
import { analyzeTenantMessage, analyzeMaintenanceImages, createBotReply, createStaffEmail } from "@/lib/workorder-ai/triage";
import { logSystemEvent } from "@/lib/workorder-ai/systemLog";
import type { VerdictState, AttachmentNote } from "@/lib/workorder-ai/types";

const defaultVerdict: VerdictState = {
  issueCategory: "Unclear issue",
  issueLocation: "General",
  currentStatus: "Active now",
  severity: "routine",
  safetyConcerns: [],
  missingInfo: ["issue description", "permission to enter"],
  photoVideoStatus: "optional_if_useful",
  safeStepsDiscussed: [],
  staffReviewRequired: false,
  staffReviewReason: [],
  likelyVendorCategory: "General Handyman",
  intakeComplete: false,
  possibleTenantCausedIndicators: [],
  complianceSensitiveFlags: [],
  accessDetails: {
    permissionToEnter: "unclear",
    occupied: "unclear",
    restrictedTimes: "",
    inaccessibleAreas: "",
    petsPresent: "unclear",
    petSecurePlan: "",
    alarmPresent: "unclear",
    alarmCodeHandling: "unclear",
    gateOrEntryNotes: "",
    parkingOrHoaNotes: "",
    contactPreference: "",
  },
  differentialAnalysis: [],
  costEstimation: "",
  repairpersonAdvice: "",
};

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { conversationId, message, attachments = [] } = await request.json();
    if (!message && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Message or attachment is required" } }, { status: 400 });
    }

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const [newConv] = await db.insert(conversations).values({
        userId: session.userId,
        propertyId: session.propertyId,
      }).returning();
      activeConversationId = newConv.id;
    }

    const textInput = message || "Attachment uploaded for review";

    await db.insert(messages).values({
      conversationId: activeConversationId,
      sender: "tenant",
      content: textInput,
    });

    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, activeConversationId));

    const history = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, activeConversationId))
      .orderBy(desc(messages.createdAt))
      .limit(30);

    history.reverse();

    const transcript = history.map((msg) => `${msg.sender === "tenant" ? "Tenant" : "Bot"}: ${msg.content}`).join("\n");

    let processedAttachments: AttachmentNote[] = [];
    let visionUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    if (attachments && attachments.length > 0) {
      const visionResult = await analyzeMaintenanceImages(attachments, transcript, `conv-${activeConversationId}`);
      processedAttachments = visionResult.attachments;
      visionUsage = visionResult.tokenUsage;
    }

    const { verdict, tokenUsage: stateUsage } = await analyzeTenantMessage(
      defaultVerdict,
      textInput,
      transcript,
      `conv-${activeConversationId}`
    );

    const { body: botReplyText, tokenUsage: replyUsage } = await createBotReply(
      verdict,
      transcript,
      `conv-${activeConversationId}`
    );

    const totalInputTokens = visionUsage.inputTokens + stateUsage.inputTokens + replyUsage.inputTokens;
    const totalOutputTokens = visionUsage.outputTokens + stateUsage.outputTokens + replyUsage.outputTokens;
    const grandTotalTokens = visionUsage.totalTokens + stateUsage.totalTokens + replyUsage.totalTokens;

    await db.insert(aiUsageLogs).values({
      feature: "triage_chat",
      model: "gpt-4o-mini",
      promptTokens: totalInputTokens,
      completionTokens: totalOutputTokens,
      relatedConversationId: activeConversationId,
    });

    await db.insert(messages).values({
      conversationId: activeConversationId,
      sender: "assistant",
      content: botReplyText,
    });

    let createdWorkOrder = null;
    if (verdict.intakeComplete || verdict.severity === "emergency" || verdict.severity === "urgent") {
      const urgencyMap: Record<string, "low" | "medium" | "high" | "emergency"> = {
        emergency: "emergency",
        urgent: "high",
        routine: "low",
        staff_triage: "medium",
      };
      const urgencyVal = urgencyMap[verdict.severity] || "medium";

      const refCode = `WO-${Date.now().toString().slice(-6)}`;
      const existingWo = await db.select().from(workOrders).where(eq(workOrders.conversationId, activeConversationId)).limit(1);

      if (existingWo.length > 0) {
        [createdWorkOrder] = await db.update(workOrders)
          .set({
            category: verdict.issueCategory,
            description: `${verdict.issueCategory} at ${verdict.issueLocation}: ${textInput}`,
            urgency: urgencyVal,
            internalNotes: JSON.stringify({
              verdict,
              safetyConcerns: verdict.safetyConcerns,
              likelyVendor: verdict.likelyVendorCategory,
              differentialAnalysis: verdict.differentialAnalysis,
              repairpersonAdvice: verdict.repairpersonAdvice,
              costEstimation: verdict.costEstimation,
            }),
          })
          .where(eq(workOrders.id, existingWo[0].id))
          .returning();
      } else {
        [createdWorkOrder] = await db.insert(workOrders).values({
          referenceCode: refCode,
          conversationId: activeConversationId,
          tenantId: session.userId,
          propertyId: session.propertyId,
          category: verdict.issueCategory,
          description: `${verdict.issueCategory} at ${verdict.issueLocation}: ${textInput}`,
          urgency: urgencyVal,
          status: "new",
          internalNotes: JSON.stringify({
            verdict,
            safetyConcerns: verdict.safetyConcerns,
            likelyVendor: verdict.likelyVendorCategory,
            differentialAnalysis: verdict.differentialAnalysis,
            repairpersonAdvice: verdict.repairpersonAdvice,
            costEstimation: verdict.costEstimation,
          }),
        }).returning();
      }

      await logSystemEvent({
        level: verdict.severity === "emergency" ? "error" : verdict.severity === "urgent" ? "warning" : "info",
        source: "triage",
        event: "work_order.created",
        message: `Work order ${refCode} auto-created for ${verdict.issueCategory}`,
        conversationId: `conv-${activeConversationId}`,
        details: { urgency: urgencyVal, category: verdict.issueCategory },
      });
    }

    return NextResponse.json({
      conversationId: activeConversationId,
      reply: botReplyText,
      verdict,
      workOrder: createdWorkOrder,
      tokenUsage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: grandTotalTokens,
      },
    });

  } catch (error) {
    console.error("Error in chat/message:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

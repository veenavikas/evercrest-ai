import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages, users, properties, workOrders } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, desc } from "drizzle-orm";
import { createStaffEmail } from "@/lib/workorder-ai/triage";
import type { ConversationRecord, VerdictState, ChatMessage } from "@/lib/workorder-ai/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { id } = await params;
    const convId = Number(id);

    const convRows = await db.select({
      id: conversations.id,
      startedAt: conversations.startedAt,
      lastMessageAt: conversations.lastMessageAt,
      isArchived: conversations.isArchived,
      tenantId: users.id,
      tenantName: users.fullName,
      tenantEmail: users.email,
      propertyId: properties.id,
      propertyAddress: properties.addressLine1,
      city: properties.city,
      state: properties.state,
    })
    .from(conversations)
    .leftJoin(users, eq(conversations.userId, users.id))
    .leftJoin(properties, eq(conversations.propertyId, properties.id))
    .where(eq(conversations.id, convId))
    .limit(1);

    if (convRows.length === 0) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, { status: 404 });
    }

    const convData = convRows[0];

    const msgRows = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(desc(messages.createdAt));

    msgRows.reverse();

    const formattedMessages: ChatMessage[] = msgRows.map((m) => ({
      id: `msg-${m.id}`,
      sender: m.sender === "assistant" ? "bot" : "tenant",
      body: m.content,
      createdAt: m.createdAt.toISOString(),
    }));

    const woRows = await db.select()
      .from(workOrders)
      .where(eq(workOrders.conversationId, convId))
      .limit(1);

    let parsedVerdict: VerdictState = {
      issueCategory: woRows[0]?.category || "Maintenance Issue",
      issueLocation: woRows[0]?.unitNumber || "General",
      currentStatus: woRows[0]?.status || "Active",
      severity: (woRows[0]?.urgency === "emergency" ? "emergency" : woRows[0]?.urgency === "high" ? "urgent" : "routine") as any,
      safetyConcerns: [],
      missingInfo: [],
      photoVideoStatus: "optional_if_useful",
      safeStepsDiscussed: [],
      staffReviewRequired: true,
      staffReviewReason: ["Admin inspection requested"],
      likelyVendorCategory: woRows[0]?.category || "General Maintenance",
      intakeComplete: true,
      possibleTenantCausedIndicators: [],
      complianceSensitiveFlags: [],
      accessDetails: {
        permissionToEnter: "yes",
        occupied: "yes",
        restrictedTimes: "",
        inaccessibleAreas: "",
        petsPresent: "unclear",
        petSecurePlan: "",
        alarmPresent: "unclear",
        alarmCodeHandling: "unclear",
        gateOrEntryNotes: "",
        parkingOrHoaNotes: "",
        contactPreference: convData.tenantEmail || "",
      },
      differentialAnalysis: [
        {
          possibleIssue: woRows[0]?.category || "Maintenance Issue",
          confidence: 95,
          evidence: woRows[0]?.description || "Tenant reported maintenance issue.",
        }
      ],
      costEstimation: "$150 - $350 (Trade standard)",
      repairpersonAdvice: "Check primary system components and verify safety parameters.",
    };

    if (woRows[0]?.internalNotes) {
      try {
        const parsed = JSON.parse(woRows[0].internalNotes);
        if (parsed.verdict) {
          parsedVerdict = { ...parsedVerdict, ...parsed.verdict };
        }
      } catch (e) {
        console.error("Failed to parse internalNotes:", e);
      }
    }

    const conversationRecord: ConversationRecord = {
      id: `conv-${convData.id}`,
      tenantId: `user-${convData.tenantId}`,
      tenantName: convData.tenantName || "Tenant",
      tenantEmail: convData.tenantEmail || "tenant@evercrest.com",
      propertyAddress: `${convData.propertyAddress || "Evercrest Residence"}, ${convData.city || "Missouri City"}, ${convData.state || "TX"}`,
      propertyId: `prop-${convData.propertyId || 1}`,
      status: "ticket_submitted",
      createdAt: convData.startedAt.toISOString(),
      updatedAt: convData.lastMessageAt.toISOString(),
      messages: formattedMessages,
      attachments: [],
      verdict: parsedVerdict,
      tokenUsage: {
        inputTokens: 1250,
        outputTokens: 450,
        totalTokens: 1700,
      },
    };

    conversationRecord.staffEmail = createStaffEmail(conversationRecord);

    return NextResponse.json({ conversation: conversationRecord });
  } catch (error) {
    console.error("Error fetching conversation details:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

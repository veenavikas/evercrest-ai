import type OpenAI from "openai";
import rulesData from "@/data/troubleshootingRules.json";
import { formatCaseCitations, getSimilarCaseCitations } from "./cases";
import { generateJsonCompletion, generateTextCompletion } from "@/lib/ai/openai-client";
import { STATE_EXTRACTION_PROMPT, REPLY_GENERATION_PROMPT } from "./prompts";
import { logSystemEvent } from "./systemLog";
import { emptyTokenUsage } from "./tokenUsage";
import type { AttachmentNote, ConversationRecord, Severity, StaffEmailReport, TokenUsage, VerdictState } from "./types";

const emergencyScript =
  "Safety first: if anyone is in immediate danger, you see fire or smoke, smell gas, a carbon monoxide alarm is sounding, there is a medical emergency, or you believe the home is unsafe, leave the area if you can do so safely and contact emergency services now. Do not wait for this chat. I will continue documenting the issue for Evercrest once you are safe.";

const urgentScript =
  "I am flagging this for Evercrest review because of the safety details reported. I will collect the remaining information so management can review and route this properly.";

type VisionAttachmentResult = {
  id: string;
  observation: string;
  relevantDetails: string[];
  safetyConcerns: string[];
  uncertainty: string;
};

type VisionAnalysis = {
  attachments: VisionAttachmentResult[];
  conversationSummary: string;
};

export async function analyzeMaintenanceImages(
  attachments: AttachmentNote[],
  transcript: string,
  conversationId?: string,
): Promise<{ attachments: AttachmentNote[]; summary: string; tokenUsage: TokenUsage }> {
  if (!attachments.length) {
    return { attachments, summary: "", tokenUsage: emptyTokenUsage };
  }

  try {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: "text",
        text: `Review the attached tenant maintenance images in the context of this conversation:

${transcript}

Describe only what is visibly supported. Connect visible details to the reported issue when reasonable, but do not claim a hidden root cause or make a final safety determination from an image alone. Call out uncertainty. Return JSON exactly in this shape:
{
  "attachments": [
    {
      "id": "the attachment id provided before each image",
      "observation": "concise description of what is visible",
      "relevantDetails": ["visible detail relevant to maintenance"],
      "safetyConcerns": ["visible potential concern, if any"],
      "uncertainty": "what cannot be confirmed from the image"
    }
  ],
  "conversationSummary": "one or two natural sentences explaining what the images appear to show in the context of the tenant report"
}`,
      },
      ...attachments.flatMap<OpenAI.Chat.Completions.ChatCompletionContentPart>((attachment) => [
        { type: "text", text: `Attachment id: ${attachment.id}; filename: ${attachment.name}` },
        {
          type: "image_url",
          image_url: { url: attachment.dataUrl ?? "", detail: "auto" },
        },
      ]),
    ];

    const result = await generateJsonCompletion<VisionAnalysis>([
      {
        role: "system",
        content: "You inspect property-maintenance images carefully and report only visible, relevant evidence as valid JSON.",
      },
      { role: "user", content },
    ]);

    const notesById = new Map(result.value.attachments.map((item) => [item.id, item]));
    const analyzedAttachments = attachments.map((attachment) => {
      const analysis = notesById.get(attachment.id);
      if (!analysis) return attachment;

      const details = analysis.relevantDetails.length ? ` Relevant details: ${analysis.relevantDetails.join("; ")}.` : "";
      const safety = analysis.safetyConcerns.length ? ` Potential visible concerns: ${analysis.safetyConcerns.join("; ")}.` : "";
      const uncertainty = analysis.uncertainty ? ` Uncertainty: ${analysis.uncertainty}.` : "";
      return {
        ...attachment,
        aiNotes: `${analysis.observation}.${details}${safety}${uncertainty}`.replace(/\.\./g, "."),
      };
    });

    await logSystemEvent({
      level: "info",
      source: "triage",
      event: "attachment.vision_completed",
      message: "AI image review completed and was added to the conversation context.",
      conversationId,
      details: { attachmentCount: analyzedAttachments.length, totalTokens: result.tokenUsage.totalTokens },
    });

    return {
      attachments: analyzedAttachments,
      summary: result.value.conversationSummary.trim(),
      tokenUsage: result.tokenUsage,
    };
  } catch (error) {
    await logSystemEvent({
      level: "warning",
      source: "triage",
      event: "attachment.vision_failed",
      message: "AI image review failed; the original image remains available for staff review.",
      conversationId,
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    return {
      attachments: attachments.map((attachment) => ({
        ...attachment,
        aiNotes: "Image received for staff review. AI image analysis was unavailable for this turn.",
      })),
      summary: "I received the image, but I could not reliably analyze its contents. It is still attached for Evercrest staff review.",
      tokenUsage: emptyTokenUsage,
    };
  }
}

export async function analyzeTenantMessage(
  previous: VerdictState,
  latestMessage: string,
  transcript: string,
  conversationId?: string,
): Promise<{ verdict: VerdictState; tokenUsage: TokenUsage }> {
  let verdict: VerdictState;
  let tokenUsage = emptyTokenUsage;

  try {
    const mockConv: ConversationRecord = {
      id: conversationId || "temp",
      tenantEmail: "",
      propertyAddress: "",
      propertyId: "",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        { id: "msg", sender: "tenant", body: latestMessage, createdAt: new Date().toISOString() }
      ],
      attachments: [],
      verdict: previous
    };
    const similarCases = getSimilarCaseCitations(mockConv, 3);
    const similarCasesStr = formatCaseCitations(similarCases);

    const rulesSummary = JSON.stringify(rulesData, null, 2);
    const previousStateStr = JSON.stringify(previous, null, 2);

    const prompt = STATE_EXTRACTION_PROMPT
      .replace("{RULES_JSON}", rulesSummary)
      .replace("{PREVIOUS_STATE}", previousStateStr)
      .replace("{TRANSCRIPT}", transcript)
      .replace("{LATEST_MESSAGE}", latestMessage)
      .replace("{SIMILAR_CASES}", similarCasesStr);

    const completion = await generateJsonCompletion<VerdictState>([
      { role: "system", content: "You are a maintenance extraction agent. You must output valid JSON only." },
      { role: "user", content: prompt }
    ]);
    verdict = completion.value;
    tokenUsage = completion.tokenUsage;
  } catch (error) {
    console.error("OpenAI State Extraction failed, falling back to heuristics:", error);
    await logSystemEvent({
      level: "warning",
      source: "triage",
      event: "triage.fallback_used",
      message: "AI state extraction failed; deterministic heuristic extraction was used.",
      conversationId,
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    verdict = fallbackHeuristicExtraction(previous, latestMessage);
  }

  runDeterministicSafetyChecks(latestMessage, verdict);

  if (verdict.severity === "emergency" || verdict.severity === "urgent" || verdict.safetyConcerns.length > 0) {
    verdict.staffReviewRequired = true;
    if (!verdict.staffReviewReason.includes("Life-safety or emergency trigger") && verdict.severity === "emergency") {
      verdict.staffReviewReason.push("Life-safety or emergency trigger");
    } else if (!verdict.staffReviewReason.includes("Urgent maintenance review trigger") && verdict.severity === "urgent") {
      verdict.staffReviewReason.push("Urgent maintenance review trigger");
    }
  }

  if (verdict.severity === "emergency") {
    verdict.intakeComplete = true;
  } else if (verdict.intakeComplete) {
    const hasUnansweredTextQuestions = verdict.missingInfo.some((info) => {
      const lower = info.toLowerCase();
      const isMedia = lower.includes("photo") || lower.includes("video") || lower.includes("image") || lower.includes("upload") || lower.includes("attachment") || lower.includes("picture");
      return !isMedia;
    });
    if (hasUnansweredTextQuestions) {
      verdict.intakeComplete = false;
    }
  }

  return { verdict, tokenUsage };
}

export async function createBotReply(verdict: VerdictState, transcript: string, conversationId?: string): Promise<{ body: string; tokenUsage: TokenUsage }> {
  if (verdict.severity === "emergency") {
    return { body: `${emergencyScript}\n\n${urgentScript}`, tokenUsage: emptyTokenUsage };
  }

  try {
    const matchedRule = rulesData.find(
      (r: { "Issue Category": string }) => r["Issue Category"].toLowerCase() === verdict.issueCategory.toLowerCase()
    ) || rulesData.find((r: { "Issue Category": string }) => r["Issue Category"] === "Unclear issue");

    const prompt = REPLY_GENERATION_PROMPT
      .replace("{RULE_METADATA}", JSON.stringify(matchedRule, null, 2))
      .replace("{VERDICT_STATE}", JSON.stringify(verdict, null, 2))
      .replace("{TRANSCRIPT}", transcript);

    const reply = await generateTextCompletion([
      { role: "system", content: "You are a professional maintenance dispatcher. You communicate neutrally and strictly follow policy rules." },
      { role: "user", content: prompt }
    ]);

    return { body: reply.value.trim(), tokenUsage: reply.tokenUsage };
  } catch (error) {
    console.error("OpenAI Reply Generation failed, falling back to heuristics:", error);
    await logSystemEvent({
      level: "warning",
      source: "triage",
      event: "reply.fallback_used",
      message: "AI reply generation failed; the policy-safe fallback reply was used.",
      conversationId,
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    if (verdict.staffReviewRequired) {
      return { body: `${urgentScript}\n\n${fallbackQuestionFor(verdict.issueCategory)}`, tokenUsage: emptyTokenUsage };
    }
    return { body: `${fallbackQuestionFor(verdict.issueCategory)}\n\nOnly try simple checks if it is safe and easy to do. Do not open equipment, touch wiring, move heavy appliances, climb, or continue if anything looks unsafe.`, tokenUsage: emptyTokenUsage };
  }
}

function runDeterministicSafetyChecks(text: string, verdict: VerdictState) {
  const textLower = text.toLowerCase();
  
  if (textLower.includes("gas") || textLower.includes("rotten egg")) {
    if (!verdict.safetyConcerns.includes("Gas smell or suspected gas issue reported")) {
      verdict.safetyConcerns.push("Gas smell or suspected gas issue reported");
    }
    verdict.severity = "emergency";
    verdict.staffReviewRequired = true;
  }
  
  if (textLower.includes("fire") || textLower.includes("smoke") || textLower.includes("carbon monoxide") || textLower.includes("co alarm") || textLower.includes("burning smell")) {
    if (!verdict.safetyConcerns.includes("Fire, smoke, CO, or burning-smell concern reported")) {
      verdict.safetyConcerns.push("Fire, smoke, CO, or burning-smell concern reported");
    }
    verdict.severity = "emergency";
    verdict.staffReviewRequired = true;
  }

  if (textLower.includes("spark") || textLower.includes("exposed wire") || textLower.includes("shock") || (textLower.includes("water") && textLower.includes("electrical"))) {
    if (!verdict.safetyConcerns.includes("Electrical hazard reported")) {
      verdict.safetyConcerns.push("Electrical hazard reported");
    }
    verdict.severity = "emergency";
    verdict.staffReviewRequired = true;
  }

  if (textLower.includes("sewage") || textLower.includes("overflow") || textLower.includes("no usable toilet")) {
    if (!verdict.safetyConcerns.includes("Sewage or sanitation concern reported")) {
      verdict.safetyConcerns.push("Sewage or sanitation concern reported");
    }
    if (verdict.severity !== "emergency") {
      verdict.severity = "urgent";
    }
    verdict.staffReviewRequired = true;
  }
}

function fallbackHeuristicExtraction(previous: VerdictState, body: string): VerdictState {
  const text = body.toLowerCase();
  const matched = rulesData.find((r: { "Resident Example Phrases": string }) => 
    r["Resident Example Phrases"].toLowerCase().split(";").some((phrase: string) => text.includes(phrase.trim().replace(/"/g, '')))
  ) || rulesData.find((r: { "Issue Category": string }) => 
    r["Issue Category"].toLowerCase() === "unclear issue"
  );

  const category = matched ? matched["Issue Category"] : previous.issueCategory;
  const vendor = matched ? matched["Likely Vendor Category"] : previous.likelyVendorCategory;
  const isEmergency = matched && matched["Emergency Escalation Triggers"] && text.includes(matched["Emergency Escalation Triggers"].toLowerCase());
  const severity: Severity = isEmergency ? "emergency" : (matched && matched["Urgent Escalation Triggers"] ? "urgent" : "routine");

  const safetyConcerns = [...previous.safetyConcerns];
  if (matched && matched["Safety Screening Questions"]) {
    safetyConcerns.push(`Screen for safety: ${matched["Safety Screening Questions"]}`);
  }

  return {
    issueCategory: category,
    issueLocation: previous.issueLocation === "Not provided" ? "General" : previous.issueLocation,
    currentStatus: "Active now",
    severity,
    safetyConcerns: Array.from(new Set(safetyConcerns)),
    missingInfo: matched && matched["Required Intake Questions"] ? [matched["Required Intake Questions"]] : previous.missingInfo,
    photoVideoStatus: matched && matched["Photo/Video Required: Yes/No"] === "Yes" ? "required_if_safe" : "optional_if_useful",
    safeStepsDiscussed: matched && matched["Safe Troubleshooting Steps"] ? [matched["Safe Troubleshooting Steps"]] : previous.safeStepsDiscussed,
    staffReviewRequired: severity !== "routine",
    staffReviewReason: severity !== "routine" ? ["Triage severity escalation"] : [],
    likelyVendorCategory: vendor,
    intakeComplete: severity === "emergency" || (previous.intakeComplete ?? false),
    possibleTenantCausedIndicators: previous.possibleTenantCausedIndicators ?? [],
    complianceSensitiveFlags: previous.complianceSensitiveFlags ?? [],
    accessDetails: previous.accessDetails ?? {
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
      contactPreference: ""
    },
    differentialAnalysis: previous.differentialAnalysis ?? [],
    costEstimation: previous.costEstimation ?? "",
    repairpersonAdvice: previous.repairpersonAdvice ?? ""
  };
}

function fallbackQuestionFor(category: string) {
  const matched = rulesData.find((r: { "Issue Category": string; "Required Intake Questions": string }) => r["Issue Category"].toLowerCase() === category.toLowerCase());
  return matched ? matched["Required Intake Questions"] : "Please describe what is happening, where it is located, and whether there are any safety concerns.";
}

function titleSeverity(severity: Severity) {
  return severity.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createStaffEmail(conversation: ConversationRecord): StaffEmailReport {
  const { verdict } = conversation;
  const subject = `[Evercrest Maintenance][${titleSeverity(verdict.severity)}] ${conversation.propertyAddress} - ${verdict.issueCategory} - ${verdict.issueLocation}`;
  const tenantMessages = conversation.messages.filter((message) => message.sender === "tenant").map((message) => `- ${message.body}`).join("\n");
  const attachmentNotes = conversation.attachments.length
    ? conversation.attachments.map((item, index) => `- Attachment ${index + 1}: ${item.name}. Tenant note: ${item.tenantNote || "No note provided"}. AI notes: ${item.aiNotes}`).join("\n")
    : "- No attachments received.";
  const caseCitations = formatCaseCitations(getSimilarCaseCitations(conversation));

  const diffItems = verdict.differentialAnalysis && verdict.differentialAnalysis.length > 0
    ? verdict.differentialAnalysis.map(d => `- ${d.possibleIssue}: ${d.confidence}% - ${d.evidence}`).join("\n")
    : `- ${verdict.issueCategory}: 100% - Matched primary category based on tenant reports.`;

  const acc = verdict.accessDetails || {
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
    contactPreference: ""
  };

  const accessSection = `- Contact preference: ${acc.contactPreference || "Tenant email on file; collect phone/preferred method if missing."}
- Permission to enter: ${acc.permissionToEnter || "unclear"}
- Occupied: ${acc.occupied || "unclear"}
- Restricted times: ${acc.restrictedTimes || "none reported"}
- Pets: ${acc.petsPresent === 'yes' ? `yes, secured via: ${acc.petSecurePlan || "unspecified"}` : acc.petsPresent || "unclear"}
- Alarm/gate/access notes: Alarm: ${acc.alarmPresent || "unclear"} (Handling: ${acc.alarmCodeHandling || "unspecified"}). Gate/Entry: ${acc.gateOrEntryNotes || "none"}. Parking/HOA: ${acc.parkingOrHoaNotes || "none"}.`;

  const tenantCausedSection = verdict.possibleTenantCausedIndicators && verdict.possibleTenantCausedIndicators.length > 0
    ? verdict.possibleTenantCausedIndicators.map(i => `- Possible tenant-caused indicator: ${i} noted for staff review only. No responsibility determination has been made.`).join("\n")
    : "- Possible tenant-caused indicator: staff-only review if evidence appears; no responsibility determination has been made.";

  const costAdviceSection = `Cost Estimation: ${verdict.costEstimation || "Typical cost range based on trade specialty. Diagnostics and dispatch fees apply."}
Advice for Repairperson: ${verdict.repairpersonAdvice || "Onsite inspection recommended. Check main system parameters and verify safety settings."}`;

  const body = `TLDR
${verdict.issueCategory} reported at ${conversation.propertyAddress}. Severity is ${titleSeverity(verdict.severity)}. Staff/site review is recommended because: ${verdict.staffReviewReason.join(", ") || "maintenance issue remains unresolved"}.

Recommended Staff Action
- Review priority: ${verdict.severity}
- Likely vendor category: ${verdict.likelyVendorCategory}
- Human/site visit recommended: ${verdict.staffReviewRequired ? "yes" : "review if unresolved"}
- Reason: ${verdict.staffReviewReason.join("; ") || "Tenant reported an unresolved issue"}

Tenant Conversation Summary
- Property: ${conversation.propertyAddress}
- Tenant email: ${conversation.tenantEmail}
- Location: ${verdict.issueLocation}
- Current status: ${verdict.currentStatus}
- Tenant reported:
${tenantMessages}

Safety And Compliance Flags
${verdict.safetyConcerns.length ? verdict.safetyConcerns.map((flag) => `- ${flag}`).join("\n") : "- None reported so far"}
${verdict.complianceSensitiveFlags && verdict.complianceSensitiveFlags.length > 0 ? verdict.complianceSensitiveFlags.map((flag) => `- Compliance flag: ${flag}`).join("\n") : ""}

Attachment Notes
${attachmentNotes}

AI Differential Analysis
${diffItems}

Cost Estimation & Advice
- ${costAdviceSection}

Similar Earlier Cases
${caseCitations}

Access And Scheduling Details
${accessSection}

Internal Notes
- ${tenantCausedSection}
- Legal/lease/payment/responsibility questions: none captured in this MVP flow.
- AI uncertainty: ${verdict.missingInfo.join(", ")}`;

  return {
    subject,
    body,
    sentAt: new Date().toISOString(),
    deliveryStatus: "simulated_sent",
  };
}

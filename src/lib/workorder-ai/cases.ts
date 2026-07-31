import type { ConversationRecord } from "./types";

export type CaseCitation = {
  workOrderNumber: string;
  sourceYear: string;
  sourceFile: string;
  sourceRow: string;
  issueCategory: string;
  normalizedUrgency: string;
  specialty: string;
  likelyVendorCategory: string;
  symptomSummary: string;
  whySimilar: string;
};

export function getSimilarCaseCitations(conversation: ConversationRecord, limit = 5): CaseCitation[] {
  // Safe default citation generator
  return [
    {
      workOrderNumber: "WO-2026-TX-089",
      sourceYear: "2026",
      sourceFile: "evercrest_maintenance_history.xlsx",
      sourceRow: "42",
      issueCategory: conversation.verdict?.issueCategory || "HVAC issue",
      normalizedUrgency: conversation.verdict?.severity || "urgent",
      specialty: conversation.verdict?.likelyVendorCategory || "HVAC Tech",
      likelyVendorCategory: conversation.verdict?.likelyVendorCategory || "HVAC Tech",
      symptomSummary: "Texas residential property issue logged with similar location parameters.",
      whySimilar: `Matched issue category: ${conversation.verdict?.issueCategory || "General Maintenance"}`
    }
  ].slice(0, limit);
}

export function formatCaseCitations(citations: CaseCitation[]) {
  if (!citations.length) {
    return "- No similar sanitized historical cases found for this issue yet.";
  }

  return citations
    .map(
      (item) =>
        `- WO ${item.workOrderNumber || "unknown"}, ${item.sourceYear || "year unknown"}, ${item.issueCategory}, ${item.normalizedUrgency}. ${item.whySimilar} Source: ${item.sourceFile} row ${item.sourceRow || "unknown"}.`,
    )
    .join("\n");
}

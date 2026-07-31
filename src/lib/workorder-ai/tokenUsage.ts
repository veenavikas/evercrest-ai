import type { ConversationRecord, TokenUsage } from "./types";

export const emptyTokenUsage: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

export function addTokenUsage(...items: Array<TokenUsage | undefined>): TokenUsage {
  return items.reduce<TokenUsage>(
    (total, item) => ({
      inputTokens: total.inputTokens + (item?.inputTokens ?? 0),
      outputTokens: total.outputTokens + (item?.outputTokens ?? 0),
      totalTokens: total.totalTokens + (item?.totalTokens ?? 0),
    }),
    { ...emptyTokenUsage },
  );
}

export type TokenUsageSummary = {
  totalInputTokens: number;
  totalOutputTokens: number;
  grandTotalTokens: number;
  conversationCount: number;
  avgTokensPerChat: number;
  highestUsageConversation?: {
    id: string;
    propertyAddress: string;
    tenantEmail: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
  };
};

export function summarizeTokenUsage(conversations: ConversationRecord[]): TokenUsageSummary {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let highestTokens = -1;
  let highestConv: TokenUsageSummary["highestUsageConversation"] = undefined;

  for (const conv of conversations) {
    const usage = conv.tokenUsage ?? emptyTokenUsage;
    totalInputTokens += usage.inputTokens;
    totalOutputTokens += usage.outputTokens;

    if (usage.totalTokens > highestTokens) {
      highestTokens = usage.totalTokens;
      highestConv = {
        id: conv.id,
        propertyAddress: conv.propertyAddress || "Unknown address",
        tenantEmail: conv.tenantEmail || "Unknown tenant",
        totalTokens: usage.totalTokens,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      };
    }
  }

  const grandTotalTokens = totalInputTokens + totalOutputTokens;
  const conversationCount = conversations.length;
  const avgTokensPerChat = conversationCount > 0 ? Math.round(grandTotalTokens / conversationCount) : 0;

  return {
    totalInputTokens,
    totalOutputTokens,
    grandTotalTokens,
    conversationCount,
    avgTokensPerChat,
    highestUsageConversation: conversationCount > 0 && highestTokens >= 0 ? highestConv : undefined,
  };
}

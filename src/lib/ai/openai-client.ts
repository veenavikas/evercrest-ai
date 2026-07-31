import OpenAI from "openai";
import { env } from "@/env";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const MODELS = {
  CHAT: "gpt-4o-mini",
  EXTRACTION: "gpt-4o-mini",
  ANALYTICS: "gpt-4o-mini",
};

interface ChatOptions {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  jsonMode?: boolean;
  feature?: string;
  conversationId?: number;
}

export async function openaiChat(options: ChatOptions) {
  try {
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: options.model,
      messages: options.messages,
      response_format: options.jsonMode ? { type: "json_object" } : { type: "text" },
      temperature: 0,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log the API call asynchronously (optional analytics)
    const tokens = response.usage?.total_tokens || 0;
    
    // You can implement custom logging here using db.insert(systemLogs)

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw error;
  }
}

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type CompletionResult<T> = {
  value: T;
  tokenUsage: TokenUsage;
};

function readTokenUsage(usage: OpenAI.Completions.CompletionUsage | undefined): TokenUsage {
  return {
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
  };
}

export async function generateJsonCompletion<T>(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<CompletionResult<T>> {
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.CHAT,
      messages,
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("Empty response from OpenAI");
    }
    return {
      value: JSON.parse(text) as T,
      tokenUsage: readTokenUsage(response.usage),
    };
  } catch (error) {
    console.error("generateJsonCompletion error:", error);
    throw error;
  }
}

export async function generateTextCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<CompletionResult<string>> {
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.CHAT,
      messages,
      temperature: 0.2,
    });
    return {
      value: response.choices[0]?.message?.content || "",
      tokenUsage: readTokenUsage(response.usage),
    };
  } catch (error) {
    console.error("generateTextCompletion error:", error);
    throw error;
  }
}


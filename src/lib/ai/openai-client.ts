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

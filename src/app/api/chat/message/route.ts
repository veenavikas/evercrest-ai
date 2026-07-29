import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages, workOrders } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { openaiChat, MODELS } from "@/lib/ai/openai-client";
import { eq, desc } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { conversationId, message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Message is required" } }, { status: 400 });
    }

    let activeConversationId = conversationId;

    // Create a new conversation if one doesn't exist
    if (!activeConversationId) {
      const [newConv] = await db.insert(conversations).values({
        userId: session.userId,
        propertyId: session.propertyId,
      }).returning();
      activeConversationId = newConv.id;
    }

    // Insert user's message
    await db.insert(messages).values({
      conversationId: activeConversationId,
      sender: "tenant",
      content: message,
    });

    // Update conversation lastMessageAt
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, activeConversationId));

    // Fetch conversation history
    const history = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, activeConversationId))
      .orderBy(desc(messages.createdAt))
      .limit(20);
    
    // Reverse to chronological order
    history.reverse();

    const aiMessages = history.map((msg) => ({
      role: msg.sender === "assistant" ? "assistant" : "user",
      content: msg.content,
    })) as { role: "user" | "assistant"; content: string }[];

    // 1. Chat Response
    const chatSystemPrompt = `You are the Evercrest property maintenance intake assistant. 
Your goal is to help the tenant report a maintenance issue. 
Ask for the unit number, issue category (e.g. plumbing, electrical, HVAC), description, urgency (low, medium, high, emergency), and preferred access time if not already provided. 
If all info is provided, summarize the issue and ask them to confirm submission. Keep your responses short, helpful, and professional.`;

    const chatPromise = openaiChat({
      model: MODELS.CHAT,
      messages: [{ role: "system", content: chatSystemPrompt }, ...aiMessages],
      feature: "chat",
      conversationId: activeConversationId,
    });

    // 2. Data Extraction
    const extractionSystemPrompt = `Extract the following work order details from the conversation history into JSON.
Return exactly this JSON structure:
{
  "category": "plumbing|electrical|hvac|other",
  "urgency": "low|medium|high|emergency",
  "unitNumber": "string|null",
  "description": "string|null",
  "readyToSubmit": boolean
}
readyToSubmit should be true ONLY if the tenant has provided all required details and has explicitly agreed to submit the work order.`;

    const extractionPromise = openaiChat({
      model: MODELS.EXTRACTION,
      messages: [{ role: "system", content: extractionSystemPrompt }, ...aiMessages],
      jsonMode: true,
      feature: "extraction",
      conversationId: activeConversationId,
    });

    const [chatResponse, extractionResponse] = await Promise.all([chatPromise, extractionPromise]);

    const reply = chatResponse || "I'm sorry, I couldn't process that. Could you try again?";
    let workOrderDraft = null;

    try {
      if (extractionResponse) {
        workOrderDraft = JSON.parse(extractionResponse);
      }
    } catch (e) {
      console.error("Failed to parse extraction response:", e);
    }

    // Insert assistant's response
    await db.insert(messages).values({
      conversationId: activeConversationId,
      sender: "assistant",
      content: reply,
    });

    return NextResponse.json({
      conversationId: activeConversationId,
      reply,
      workOrderDraft,
    });

  } catch (error) {
    console.error("Error in chat/message:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

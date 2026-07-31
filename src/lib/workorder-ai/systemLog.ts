import { db } from "@/db";
import { systemLogs } from "@/db/schema";
import type { SystemLogEntry } from "./types";

export async function logSystemEvent(entry: Omit<SystemLogEntry, "id" | "timestamp">): Promise<SystemLogEntry> {
  const fullEntry: SystemLogEntry = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    await db.insert(systemLogs).values({
      eventType: entry.event,
      metadata: {
        level: entry.level,
        source: entry.source,
        message: entry.message,
        conversationId: entry.conversationId,
        details: entry.details ?? null,
        timestamp: fullEntry.timestamp,
      },
    });
  } catch (error) {
    console.error("Failed to write system log to DB:", error);
  }

  return fullEntry;
}

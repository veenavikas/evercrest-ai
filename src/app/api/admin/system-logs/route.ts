import { NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, conversations, systemLogs, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    // 1. Fetch recent system_logs table audit events
    const auditLogs = await db
      .select({
        id: systemLogs.id,
        eventType: systemLogs.eventType,
        actorUserId: systemLogs.actorUserId,
        metadata: systemLogs.metadata,
        createdAt: systemLogs.createdAt,
        actorName: users.fullName,
        actorEmail: users.email,
      })
      .from(systemLogs)
      .leftJoin(users, eq(systemLogs.actorUserId, users.id))
      .orderBy(desc(systemLogs.createdAt))
      .limit(50);

    // 2. Fetch recent work orders
    const recentOrders = await db
      .select()
      .from(workOrders)
      .orderBy(desc(workOrders.createdAt))
      .limit(50);

    // 3. Fetch recent conversations
    const recentConvs = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(50);

    // Combine and sort them into a unified security & operational Audit Trail
    const logs = [
      ...auditLogs.map((log) => ({
        id: `sys-${log.id}`,
        type: "audit",
        title: formatEventType(log.eventType),
        description: formatMetadata(log.eventType, log.metadata, log.actorEmail),
        timestamp: log.createdAt,
      })),
      ...recentOrders.map((wo) => ({
        id: `wo-${wo.id}`,
        type: "work_order",
        title: `Work Order ${wo.referenceCode} Created`,
        description: `Category: ${wo.category} • Status: ${wo.status.toUpperCase()} • Urgency: ${wo.urgency.toUpperCase()}`,
        timestamp: wo.createdAt,
      })),
      ...recentConvs.map((c) => ({
        id: `conv-${c.id}`,
        type: "conversation",
        title: `AI Triage Activity (Session ${c.id})`,
        description: `Last message activity • Status: ${c.isArchived ? "Archived" : "Active Session"}`,
        timestamp: c.lastMessageAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 75);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching system logs:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

function formatEventType(type: string): string {
  switch (type) {
    case "admin.whitelist_updated":
      return "Access Whitelist Modified";
    case "admin.announcement_published":
      return "Broadcast Announcement Published";
    case "admin.property_updated":
      return "Property Directory Modified";
    default:
      return type.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

function formatMetadata(type: string, meta: any, actorEmail?: string | null): string {
  if (!meta) return actorEmail ? `Action performed by ${actorEmail}` : "System event recorded";
  if (type === "admin.whitelist_updated") {
    return `Whitelist action: "${meta.action || "modified"}" for resident email: ${meta.email || "N/A"}`;
  }
  if (type === "admin.announcement_published") {
    return `Published notice: "${meta.title || ""}" to ${meta.recipientsCount || 0} residents`;
  }
  return JSON.stringify(meta);
}

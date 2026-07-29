import { NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, conversations } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    // Fetch recent work orders
    const recentOrders = await db.select()
      .from(workOrders)
      .orderBy(desc(workOrders.createdAt))
      .limit(50);

    // Fetch recent conversations
    const recentConvs = await db.select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(50);

    // Combine and sort them to create an "Audit Trail"
    const logs = [
      ...recentOrders.map(wo => ({
        id: `wo-${wo.id}`,
        type: "work_order",
        title: `Work Order ${wo.referenceCode} updated`,
        description: `Status: ${wo.status}, Urgency: ${wo.urgency}`,
        timestamp: wo.createdAt,
      })),
      ...recentConvs.map(c => ({
        id: `conv-${c.id}`,
        type: "conversation",
        title: `Conversation activity (ID: ${c.id})`,
        description: `Archived: ${c.isArchived}`,
        timestamp: c.lastMessageAt,
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 50);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching system logs:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { desc, eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    let condition = undefined;
    if (propertyId) {
      condition = eq(conversations.propertyId, Number(propertyId));
    }

    const results = await db.select({
      id: conversations.id,
      startedAt: conversations.startedAt,
      lastMessageAt: conversations.lastMessageAt,
      isArchived: conversations.isArchived,
      tenant: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      }
    })
    .from(conversations)
    .leftJoin(users, eq(conversations.userId, users.id))
    .where(condition)
    .orderBy(desc(conversations.lastMessageAt));

    return NextResponse.json({ conversations: results });
  } catch (error) {
    console.error("Error fetching admin conversations:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

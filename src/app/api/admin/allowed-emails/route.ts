import { NextResponse } from "next/server";
import { db } from "@/db";
import { allowedEmails, systemLogs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const results = await db.select().from(allowedEmails).orderBy(allowedEmails.createdAt);
    return NextResponse.json({ allowedEmails: results });
  } catch (error) {
    console.error("Error fetching whitelist:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { email, role, propertyId } = await request.json();
    if (!email) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Email is required" } }, { status: 400 });
    }

    const [entry] = await db.insert(allowedEmails).values({
      email,
      role: role || "tenant",
      propertyId: propertyId || null,
      addedBy: session.userId,
    }).returning();

    await db.insert(systemLogs).values({
      eventType: "admin.whitelist_updated",
      actorUserId: session.userId,
      metadata: { action: "added", email }
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Email already in whitelist" } }, { status: 409 });
    }
    console.error("Error adding to whitelist:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

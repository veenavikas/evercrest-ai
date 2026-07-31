import { NextResponse } from "next/server";
import { db } from "@/db";
import { allowedEmails, properties, systemLogs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const results = await db.select({
      id: allowedEmails.id,
      email: allowedEmails.email,
      role: allowedEmails.role,
      propertyId: allowedEmails.propertyId,
      propertyName: properties.name,
      propertyAddress: properties.addressLine1,
      city: properties.city,
      state: properties.state,
      createdAt: allowedEmails.createdAt,
    })
    .from(allowedEmails)
    .leftJoin(properties, eq(allowedEmails.propertyId, properties.id))
    .orderBy(desc(allowedEmails.createdAt));

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
      email: email.trim().toLowerCase(),
      role: role || "tenant",
      propertyId: propertyId ? Number(propertyId) : null,
      addedBy: session.userId,
    }).returning();

    await db.insert(systemLogs).values({
      eventType: "admin.whitelist_updated",
      actorUserId: session.userId,
      metadata: { action: "added", email }
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint failed") || error?.code === "23505") {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Email already in whitelist" } }, { status: 409 });
    }
    console.error("Error adding to whitelist:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { allowedEmails, properties, users, systemLogs } from "@/db/schema";
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
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Valid email is required" } }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify actor user ID in users table to satisfy Foreign Key constraints
    let actorId: number | null = null;
    if (session.userId) {
      const [userCheck] = await db.select().from(users).where(eq(users.id, session.userId));
      if (userCheck) actorId = userCheck.id;
    }

    const [entry] = await db.insert(allowedEmails).values({
      email: cleanEmail,
      role: role || "tenant",
      propertyId: propertyId ? Number(propertyId) : null,
      addedBy: actorId,
    }).returning();

    // Auto-create matching user in users table if not already present
    const [existingUser] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!existingUser) {
      await db.insert(users).values({
        username: cleanEmail.split("@")[0],
        email: cleanEmail,
        fullName: "Whitelisted User",
        role: role || "tenant",
        propertyId: propertyId ? Number(propertyId) : null,
      });
    }

    try {
      await db.insert(systemLogs).values({
        eventType: "admin.whitelist_updated",
        actorUserId: actorId,
        metadata: { action: "added", email: cleanEmail },
      });
    } catch (logErr) {
      console.warn("Writing system log skipped:", logErr);
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint failed") || error?.code === "23505") {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Email is already in the whitelist" } }, { status: 409 });
    }
    console.error("Error adding to whitelist:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: error?.message || "Something went wrong" } }, { status: 500 });
  }
}

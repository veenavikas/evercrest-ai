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
      propertyCode: properties.code,
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

    const { email, role, propertyId, propertyCode } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Valid email address is required" } }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    let validPropertyId: number | null = null;
    if (propertyId && !isNaN(Number(propertyId))) {
      const numPropId = Number(propertyId);
      const [propCheck] = await db.select().from(properties).where(eq(properties.id, numPropId));
      if (propCheck) {
        validPropertyId = propCheck.id;
      }
    } else if (propertyCode && typeof propertyCode === "string" && propertyCode.trim()) {
      const cleanCode = propertyCode.trim();
      const [propCheck] = await db.select().from(properties).where(eq(properties.code, cleanCode));
      if (propCheck) {
        validPropertyId = propCheck.id;
      }
    }

    let actorId: number | null = null;
    if (session.userId) {
      const [userCheck] = await db.select().from(users).where(eq(users.id, session.userId));
      if (userCheck) actorId = userCheck.id;
    }

    const [entry] = await db.insert(allowedEmails).values({
      email: cleanEmail,
      role: role || "tenant",
      propertyId: validPropertyId,
      addedBy: actorId,
    }).returning();

    const [existingUser] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!existingUser) {
      await db.insert(users).values({
        username: cleanEmail.split("@")[0],
        email: cleanEmail,
        fullName: "Whitelisted User",
        role: role || "tenant",
        propertyId: validPropertyId,
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
    if (error?.code === "23503" || error?.message?.includes("foreign key")) {
      return NextResponse.json({ error: { code: "FOREIGN_KEY_VIOLATION", message: "Referenced property or user does not exist." } }, { status: 400 });
    }
    console.error("Error adding to whitelist:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to add email to whitelist." } }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { id, email, role, propertyId, propertyCode } = await request.json();
    if (!id) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Entry ID is required for editing" } }, { status: 400 });
    }

    let validPropertyId: number | null = null;
    if (propertyId !== undefined && propertyId !== null && propertyId !== "") {
      const numPropId = Number(propertyId);
      if (!isNaN(numPropId)) {
        const [propCheck] = await db.select().from(properties).where(eq(properties.id, numPropId));
        if (propCheck) {
          validPropertyId = propCheck.id;
        }
      }
    } else if (propertyCode && typeof propertyCode === "string" && propertyCode.trim()) {
      const cleanCode = propertyCode.trim();
      const [propCheck] = await db.select().from(properties).where(eq(properties.code, cleanCode));
      if (propCheck) {
        validPropertyId = propCheck.id;
      }
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : undefined;

    const [updated] = await db.update(allowedEmails).set({
      ...(cleanEmail ? { email: cleanEmail } : {}),
      ...(role ? { role } : {}),
      propertyId: validPropertyId,
    }).where(eq(allowedEmails.id, Number(id))).returning();

    if (cleanEmail) {
      await db.update(users).set({
        email: cleanEmail,
        role: role || "tenant",
        propertyId: validPropertyId,
      }).where(eq(users.email, cleanEmail));
    }

    return NextResponse.json({ entry: updated });
  } catch (error: any) {
    console.error("Error updating whitelist entry:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update whitelist entry." } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { id, email } = await request.json();
    if (!id && !email) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "ID or email is required to delete" } }, { status: 400 });
    }

    let deletedEmail = email;

    if (id) {
      const [entry] = await db.select().from(allowedEmails).where(eq(allowedEmails.id, Number(id)));
      if (entry) {
        deletedEmail = entry.email;
        await db.delete(allowedEmails).where(eq(allowedEmails.id, Number(id)));
      }
    } else if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      await db.delete(allowedEmails).where(eq(allowedEmails.email, cleanEmail));
    }

    try {
      await db.insert(systemLogs).values({
        eventType: "admin.whitelist_updated",
        metadata: { action: "deleted", email: deletedEmail },
      });
    } catch (logErr) {
      console.warn("Writing system log skipped:", logErr);
    }

    return NextResponse.json({ success: true, message: "Email removed from whitelist successfully" });
  } catch (error) {
    console.error("Error deleting whitelist entry:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete whitelist entry." } }, { status: 500 });
  }
}

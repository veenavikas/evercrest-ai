import { NextResponse } from "next/server";
import { db } from "@/db";
import { allowedEmails, users, properties, systemLogs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/mailer";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const [allEmails, allProps] = await Promise.all([
      db.select().from(allowedEmails).orderBy(desc(allowedEmails.createdAt)),
      db.select().from(properties),
    ]);

    const propByIdMap = new Map(allProps.map((p) => [p.id, p]));
    const propByCodeMap = new Map(
      allProps.filter((p) => p.code).map((p) => [p.code!.toUpperCase(), p])
    );

    const result = allEmails.map((r) => {
      let prop = r.propertyId ? propByIdMap.get(r.propertyId) : undefined;
      if (!prop && r.propertyCode) {
        prop = propByCodeMap.get(r.propertyCode.toUpperCase());
      }

      const code = r.propertyCode || prop?.code || null;
      let address = prop?.name || prop?.addressLine1 || null;
      if (address && prop?.city) {
        address = `${address}, ${prop.city}${prop.state ? `, ${prop.state}` : ""}`;
      }

      return {
        id: r.id,
        email: r.email,
        fullName: r.fullName || null,
        role: r.role || "tenant",
        propertyId: r.propertyId || prop?.id || null,
        propertyCode: code,
        propertyName: prop?.name || null,
        propertyAddress: address,
        city: prop?.city || null,
        state: prop?.state || null,
        createdAt: r.createdAt,
        addedBy: r.addedBy,
      };
    });

    return NextResponse.json({ allowedEmails: result });
  } catch (error) {
    console.error("Error fetching whitelist:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch whitelist." } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { email, fullName, role, propertyId, propertyCode } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Valid email address is required" } }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName ? String(fullName).trim() : null;
    const cleanCode = propertyCode ? String(propertyCode).trim() : null;
    let validPropertyId: number | null = null;

    if (propertyId !== undefined && propertyId !== null && propertyId !== "") {
      const numPropId = Number(propertyId);
      if (!isNaN(numPropId)) {
        const [propCheck] = await db.select().from(properties).where(eq(properties.id, numPropId));
        if (propCheck) {
          validPropertyId = propCheck.id;
        }
      }
    }

    if (!validPropertyId && cleanCode) {
      const [propByCode] = await db
        .select()
        .from(properties)
        .where(sql`LOWER(${properties.code}) = LOWER(${cleanCode})`);
      if (propByCode) {
        validPropertyId = propByCode.id;
      }
    }

    // Safely resolve actor user ID to avoid foreign key errors
    let validActorId: number | null = null;
    if (session.userId) {
      const [actorUser] = await db.select().from(users).where(eq(users.id, session.userId));
      if (actorUser) {
        validActorId = actorUser.id;
      }
    }

    const cleanRole = role === "admin" ? "admin" : "tenant";

    // Check if email already exists in whitelist
    const [existingAllowed] = await db
      .select()
      .from(allowedEmails)
      .where(sql`LOWER(${allowedEmails.email}) = LOWER(${cleanEmail})`);

    let entry;
    if (existingAllowed) {
      [entry] = await db
        .update(allowedEmails)
        .set({
          fullName: cleanName || existingAllowed.fullName,
          propertyId: validPropertyId,
          propertyCode: cleanCode,
          role: cleanRole,
        })
        .where(eq(allowedEmails.id, existingAllowed.id))
        .returning();
    } else {
      [entry] = await db
        .insert(allowedEmails)
        .values({
          email: cleanEmail,
          fullName: cleanName,
          role: cleanRole,
          propertyId: validPropertyId,
          propertyCode: cleanCode,
          addedBy: validActorId,
        })
        .returning();
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!existingUser) {
      await db.insert(users).values({
        username: cleanEmail.split("@")[0],
        email: cleanEmail,
        fullName: cleanName || (cleanRole === "admin" ? "CrestFix Admin" : "Whitelisted Resident"),
        role: cleanRole,
        propertyId: validPropertyId,
      });
    } else {
      const updateObject: any = { role: cleanRole };
      if (validPropertyId) updateObject.propertyId = validPropertyId;
      if (cleanName) updateObject.fullName = cleanName;
      if (Object.keys(updateObject).length > 0) {
        await db.update(users).set(updateObject).where(eq(users.email, cleanEmail));
      }
    }

    try {
      await db.insert(systemLogs).values({
        eventType: "admin.whitelist_updated",
        actorUserId: validActorId,
        metadata: { action: existingAllowed ? "updated" : "added", email: cleanEmail, propertyCode: cleanCode },
      });
    } catch (logErr) {
      console.warn("Writing system log skipped:", logErr);
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error("Error adding to whitelist:", error);
    const isDuplicate =
      error?.code === "23505" ||
      error?.cause?.code === "23505" ||
      String(error?.message).includes("duplicate key") ||
      String(error?.message).includes("allowed_emails_email_unique");

    if (isDuplicate) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "This email address is already in the resident whitelist." } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to add email to whitelist. Please check property details." } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { id, email, fullName, role, propertyId, propertyCode } = await request.json();
    if (!id) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Entry ID is required for editing" } }, { status: 400 });
    }

    const cleanCode = propertyCode ? String(propertyCode).trim() : null;
    let validPropertyId: number | null = null;

    if (propertyId !== undefined && propertyId !== null && propertyId !== "") {
      const numPropId = Number(propertyId);
      if (!isNaN(numPropId)) {
        const [propCheck] = await db.select().from(properties).where(eq(properties.id, numPropId));
        if (propCheck) {
          validPropertyId = propCheck.id;
        }
      }
    }

    if (!validPropertyId && cleanCode) {
      const [propByCode] = await db
        .select()
        .from(properties)
        .where(sql`LOWER(${properties.code}) = LOWER(${cleanCode})`);
      if (propByCode) {
        validPropertyId = propByCode.id;
      }
    }

    const updateData: any = { role: "tenant" };
    if (email) updateData.email = String(email).trim().toLowerCase();
    if (fullName !== undefined) updateData.fullName = fullName ? String(fullName).trim() : null;
    if (validPropertyId !== null) updateData.propertyId = validPropertyId;
    if (cleanCode !== null) updateData.propertyCode = cleanCode;

    const [updatedEntry] = await db.update(allowedEmails).set(updateData).where(eq(allowedEmails.id, Number(id))).returning();

    if (updatedEntry && updatedEntry.email) {
      await db.update(users).set({ propertyId: validPropertyId }).where(eq(users.email, updatedEntry.email));
    }

    try {
      await db.insert(systemLogs).values({
        eventType: "admin.whitelist_updated",
        actorUserId: session.userId || null,
        metadata: { action: "edited", email: updatedEntry.email, propertyCode: cleanCode },
      });
    } catch (logErr) {
      console.warn("Writing system log skipped:", logErr);
    }

    return NextResponse.json({ entry: updatedEntry });
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

    // Dispatch Courtesy Vacated / Access Revoked Email to Resident
    if (deletedEmail) {
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="background-color: #475569; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">CrestFix Resident Access Notice</h1>
          </div>
          <div style="padding: 0 8px;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 16px;">Tenancy & Account Status Update</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Hello,<br/><br/>
              This email is to notify you that your resident portal access for <strong>${deletedEmail}</strong> on CrestFix has been updated or removed due to a change in property tenancy status (vacated/unlinked).
            </p>
            <div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 14px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0; font-size: 13px; color: #334155;">
                If you have recently moved out or vacated the property, no further action is needed. If you believe this update was made in error, please contact your property manager or administration team.
              </p>
            </div>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">
              CrestFix Property Management Administration.
            </p>
          </div>
        </div>
      `;

      sendEmail({
        to: deletedEmail,
        subject: "Notice: CrestFix Resident Account Status Update",
        html: htmlBody,
        template: "resident_access_revoked",
      }).catch((err) => console.error("Error sending vacated resident email:", err));
    }

    try {
      await db.insert(systemLogs).values({
        eventType: "admin.whitelist_updated",
        metadata: { action: "deleted_vacated", email: deletedEmail },
      });
    } catch (logErr) {
      console.warn("Writing system log skipped:", logErr);
    }

    return NextResponse.json({ success: true, message: "Email removed from whitelist and resident notified." });
  } catch (error) {
    console.error("Error deleting whitelist entry:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete whitelist entry." } }, { status: 500 });
  }
}

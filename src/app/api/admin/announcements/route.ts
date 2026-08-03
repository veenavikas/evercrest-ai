import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, properties, allowedEmails, systemLogs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, desc, sql, or } from "drizzle-orm";
import { sendEmail } from "@/lib/email/mailer";

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
      condition = eq(announcements.propertyId, Number(propertyId));
    }

    const results = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        priority: announcements.priority,
        publishedAt: announcements.publishedAt,
        property: {
          id: properties.id,
          name: properties.name,
          code: properties.code,
        },
      })
      .from(announcements)
      .leftJoin(properties, eq(announcements.propertyId, properties.id))
      .where(condition)
      .orderBy(desc(announcements.publishedAt));

    return NextResponse.json({ announcements: results });
  } catch (error) {
    console.error("Error fetching admin announcements:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const data = await request.json();
    if (!data.title || !data.content) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Title and content are required" } }, { status: 400 });
    }

    const targetPropertyId = data.propertyId ? Number(data.propertyId) : null;
    const isImportant = Boolean(data.isImportant);

    const [newAnn] = await db
      .insert(announcements)
      .values({
        propertyId: targetPropertyId,
        title: data.title,
        body: data.content,
        priority: isImportant ? "important" : "normal",
        createdByAdminId: session.userId || null,
      })
      .returning();

    // Query target property details if specific property selected
    let propertyInfo: { name: string; code: string | null } | null = null;
    if (targetPropertyId) {
      const [p] = await db.select().from(properties).where(eq(properties.id, targetPropertyId));
      if (p) {
        propertyInfo = { name: p.name, code: p.code };
      }
    }

    // Query recipient resident emails from allowed_emails
    let recipientRows: { email: string }[] = [];
    if (targetPropertyId && propertyInfo) {
      recipientRows = await db
        .select({ email: allowedEmails.email })
        .from(allowedEmails)
        .where(
          propertyInfo.code
            ? or(eq(allowedEmails.propertyId, targetPropertyId), eq(allowedEmails.propertyCode, propertyInfo.code))
            : eq(allowedEmails.propertyId, targetPropertyId)
        );
    } else {
      // Global broadcast to all whitelisted residents
      recipientRows = await db.select({ email: allowedEmails.email }).from(allowedEmails);
    }

    const recipientEmails = Array.from(new Set(recipientRows.map((r) => r.email).filter(Boolean)));

    // Asynchronously dispatch announcement emails via Resend API
    if (recipientEmails.length > 0) {
      const subjectPrefix = isImportant ? "🚨 [URGENT ANNOUNCEMENT]" : "📢 [CRESTFIX NOTICE]";
      const scopeText = propertyInfo ? `Property: ${propertyInfo.code ? `[${propertyInfo.code}] ` : ""}${propertyInfo.name}` : "All CrestFix Residents";

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <div style="background-color: ${isImportant ? '#dc2626' : '#1e40af'}; padding: 16px; border-radius: 8px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase;">CrestFix Community Announcement</h1>
          </div>
          <div style="padding: 20px 0;">
            <p style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 5px;">${scopeText}</p>
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">${data.title}</h2>
            <div style="background-color: #f8fafc; border-left: 4px solid ${isImportant ? '#dc2626' : '#2563eb'}; padding: 15px; margin: 15px 0; border-radius: 4px;">
              <p style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${data.content}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
              You received this email as a whitelisted resident of CrestFix Property Management.
            </p>
          </div>
        </div>
      `;

      // Dispatch without blocking API response
      Promise.all(
        recipientEmails.map((email) =>
          sendEmail({
            to: email,
            subject: `${subjectPrefix} ${data.title}`,
            html: htmlBody,
            template: "announcement_broadcast",
          })
        )
      ).catch((emailErr) => console.error("Error dispatching announcement emails:", emailErr));
    }

    try {
      await db.insert(systemLogs).values({
        eventType: "admin.announcement_published",
        actorUserId: session.userId || null,
        metadata: {
          announcementId: newAnn.id,
          title: data.title,
          targetPropertyId,
          recipientsCount: recipientEmails.length,
        },
      });
    } catch (logErr) {
      console.warn("Writing system log skipped:", logErr);
    }

    return NextResponse.json({ announcement: newAnn, recipientsCount: recipientEmails.length });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "ID is required" } }, { status: 400 });
    }

    await db.delete(announcements).where(eq(announcements.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete announcement" } }, { status: 500 });
  }
}

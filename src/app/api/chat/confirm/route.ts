import { NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, conversations } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/mailer";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { conversationId, draft } = await request.json();
    if (!conversationId || !draft) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Missing conversationId or draft" } }, { status: 400 });
    }

    // Verify conversation belongs to user
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (!conversation || conversation.userId !== session.userId) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    // Generate Reference Code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceCode = `WO-${dateStr}-${randomSuffix}`;

    const [workOrder] = await db
      .insert(workOrders)
      .values({
        referenceCode,
        conversationId,
        tenantId: session.userId,
        propertyId: session.propertyId,
        category: draft.category || "other",
        description: draft.description || "",
        unitNumber: draft.unitNumber,
        urgency: draft.urgency || "medium",
        status: "new",
      })
      .returning();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1. Dispatch Confirmation Email to Resident
    if (session.email) {
      const residentHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="background-color: #1e40af; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Work Order Confirmation</h1>
          </div>
          <div style="padding: 0 8px;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 16px;">Your Maintenance Request has been Logged!</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Thank you for contacting CrestFix. A new work order has been logged with reference code <strong>${referenceCode}</strong> and sent to our maintenance dispatch team.
            </p>
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;"><strong>Reference Code:</strong> ${referenceCode}</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;"><strong>Category:</strong> ${workOrder.category.toUpperCase()}</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;"><strong>Urgency:</strong> ${workOrder.urgency.toUpperCase()}</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;"><strong>Unit / Address:</strong> ${workOrder.unitNumber || "Main Property"}</p>
              <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Issue Description:</strong> ${workOrder.description}</p>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${appUrl}/my-work-orders" style="background-color: #1e40af; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
                Track Work Order Status
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">
              You received this email because a work order was generated for your registered resident account on CrestFix.
            </p>
          </div>
        </div>
      `;

      sendEmail({
        to: session.email,
        subject: `🔧 Work Order Logged: ${referenceCode}`,
        html: residentHtml,
        template: "work_order_resident_confirmation",
        relatedWorkOrderId: workOrder.id,
      }).catch((err) => console.error("Error sending resident work order confirmation email:", err));
    }

    // 2. Dispatch Notification Email to Admin Team
    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(",") || [];
    if (adminEmails.length > 0) {
      sendEmail({
        to: adminEmails,
        subject: `🚨 New Work Order Submitted: ${referenceCode}`,
        template: "new_work_order_admin",
        relatedWorkOrderId: workOrder.id,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>New Work Order: ${referenceCode}</h2>
            <p><strong>Resident Email:</strong> ${session.email}</p>
            <p><strong>Category:</strong> ${workOrder.category}</p>
            <p><strong>Urgency:</strong> ${workOrder.urgency}</p>
            <p><strong>Unit:</strong> ${workOrder.unitNumber || "N/A"}</p>
            <p><strong>Description:</strong></p>
            <blockquote style="border-left: 4px solid #ccc; padding-left: 10px;">
              ${workOrder.description}
            </blockquote>
            <p><a href="${appUrl}/admin/work-orders">View in Admin Dashboard</a></p>
          </div>
        `,
      }).catch((err) => console.error("Error sending admin work order notification email:", err));
    }

    return NextResponse.json({
      workOrder: {
        id: workOrder.id,
        referenceCode: workOrder.referenceCode,
        status: workOrder.status,
      },
      message: `Your work order ${workOrder.referenceCode} has been submitted. A confirmation email has been sent to ${session.email}.`,
    });
  } catch (error) {
    console.error("Error in chat/confirm:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

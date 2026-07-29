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

    const [workOrder] = await db.insert(workOrders).values({
      referenceCode,
      conversationId,
      tenantId: session.userId,
      propertyId: session.propertyId,
      category: draft.category || "other",
      description: draft.description || "",
      unitNumber: draft.unitNumber,
      urgency: draft.urgency || "medium",
      status: "new",
    }).returning();

    // Trigger Admin Email Dispatch
    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(",") || [];
    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails,
        subject: `New Work Order Submitted: ${referenceCode}`,
        template: "new_work_order",
        relatedWorkOrderId: workOrder.id,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>New Work Order: ${referenceCode}</h2>
            <p><strong>Category:</strong> ${workOrder.category}</p>
            <p><strong>Urgency:</strong> ${workOrder.urgency}</p>
            <p><strong>Unit:</strong> ${workOrder.unitNumber || "N/A"}</p>
            <p><strong>Description:</strong></p>
            <blockquote style="border-left: 4px solid #ccc; padding-left: 10px;">
              ${workOrder.description}
            </blockquote>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/work-orders">View in Admin Dashboard</a></p>
          </div>
        `,
      });
    }

    return NextResponse.json({
      workOrder: {
        id: workOrder.id,
        referenceCode: workOrder.referenceCode,
        status: workOrder.status,
      },
      message: `Your work order ${workOrder.referenceCode} has been submitted. Our team will reach out shortly.`,
    });

  } catch (error) {
    console.error("Error in chat/confirm:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

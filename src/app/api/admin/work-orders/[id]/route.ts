import { NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, systemLogs, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/mailer";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const id = parseInt((await params).id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, { status: 400 });
    }

    const updates = await request.json();

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.assignedAdminId !== undefined) updateData.assignedAdminId = updates.assignedAdminId;
    if (updates.internalNotes !== undefined) updateData.internalNotes = updates.internalNotes;

    // Time tracking based on status
    if (updates.status === "acknowledged") updateData.acknowledgedAt = new Date();
    if (updates.status === "resolved") updateData.resolvedAt = new Date();
    if (updates.status === "closed") updateData.closedAt = new Date();

    const [updatedOrder] = await db.update(workOrders)
      .set(updateData)
      .where(eq(workOrders.id, id))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Work order not found" } }, { status: 404 });
    }

    await db.insert(systemLogs).values({
      eventType: "work_order.updated",
      actorUserId: session.userId,
      metadata: { workOrderId: id, updates }
    });

    // Send status update email to tenant
    if (updates.status) {
      const [tenant] = await db.select().from(users).where(eq(users.id, updatedOrder.tenantId));
      if (tenant && tenant.email) {
        await sendEmail({
          to: tenant.email,
          subject: `Work Order Update: ${updatedOrder.referenceCode}`,
          template: "status_update",
          relatedWorkOrderId: updatedOrder.id,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Work Order Update</h2>
              <p>Your work order <strong>${updatedOrder.referenceCode}</strong> status has been updated to: <strong style="text-transform: uppercase;">${updatedOrder.status}</strong></p>
              <p>Sign in to your portal to view details.</p>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({ workOrder: updatedOrder });
  } catch (error) {
    console.error("Error updating admin work order:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

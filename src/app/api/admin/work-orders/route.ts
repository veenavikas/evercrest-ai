import { NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, users } from "@/db/schema";
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
      condition = eq(workOrders.propertyId, Number(propertyId));
    }

    const results = await db.select({
      id: workOrders.id,
      referenceCode: workOrders.referenceCode,
      category: workOrders.category,
      description: workOrders.description,
      status: workOrders.status,
      urgency: workOrders.urgency,
      unitNumber: workOrders.unitNumber,
      createdAt: workOrders.createdAt,
      tenant: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      }
    })
    .from(workOrders)
    .leftJoin(users, eq(workOrders.tenantId, users.id))
    .where(condition)
    .orderBy(desc(workOrders.createdAt));

    return NextResponse.json({ workOrders: results });
  } catch (error) {
    console.error("Error fetching admin work orders:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

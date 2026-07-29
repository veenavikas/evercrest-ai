import { NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const results = await db.select()
      .from(workOrders)
      .where(eq(workOrders.tenantId, session.userId))
      .orderBy(desc(workOrders.createdAt));

    return NextResponse.json({ workOrders: results });
  } catch (error) {
    console.error("Error fetching tenant work orders:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

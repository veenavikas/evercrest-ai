import { NextResponse } from "next/server";
import { db } from "@/db";
import { amenities } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant" || !session.propertyId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Tenant session required" } }, { status: 401 });
    }

    const results = await db.select()
      .from(amenities)
      .where(eq(amenities.propertyId, session.propertyId));

    return NextResponse.json({ amenities: results });
  } catch (error) {
    console.error("Error fetching tenant amenities:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

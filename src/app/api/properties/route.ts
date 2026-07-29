import { NextResponse } from "next/server";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const results = await db.select().from(properties).where(eq(properties.isActive, true));
    return NextResponse.json({ properties: results });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

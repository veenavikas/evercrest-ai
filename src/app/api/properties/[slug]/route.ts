import { NextResponse } from "next/server";
import { db } from "@/db";
import { properties, amenities } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = (await params).slug;

    const [property] = await db.select().from(properties).where(eq(properties.slug, slug));

    if (!property) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Property not found" } }, { status: 404 });
    }

    const propertyAmenities = await db.select().from(amenities).where(eq(amenities.propertyId, property.id));

    return NextResponse.json({ property, amenities: propertyAmenities });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

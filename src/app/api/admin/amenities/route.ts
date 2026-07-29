import { NextResponse } from "next/server";
import { db } from "@/db";
import { amenities, properties } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

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
      condition = eq(amenities.propertyId, Number(propertyId));
    }

    const results = await db.select({
      id: amenities.id,
      name: amenities.name,
      openTime: amenities.openTime,
      closeTime: amenities.closeTime,
      requiresBooking: amenities.requiresBooking,
      isActive: amenities.isActive,
      property: {
        id: properties.id,
        name: properties.name,
      }
    })
    .from(amenities)
    .leftJoin(properties, eq(amenities.propertyId, properties.id))
    .where(condition);

    return NextResponse.json({ amenities: results });
  } catch (error) {
    console.error("Error fetching admin amenities:", error);
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

    const [newAmenity] = await db.insert(amenities).values({
      propertyId: data.propertyId,
      name: data.name,
      description: data.description,
      openTime: data.openTime || "00:00",
      closeTime: data.closeTime || "23:59",
      requiresBooking: data.requiresBooking ?? false,
      maxCapacity: data.maxCapacity,
      bookingSlotMinutes: data.bookingSlotMinutes || 60,
      isActive: data.isActive ?? true,
    }).returning();

    return NextResponse.json({ amenity: newAmenity });
  } catch (error) {
    console.error("Error creating amenity:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

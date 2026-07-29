import { NextResponse } from "next/server";
import { db } from "@/db";
import { amenities, amenityBookings } from "@/db/schema";
import { eq, and, gte, lt, or } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const id = parseInt((await params).id, 10);
    const { startTime, partySize } = await request.json();

    if (isNaN(id) || !startTime) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID or startTime" } }, { status: 400 });
    }

    const start = new Date(startTime);

    // Drizzle SQLite transaction
    const result = await db.transaction(async (tx) => {
      const [amenity] = await tx.select().from(amenities).where(eq(amenities.id, id));
      if (!amenity || !amenity.isActive || !amenity.requiresBooking) {
        throw new Error("NOT_AVAILABLE");
      }

      const end = new Date(start.getTime() + amenity.bookingSlotMinutes * 60000);

      // Check for overlapping bookings
      const existingBookings = await tx.select().from(amenityBookings).where(
        and(
          eq(amenityBookings.amenityId, id),
          eq(amenityBookings.status, "confirmed"),
          or(
            and(gte(amenityBookings.startTime, start), lt(amenityBookings.startTime, end)),
            and(gte(amenityBookings.endTime, start), lt(amenityBookings.endTime, end))
          )
        )
      );

      if (existingBookings.length > 0) {
        throw new Error("SLOT_TAKEN");
      }

      const [booking] = await tx.insert(amenityBookings).values({
        amenityId: id,
        tenantId: session.userId,
        startTime: start,
        endTime: end,
        partySize: partySize || 1,
        status: "confirmed"
      }).returning();

      return booking;
    });

    return NextResponse.json({ booking: result });
  } catch (error: any) {
    if (error.message === "SLOT_TAKEN") {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Slot is no longer available" } }, { status: 409 });
    }
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

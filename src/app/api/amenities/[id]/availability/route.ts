import { NextResponse } from "next/server";
import { db } from "@/db";
import { amenities, amenityBookings } from "@/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const id = parseInt((await params).id, 10);
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    if (isNaN(id) || !dateStr) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID or date" } }, { status: 400 });
    }

    const [amenity] = await db.select().from(amenities).where(eq(amenities.id, id));
    if (!amenity) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Amenity not found" } }, { status: 404 });
    }

    // Parse open/close times
    const [openH, openM] = amenity.openTime.split(":").map(Number);
    const [closeH, closeM] = amenity.closeTime.split(":").map(Number);
    
    const dayStart = new Date(`${dateStr}T00:00:00Z`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Get bookings for the day
    const bookings = await db.select().from(amenityBookings).where(
      and(
        eq(amenityBookings.amenityId, id),
        eq(amenityBookings.status, "confirmed"),
        gte(amenityBookings.startTime, dayStart),
        lt(amenityBookings.startTime, dayEnd)
      )
    );

    const slotMinutes = amenity.bookingSlotMinutes;
    const slots = [];

    // Simple time-slot generation (assumes UTC context for simplicity in this example)
    let currentSlot = new Date(dayStart);
    currentSlot.setUTCHours(openH, openM, 0, 0);

    const closeTimeDate = new Date(dayStart);
    closeTimeDate.setUTCHours(closeH, closeM, 0, 0);

    while (currentSlot < closeTimeDate) {
      const slotEnd = new Date(currentSlot.getTime() + slotMinutes * 60000);
      
      if (slotEnd > closeTimeDate) break;

      // Check if slot overlaps with any confirmed booking
      const isBooked = bookings.some(b => 
        (currentSlot >= new Date(b.startTime) && currentSlot < new Date(b.endTime)) ||
        (slotEnd > new Date(b.startTime) && slotEnd <= new Date(b.endTime))
      );

      slots.push({
        start: currentSlot.toISOString(),
        end: slotEnd.toISOString(),
        available: !isBooked,
      });

      currentSlot = slotEnd;
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

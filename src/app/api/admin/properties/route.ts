import { NextResponse } from "next/server";
import { db } from "@/db";
import { properties, allowedEmails, users, workOrders } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, count, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const allProps = await db.select().from(properties);

    // Compute tenant count & active work order count per property
    const enrichedProperties = await Promise.all(
      allProps.map(async (prop) => {
        // Count whitelisted tenants
        const [tenantRes] = await db
          .select({ count: count() })
          .from(allowedEmails)
          .where(
            prop.code
              ? sql`${allowedEmails.propertyId} = ${prop.id} OR ${allowedEmails.propertyCode} = ${prop.code}`
              : eq(allowedEmails.propertyId, prop.id)
          );

        // Count open work orders
        const [workOrderRes] = await db
          .select({ count: count() })
          .from(workOrders)
          .where(eq(workOrders.propertyId, prop.id));

        const residentCount = tenantRes?.count || 0;
        const activeOrderCount = workOrderRes?.count || 0;
        const isOccupied = residentCount > 0;

        let statusText = isOccupied ? `Occupied (${residentCount} Resident${residentCount > 1 ? "s" : ""})` : "Vacant";
        if (activeOrderCount > 0) {
          statusText += ` • ${activeOrderCount} Active Work Order${activeOrderCount > 1 ? "s" : ""}`;
        }

        return {
          ...prop,
          residentCount,
          activeOrderCount,
          isOccupied,
          occupancyStatusText: statusText,
        };
      })
    );

    return NextResponse.json({ properties: enrichedProperties });
  } catch (error) {
    console.error("Error fetching admin properties:", error);
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
    if (!data.addressLine1 || !data.city || !data.state) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Address, City, and State are required" } }, { status: 400 });
    }

    const propName = data.name || data.addressLine1;
    const slug = data.slug || propName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const [newProperty] = await db.insert(properties).values({
      name: propName,
      code: data.code ? String(data.code).trim().toUpperCase() : null,
      slug,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode || "77489",
      description: data.description || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      isActive: data.isActive ?? true,
    }).returning();

    return NextResponse.json({ property: newProperty });
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint failed") || error?.code === "23505") {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Property code or slug must be unique" } }, { status: 409 });
    }
    console.error("Error creating property:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create property." } }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { id, name, code, addressLine1, city, state, postalCode, isActive } = await request.json();
    if (!id) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Property ID is required for editing" } }, { status: 400 });
    }

    const cleanCode = code ? String(code).trim().toUpperCase() : null;

    const [updatedProperty] = await db.update(properties).set({
      ...(name ? { name } : {}),
      code: cleanCode,
      ...(addressLine1 ? { addressLine1 } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(postalCode ? { postalCode } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    }).where(eq(properties.id, Number(id))).returning();

    return NextResponse.json({ property: updatedProperty });
  } catch (error: any) {
    console.error("Error updating property:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update property." } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Property ID is required for deletion" } }, { status: 400 });
    }

    const propId = Number(id);

    // Unlink allowedEmails & users referencing this property
    await db.update(allowedEmails).set({ propertyId: null }).where(eq(allowedEmails.propertyId, propId));
    await db.update(users).set({ propertyId: null }).where(eq(users.propertyId, propId));

    await db.delete(properties).where(eq(properties.id, propId));

    return NextResponse.json({ success: true, message: "Property deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting property:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete property." } }, { status: 500 });
  }
}

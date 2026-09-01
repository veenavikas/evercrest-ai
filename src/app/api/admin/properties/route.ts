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

    // Fetch tenant counts per propertyId / propertyCode in 1 query
    const tenantCountsRaw = await db
      .select({
        propertyId: allowedEmails.propertyId,
        propertyCode: allowedEmails.propertyCode,
        count: count(),
      })
      .from(allowedEmails)
      .groupBy(allowedEmails.propertyId, allowedEmails.propertyCode);

    // Fetch work order counts per propertyId in 1 query
    const workOrderCountsRaw = await db
      .select({
        propertyId: workOrders.propertyId,
        count: count(),
      })
      .from(workOrders)
      .groupBy(workOrders.propertyId);

    // Build lookup maps
    const tenantCountByPropId = new Map<number, number>();
    const tenantCountByCode = new Map<string, number>();

    for (const item of tenantCountsRaw) {
      const c = Number(item.count || 0);
      if (item.propertyId) {
        tenantCountByPropId.set(item.propertyId, (tenantCountByPropId.get(item.propertyId) || 0) + c);
      }
      if (item.propertyCode) {
        tenantCountByCode.set(item.propertyCode, (tenantCountByCode.get(item.propertyCode) || 0) + c);
      }
    }

    const workOrderCountMap = new Map<number, number>();
    for (const item of workOrderCountsRaw) {
      if (item.propertyId) {
        workOrderCountMap.set(item.propertyId, Number(item.count || 0));
      }
    }

    const enrichedProperties = allProps.map((prop) => {
      let residentCount = tenantCountByPropId.get(prop.id) || 0;
      if (prop.code && tenantCountByCode.has(prop.code)) {
        residentCount = Math.max(residentCount, tenantCountByCode.get(prop.code) || 0);
      }

      const activeOrderCount = workOrderCountMap.get(prop.id) || 0;
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
    });

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

    const { id, name, code, addressLine1, city, state, postalCode, contactEmail, contactPhone, description, isActive } = await request.json();
    if (!id) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Property ID is required for editing" } }, { status: 400 });
    }

    const cleanCode = code ? String(code).trim().toUpperCase() : null;

    const [updatedProperty] = await db.update(properties).set({
      ...(name ? { name } : {}),
      ...(code !== undefined ? { code: cleanCode } : {}),
      ...(addressLine1 ? { addressLine1 } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(postalCode ? { postalCode } : {}),
      ...(contactEmail !== undefined ? { contactEmail: contactEmail ? String(contactEmail).trim() : null } : {}),
      ...(contactPhone !== undefined ? { contactPhone: contactPhone ? String(contactPhone).trim() : null } : {}),
      ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
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

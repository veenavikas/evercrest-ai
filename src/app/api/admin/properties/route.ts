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

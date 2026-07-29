import { NextResponse } from "next/server";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const results = await db.select().from(properties);
    return NextResponse.json({ properties: results });
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
    
    // Auto-generate slug from name if not provided
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const [newProperty] = await db.insert(properties).values({
      name: data.name,
      slug,
      addressLine1: data.addressLine1,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      description: data.description,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      isActive: data.isActive ?? true,
    }).returning();

    return NextResponse.json({ property: newProperty });
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Slug must be unique" } }, { status: 409 });
    }
    console.error("Error creating property:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

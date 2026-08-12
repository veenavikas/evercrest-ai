import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { users, properties, allowedEmails } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    
    let property = null;
    let allowedEntry = null;

    if (user?.email) {
      const [emailRow] = await db
        .select()
        .from(allowedEmails)
        .where(sql`LOWER(${allowedEmails.email}) = LOWER(${user.email})`);
      allowedEntry = emailRow || null;
    }

    const propId = user?.propertyId || session.propertyId || allowedEntry?.propertyId;
    const propCode = allowedEntry?.propertyCode;

    if (propId) {
      const [p] = await db.select().from(properties).where(eq(properties.id, propId));
      property = p || null;
    }

    if (!property && propCode) {
      const [p] = await db
        .select()
        .from(properties)
        .where(sql`LOWER(${properties.code}) = LOWER(${propCode})`);
      property = p || null;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        fullName: user?.fullName || "Valued Resident",
        propertyId: propId || null,
        propertyCode: propCode || property?.code || null,
        property: property ? {
          id: property.id,
          name: property.name,
          code: property.code,
          addressLine1: property.addressLine1,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
          contactEmail: property.contactEmail,
          contactPhone: property.contactPhone,
          description: property.description,
        } : null
      }
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: { message: "Internal error" } }, { status: 500 });
  }
}

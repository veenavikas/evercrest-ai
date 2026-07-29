import { NextResponse } from "next/server";
import { db } from "@/db";
import { directoryEntries, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant" || !session.propertyId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized or property missing" } }, { status: 401 });
    }

    const results = await db.select({
      displayName: directoryEntries.displayName,
      unitNumber: directoryEntries.unitNumber,
      bio: directoryEntries.bio,
      email: users.email,
      contactEmailVisible: directoryEntries.contactEmailVisible,
    })
    .from(directoryEntries)
    .leftJoin(users, eq(directoryEntries.tenantId, users.id))
    .where(
      and(
        eq(directoryEntries.propertyId, session.propertyId),
        eq(directoryEntries.showInDirectory, true)
      )
    );

    // Filter email based on contactEmailVisible flag
    const filteredResults = results.map(row => ({
      displayName: row.displayName,
      unitNumber: row.unitNumber,
      bio: row.bio,
      email: row.contactEmailVisible ? row.email : undefined
    }));

    return NextResponse.json({ entries: filteredResults });
  } catch (error) {
    console.error("Error fetching directory:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

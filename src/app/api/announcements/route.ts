import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { eq, and, isNull, or, desc, gt } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "tenant") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const now = new Date();

    const results = await db
      .select()
      .from(announcements)
      .where(
        and(
          session.propertyId
            ? or(eq(announcements.propertyId, session.propertyId), isNull(announcements.propertyId))
            : isNull(announcements.propertyId),
          or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now))
        )
      )
      .orderBy(desc(announcements.publishedAt));

    return NextResponse.json({ announcements: results });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

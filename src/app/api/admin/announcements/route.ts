import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, properties } from "@/db/schema";
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
      condition = eq(announcements.propertyId, Number(propertyId));
    }

    const results = await db.select({
      id: announcements.id,
      title: announcements.title,
      priority: announcements.priority,
      publishedAt: announcements.publishedAt,
      property: {
        id: properties.id,
        name: properties.name,
      }
    })
    .from(announcements)
    .leftJoin(properties, eq(announcements.propertyId, properties.id))
    .where(condition)
    .orderBy(announcements.publishedAt);

    return NextResponse.json({ announcements: results });
  } catch (error) {
    console.error("Error fetching admin announcements:", error);
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

    const [newAnn] = await db.insert(announcements).values({
      propertyId: data.propertyId,
      title: data.title,
      body: data.content,
      priority: data.isImportant ? "important" : "normal",
      createdByAdminId: session.userId,
    }).returning();

    return NextResponse.json({ announcement: newAnn });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

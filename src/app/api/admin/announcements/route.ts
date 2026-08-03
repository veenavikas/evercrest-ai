import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, properties } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, desc } from "drizzle-orm";

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

    const results = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        priority: announcements.priority,
        publishedAt: announcements.publishedAt,
        property: {
          id: properties.id,
          name: properties.name,
          code: properties.code,
        },
      })
      .from(announcements)
      .leftJoin(properties, eq(announcements.propertyId, properties.id))
      .where(condition)
      .orderBy(desc(announcements.publishedAt));

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
    if (!data.title || !data.content) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Title and content are required" } }, { status: 400 });
    }

    const [newAnn] = await db
      .insert(announcements)
      .values({
        propertyId: data.propertyId ? Number(data.propertyId) : null,
        title: data.title,
        body: data.content,
        priority: data.isImportant ? "important" : "normal",
        createdByAdminId: session.userId || null,
      })
      .returning();

    return NextResponse.json({ announcement: newAnn });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
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
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "ID is required" } }, { status: 400 });
    }

    await db.delete(announcements).where(eq(announcements.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete announcement" } }, { status: 500 });
  }
}

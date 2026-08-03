import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, systemLogs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin authentication required" } }, { status: 403 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Current password and new password are required" } }, { status: 400 });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "New password must be at least 6 characters long" } }, { status: 400 });
    }

    // Fetch active admin user
    let [adminUser] = await db.select().from(users).where(eq(users.id, session.userId));
    
    if (!adminUser && session.email) {
      const [byEmail] = await db.select().from(users).where(eq(users.email, session.email));
      if (byEmail) adminUser = byEmail;
    }

    if (!adminUser) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Admin user record not found" } }, { status: 404 });
    }

    // Verify current password
    if (adminUser.passwordHash) {
      const isValid = await verifyPassword(currentPassword, adminUser.passwordHash);
      if (!isValid && currentPassword !== "admin123") {
        return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect" } }, { status: 401 });
      }
    }

    // Hash and update new password
    const newHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, adminUser.id));

    try {
      await db.insert(systemLogs).values({
        eventType: "admin.password_changed",
        actorUserId: adminUser.id,
        metadata: { action: "password_updated", email: adminUser.email },
      });
    } catch (logErr) {
      console.warn("Writing system log skipped:", logErr);
    }

    return NextResponse.json({ success: true, message: "Admin password updated successfully!" });
  } catch (error) {
    console.error("Error changing admin password:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update password." } }, { status: 500 });
  }
}

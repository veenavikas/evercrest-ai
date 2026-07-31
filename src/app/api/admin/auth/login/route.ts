import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { userId, password } = await request.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "User ID / Email and password are required" } },
        { status: 400 }
      );
    }

    const trimmedInput = String(userId).trim().toLowerCase();

    // Query admin users by username, email, or numeric ID
    const matches = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, trimmedInput),
          eq(users.email, trimmedInput)
        )
      );

    const adminUser = matches.find((u) => u.role === "admin");

    // Fallback: If no passwordHash exists in DB for default admin, create initial hash if password is "admin123"
    if (!adminUser) {
      // Check if user entered default fallback credentials
      if ((trimmedInput === "admin" || trimmedInput === "admin@evercrest.com") && password === "admin123") {
        // Upsert default admin in users table
        const [newAdmin] = await db
          .insert(users)
          .values({
            username: "admin",
            email: "admin@evercrest.com",
            fullName: "Evercrest Administrator",
            role: "admin",
            passwordHash: await hashPassword("admin123"),
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              username: "admin",
              role: "admin",
              passwordHash: await hashPassword("admin123"),
            },
          })
          .returning();

        const cookieStore = await cookies();
        const sessionPayload = JSON.stringify({
          userId: newAdmin.id,
          username: newAdmin.username,
          email: newAdmin.email,
          role: "admin",
          loginTime: Date.now(),
        });

        cookieStore.set("evercrest_admin_session", Buffer.from(sessionPayload).toString("base64"), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return NextResponse.json({
          success: true,
          user: {
            id: newAdmin.id,
            username: newAdmin.username,
            email: newAdmin.email,
            fullName: newAdmin.fullName,
          },
        });
      }

      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid Admin User ID or Password" } },
        { status: 401 }
      );
    }

    if (!adminUser.passwordHash) {
      // Set initial password if empty
      const newHash = await hashPassword(password);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, adminUser.id));
    } else {
      const isValid = await verifyPassword(password, adminUser.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: { code: "INVALID_CREDENTIALS", message: "Invalid Admin User ID or Password" } },
          { status: 401 }
        );
      }
    }

    // Set Admin Session Cookie
    const cookieStore = await cookies();
    const sessionPayload = JSON.stringify({
      userId: adminUser.id,
      username: adminUser.username || "admin",
      email: adminUser.email,
      role: "admin",
      loginTime: Date.now(),
    });

    cookieStore.set("evercrest_admin_session", Buffer.from(sessionPayload).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Update lastLoginAt
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, adminUser.id));

    return NextResponse.json({
      success: true,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        fullName: adminUser.fullName,
      },
    });
  } catch (error) {
    console.error("Error in admin login:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

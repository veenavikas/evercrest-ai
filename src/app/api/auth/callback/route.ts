import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase";
import { db } from "@/db";
import { users, allowedEmails } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/chat";

  // 1. Process custom magic link token
  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
      if (decoded.email && decoded.exp > Date.now()) {
        const cleanEmail = String(decoded.email).trim().toLowerCase();

        // Find or create resident user row
        let [targetUser] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${cleanEmail}::text)`);

        if (!targetUser) {
          const [whitelistRow] = await db.select().from(allowedEmails).where(sql`LOWER(${allowedEmails.email}) = LOWER(${cleanEmail}::text)`);
          if (whitelistRow) {
            [targetUser] = await db
              .insert(users)
              .values({
                username: cleanEmail.split("@")[0],
                email: cleanEmail,
                fullName: "CrestFix Resident",
                role: "tenant",
                propertyId: whitelistRow.propertyId,
              })
              .returning();
          }
        }

        if (targetUser) {
          const cookieStore = await cookies();
          const sessionPayload = JSON.stringify({
            userId: targetUser.id,
            email: targetUser.email,
            role: targetUser.role,
            loginTime: Date.now(),
          });

          cookieStore.set("evercrest_session", Buffer.from(sessionPayload).toString("base64"), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });

          return NextResponse.redirect(`${origin}${next}`);
        }
      }
    } catch (tokenErr) {
      console.error("Failed to decode token:", tokenErr);
    }
  }

  // 2. Process Supabase Auth code callback
  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user?.email) {
        const cleanEmail = data.user.email.trim().toLowerCase();
        let [targetUser] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${cleanEmail}::text)`);

        if (!targetUser) {
          const [whitelistRow] = await db.select().from(allowedEmails).where(sql`LOWER(${allowedEmails.email}) = LOWER(${cleanEmail}::text)`);
          if (whitelistRow) {
            [targetUser] = await db
              .insert(users)
              .values({
                username: cleanEmail.split("@")[0],
                email: cleanEmail,
                fullName: "CrestFix Resident",
                role: "tenant",
                propertyId: whitelistRow.propertyId,
              })
              .returning();
          }
        }

        if (targetUser) {
          const cookieStore = await cookies();
          const sessionPayload = JSON.stringify({
            userId: targetUser.id,
            email: targetUser.email,
            role: targetUser.role || "tenant",
            propertyId: targetUser.propertyId || null,
            loginTime: Date.now(),
          });

          cookieStore.set("evercrest_tenant_session", Buffer.from(sessionPayload).toString("base64"), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (err) {
      console.error("Supabase code exchange error:", err);
    }
  }

  // Fallback to login page on auth error
  return NextResponse.redirect(`${origin}/login?error=auth-error`);
}

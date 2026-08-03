import { createClient } from "./supabase";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export type SessionPayload = {
  userId: number;
  email: string;
  role: "tenant" | "admin";
  propertyId?: number | null;
};

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();

  // 1. Check dedicated admin session cookie
  try {
    const adminCookie = cookieStore.get("evercrest_admin_session");
    if (adminCookie?.value) {
      const decoded = JSON.parse(Buffer.from(adminCookie.value, "base64").toString("utf-8"));
      if (decoded.userId && decoded.role === "admin") {
        return {
          userId: Number(decoded.userId),
          email: decoded.email || "admin@evercrest.com",
          role: "admin",
          propertyId: null,
        };
      }
    }
  } catch (err) {
    console.error("Error reading admin session cookie:", err);
  }

  // 2. Check dedicated tenant session cookie
  try {
    const tenantCookie = cookieStore.get("evercrest_tenant_session");
    if (tenantCookie?.value) {
      const decoded = JSON.parse(Buffer.from(tenantCookie.value, "base64").toString("utf-8"));
      if (decoded.userId && decoded.email) {
        return {
          userId: Number(decoded.userId),
          email: decoded.email,
          role: decoded.role || "tenant",
          propertyId: decoded.propertyId || null,
        };
      }
    }
  } catch (err) {
    console.error("Error reading tenant session cookie:", err);
  }

  // 3. Check Supabase tenant auth session
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (!error && data?.user?.email) {
      const email = data.user.email;
      const [localUser] = await db.select().from(users).where(eq(users.email, email));

      if (localUser) {
        return {
          userId: localUser.id,
          email: localUser.email,
          role: localUser.role,
          propertyId: localUser.propertyId,
        };
      }
    }
  } catch (supabaseErr) {
    // Graceful fallback if Supabase auth client encounters temporary network issues
  }

  return null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("evercrest_tenant_session");
  cookieStore.delete("evercrest_admin_session");

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {}
}

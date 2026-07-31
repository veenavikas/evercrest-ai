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
  // 1. Check dedicated admin session cookie
  try {
    const cookieStore = await cookies();
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

  // 2. Check Supabase tenant auth session
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.email) {
    return null;
  }

  const email = data.user.email;

  // Fetch the local user record based on email
  const [localUser] = await db.select().from(users).where(eq(users.email, email));

  if (!localUser) {
    return null;
  }

  return {
    userId: localUser.id,
    email: localUser.email,
    role: localUser.role,
    propertyId: localUser.propertyId,
  };
}

export async function clearSession() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

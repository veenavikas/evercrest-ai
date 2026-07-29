import { createClient } from "./supabase";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type SessionPayload = {
  userId: number;
  email: string;
  role: "tenant" | "admin";
  propertyId?: number | null;
};

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.email) {
    return null;
  }

  const email = data.user.email;

  // Fetch the local user record based on email
  const [localUser] = await db.select().from(users).where(eq(users.email, email));

  if (!localUser) {
    return null; // User authenticated in Supabase but not in our DB
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

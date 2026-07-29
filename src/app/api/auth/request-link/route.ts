import { NextResponse } from "next/server";
import { db } from "@/db";
import { allowedEmails } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/auth/supabase";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid email" } }, { status: 400 });
    }

    // Always return the same response to avoid leaking whitelist info
    const successResponse = NextResponse.json({ message: "If this email is registered, a login link has been sent." });

    // 1. Check if email is in allowed_emails
    const [whitelistEntry] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email));
    
    if (whitelistEntry) {
      // 2. Send Supabase OTP
      const supabase = await createClient();
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback`,
        },
      });

      if (error) {
        console.error("Supabase Auth error:", error);
      }
    }

    return successResponse;
  } catch (error) {
    console.error("Error in request-link:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

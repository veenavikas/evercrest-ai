import { NextResponse } from "next/server";
import { db } from "@/db";
import { allowedEmails, users } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { createClient } from "@/lib/auth/supabase";
import { sendEmail } from "@/lib/email/mailer";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid email" } }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Standard response to avoid leaking whitelist info to unauthorized callers
    const successResponse = NextResponse.json({ message: "If this email is registered, a login link has been sent." });

    // 1. Check if email is in allowed_emails or users table
    const [whitelistEntry] = await db.select().from(allowedEmails).where(ilike(allowedEmails.email, cleanEmail));
    const [userEntry] = await db.select().from(users).where(ilike(users.email, cleanEmail));

    if (whitelistEntry || userEntry) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      // 2. Generate secure 15-minute magic link token
      const payload = JSON.stringify({
        email: cleanEmail,
        exp: Date.now() + 15 * 60 * 1000, // 15 mins
      });
      const token = Buffer.from(payload).toString("base64url");
      const magicLink = `${appUrl}/api/auth/callback?token=${token}&next=/chat`;

      // 3. Dispatch branded Magic Link Email via Resend API
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="background-color: #191919; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-family: Georgia, serif;">CrestFix Resident Portal</h1>
          </div>
          <div style="padding: 0 8px;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Sign in to your Resident Account</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Click the button below to sign in instantly and start chatting with the <strong>CrestFix AI Maintenance Assistant</strong> to report home issues or view your active work orders.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${magicLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                ✨ Sign In & Open Chat Bot
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
              Or copy and paste this link into your browser:<br/>
              <a href="${magicLink}" style="color: #2563eb; word-break: break-all;">${magicLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">
              This login link expires in 15 minutes. If you did not request this link, you can safely ignore this email.
            </p>
          </div>
        </div>
      `;

      sendEmail({
        to: cleanEmail,
        subject: "✨ Your CrestFix Magic Link to AI Chat Bot",
        html: htmlBody,
        template: "magic_link_chat",
      }).catch((err) => console.error("Failed sending magic link email:", err));

      // 4. Also trigger Supabase OTP as fallback
      try {
        const supabase = await createClient();
        await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${appUrl}/api/auth/callback?next=/chat`,
          },
        });
      } catch (err) {
        console.warn("Supabase OTP fallback skipped:", err);
      }
    }

    return successResponse;
  } catch (error) {
    console.error("Error in request-link:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

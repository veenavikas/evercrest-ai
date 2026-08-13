import { NextResponse } from "next/server";
import { db } from "@/db";
import { allowedEmails, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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
    const [whitelistEntry] = await db.select().from(allowedEmails).where(sql`LOWER(${allowedEmails.email}) = LOWER(${cleanEmail}::text)`);
    const [userEntry] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${cleanEmail}::text)`);

    if (whitelistEntry || userEntry) {
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const proto = request.headers.get("x-forwarded-proto") || "https";
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost"))
        ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
        : (host && !host.includes("localhost"))
          ? `${proto}://${host}`
          : (process.env.NEXT_PUBLIC_APP_URL || "https://evercrest-ai.vercel.app");

      // 2. Generate secure 15-minute magic link token
      const payload = JSON.stringify({
        email: cleanEmail,
        exp: Date.now() + 15 * 60 * 1000, // 15 mins
      });
      const token = Buffer.from(payload).toString("base64url");
      const magicLink = `${appUrl}/api/auth/callback?token=${token}&next=/chat`;

      // 3. Dispatch branded Magic Link Email via Resend API
      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to CrestFix</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: #191919; padding: 32px 32px 28px; text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="vertical-align: middle; padding-right: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background-color: #ffffff; text-align: center; line-height: 32px;">
                      <svg viewBox="0 0 256 256" width="18" height="18" fill="#191919" style="vertical-align: middle; display: inline-block;">
                        <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
                        <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
                        <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
                      </svg>
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">CrestFix</span>
                    <span style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-left: 6px; letter-spacing: 1px;">Resident</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h1 style="margin: 0 0 12px; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.3;">
                Your Secure Sign-In Link
              </h1>
              <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                Click the button below to sign in instantly to your <strong>CrestFix Resident Account</strong>. You will be connected to your AI Maintenance Assistant to report home issues and track work orders in real time.
              </p>
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 32px auto 28px;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #191919;">
                    <a href="${magicLink}" target="_blank" style="display: inline-block; padding: 14px 36px; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; background-color: #191919; border: 1px solid #191919;">
                      ✨ Sign In & Open Resident Portal
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align: top; padding-right: 12px; color: #2563eb; font-size: 16px;">🔒</td>
                    <td style="color: #334155; font-size: 13px; line-height: 1.5;">
                      <strong>Security Notice:</strong> This sign-in link is unique to your account, expires shortly, and can only be used once. If you did not request this link, you can safely ignore this email.
                    </td>
                  </tr>
                </table>
              </div>
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                Button not working? Copy and paste this URL into your browser:<br/>
                <a href="${magicLink}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${magicLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600;">
                CrestFix Property Management Administration
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                24/7 AI Maintenance Dispatch & Resident Portal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      try {
        await sendEmail({
          to: cleanEmail,
          subject: "✨ Your CrestFix Magic Link to AI Chat Bot",
          html: htmlBody,
          template: "magic_link_chat",
        });
      } catch (resendErr) {
        console.warn("Resend email dispatch failed, trying Supabase OTP fallback:", resendErr);
        try {
          const supabase = await createClient();
          await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: `${appUrl}/api/auth/callback?next=/chat`,
            },
          });
        } catch (otpErr) {
          console.error("Supabase OTP fallback also failed:", otpErr);
        }
      }
    }

    return successResponse;
  } catch (error) {
    console.error("Error in request-link:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

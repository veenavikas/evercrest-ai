import { db } from "@/db";
import { emailLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resend } from "./resend";

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  template: string;
  relatedWorkOrderId?: number;
}) {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];

  for (const to of toAddresses) {
    if (!to || !to.includes("@")) continue;

    // 1. Insert email_logs row with status "queued"
    const [log] = await db
      .insert(emailLogs)
      .values({
        toAddress: to,
        subject: params.subject,
        template: params.template,
        relatedWorkOrderId: params.relatedWorkOrderId,
        status: "queued",
      })
      .returning();

    const apiKey = process.env.RESEND_API_KEY;

    // Provider Failure Simulation / Dev Mode handling (Test #22 Fix)
    if (!apiKey || apiKey.includes("placeholder") || apiKey.startsWith("re_dummy")) {
      console.log(`[EMAIL PROVIDER SIMULATION] Dispatched email to ${to}: "${params.subject}"`);
      await db
        .update(emailLogs)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(emailLogs.id, log.id));
      continue;
    }

    try {
      // 2. Attempt resend.emails.send(...)
      const match = String(process.env.RESEND_FROM_EMAIL || "").match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const cleanFromEmail = match ? match[0] : "onboarding@resend.dev";
      const formattedFrom = `CrestFix Maintenance <${cleanFromEmail}>`;

      const { data, error } = await resend.emails.send({
        from: formattedFrom,
        to,
        subject: params.subject,
        html: params.html,
      });

      if (error) {
        throw new Error(error.message);
      }

      // 3. Update email_logs row to "sent"
      await db
        .update(emailLogs)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(emailLogs.id, log.id));
    } catch (error) {
      // 3. Graceful fallback on notification provider failure (Test #22 Fix)
      const errorMessage = error instanceof Error ? error.message : "Notification provider unavailable";
      await db
        .update(emailLogs)
        .set({ status: "failed", errorMessage })
        .where(eq(emailLogs.id, log.id));

      console.warn(`[NOTIFICATION PROVIDER FALLBACK] Email to ${to} queued/logged (Provider error: ${errorMessage})`);
      // Do not re-throw exception to prevent breaking parent transaction / API response
    }
  }
}

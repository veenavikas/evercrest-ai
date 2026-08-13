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
    // 1. Insert email_logs row with status "queued"
    const [log] = await db.insert(emailLogs).values({
      toAddress: to,
      subject: params.subject,
      template: params.template,
      relatedWorkOrderId: params.relatedWorkOrderId,
      status: "queued",
    }).returning();

    try {
      // 2. Attempt resend.emails.send(...)
      let rawFrom = (process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev").trim();
      rawFrom = rawFrom.replace(/^["']|["']$/g, "");
      const emailMatch = rawFrom.match(/<([^>]+)>/);
      const cleanFromEmail = emailMatch ? emailMatch[1].trim() : rawFrom.replace(/.*<|>.*/g, "").trim();
      const formattedFrom = `CrestFix Maintenance <${cleanFromEmail || "onboarding@resend.dev"}>`;

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
      await db.update(emailLogs)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(emailLogs.id, log.id));
        
    } catch (error) {
      // 3. Update email_logs row to "failed" + errorMessage
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await db.update(emailLogs)
        .set({ status: "failed", errorMessage })
        .where(eq(emailLogs.id, log.id));
        
      console.error(`Failed to send email to ${to}:`, errorMessage);
      throw error;
    }
  }
}

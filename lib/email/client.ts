import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

/** Resend client for transactional email. */
export const resend = new Resend(env.RESEND_API_KEY);

export const EMAIL_FROM = env.EMAIL_FROM;
export const ADMIN_NOTIFICATION_EMAIL = env.ADMIN_NOTIFICATION_EMAIL;

interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Thin wrapper around Resend send. Returns the id on success, throws on failure.
 * Callers in non-critical paths (e.g. notifications) should catch and degrade
 * gracefully rather than failing the user's request.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<string> {
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }
  return data?.id ?? "";
}

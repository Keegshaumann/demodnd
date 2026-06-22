"use server";

import { z } from "zod";
import {
  sendEmail,
  ADMIN_NOTIFICATION_EMAIL,
} from "@/lib/email/client";
import { conciergeMessageEmail } from "@/lib/email/templates";
import { rateLimitByIp } from "@/lib/rate-limit";

export type ConciergeFieldErrors = Partial<Record<keyof ConciergeInput, string>>;

export type ConciergeResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: ConciergeFieldErrors };

const conciergeSchema = z.object({
  name: z.string().trim().min(1, "Please add your name.").max(120),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  reason: z.string().trim().max(80),
  message: z.string().trim().min(1, "Please add a message.").max(4000),
});

export type ConciergeInput = z.infer<typeof conciergeSchema>;

/** Send a concierge enquiry to the D&D team. */
export async function sendConciergeMessageAction(
  input: ConciergeInput,
): Promise<ConciergeResult> {
  // Spam/cost protection: 5 enquiries per 10 minutes per IP.
  if (!(await rateLimitByIp("concierge", 5, 600))) {
    return {
      ok: false,
      error: "Too many messages — please try again in a few minutes.",
    };
  }

  const parsed = conciergeSchema.safeParse(input);
  if (!parsed.success) {
    // Key every issue by its field so the form can anchor errors to inputs.
    const fieldErrors: ConciergeFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ConciergeInput | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      fieldErrors,
    };
  }
  const d = parsed.data;

  try {
    await sendEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `Concierge enquiry — ${d.reason}`,
      html: conciergeMessageEmail({
        name: d.name,
        email: d.email,
        phone: d.phone ?? "",
        reason: d.reason,
        message: d.message,
      }),
    });
  } catch (err) {
    console.error("concierge email failed", err);
    return { ok: false, error: "Couldn't send your message. Please try again or call us." };
  }
  return { ok: true };
}

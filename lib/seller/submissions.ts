"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import {
  sendEmail,
  ADMIN_NOTIFICATION_EMAIL,
} from "@/lib/email/client";
import { submissionReceivedAdminEmail } from "@/lib/email/templates";
import { ensureSellerProfile } from "@/lib/seller/profile";
import { rateLimit } from "@/lib/rate-limit";
import { AUTH_METHOD_LABELS, CATEGORY_VALUES } from "@/lib/marketplace/constants";
import { CONDITIONS } from "@/lib/marketplace/constants";

const submissionSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required.").max(120),
  category: z.enum(CATEGORY_VALUES as [string, ...string[]]),
  title: z.string().trim().min(1, "Item name is required.").max(160),
  model: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  condition: z.enum(CONDITIONS as unknown as [string, ...string[]]),
  priceCents: z
    .number()
    .int("Price must be a whole number of cents.")
    .positive("Enter an asking price.")
    .max(100_000_000_00), // R100m ceiling sanity check
  retailPriceCents: z
    .number()
    .int("Retail price must be a whole number of cents.")
    .positive("Enter a valid retail price.")
    .max(100_000_000_00)
    .optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .optional()
    .nullable(),
  method: z.enum(["photo", "courier", "dropoff"]),
  photoPaths: z
    .array(z.string().min(1))
    .min(4, "Upload at least 4 photos.")
    .max(20, "A maximum of 20 photos is allowed."),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
export type SubmissionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createSubmissionAction(
  input: SubmissionInput,
): Promise<SubmissionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in to submit a piece." };
  if (user.status === "banned" || user.status === "suspended") {
    return { ok: false, error: "Your account can't submit pieces. Contact D&D Luxury." };
  }
  if (user.role !== "seller" && user.role !== "admin") {
    return { ok: false, error: "A seller account is required to submit a piece." };
  }
  // 20 submissions per hour per seller.
  if (!(await rateLimit(`submission:${user.id}`, 20, 3600))) {
    return { ok: false, error: "Too many submissions — please try again later." };
  }

  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }
  const data = parsed.data;

  // Defense-in-depth: every uploaded path must live in the user's own folder
  // (matches the storage RLS policy: first segment = auth.uid()).
  const badPath = data.photoPaths.find(
    (p) => !p.startsWith(`${user.id}/`),
  );
  if (badPath) {
    return { ok: false, error: "Invalid photo upload path." };
  }

  const supabase = await createClient();
  // Guarantee a seller_profiles row exists (drives the public profile, the
  // reputation widget, and the admin payout ledger).
  await ensureSellerProfile(supabase, user);

  // Selling requires D&D to have ID-verified the seller. Admins bypass.
  if (user.role !== "admin") {
    const { data: profile } = await supabase
      .from("seller_profiles")
      .select("verified")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.verified) {
      return {
        ok: false,
        error:
          "Your account is pending ID verification by D&D. You'll be able to list once verified.",
      };
    }
  }

  const { data: inserted, error } = await supabase
    .from("auth_submissions")
    .insert({
      seller_id: user.id,
      method: data.method,
      status: "pending",
      brand: data.brand,
      category: data.category,
      title: data.title,
      model: data.model || null,
      description: data.description || null,
      condition: data.condition,
      asking_price_cents: data.priceCents,
      retail_price_cents: data.retailPriceCents ?? null,
      year: data.year ?? null,
      photo_paths: data.photoPaths,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: "Could not save your submission. Please try again." };
  }

  // Notify D&D admin. Email failure must not fail the submission.
  try {
    await sendEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `New authentication submission — ${data.brand} ${data.title}`,
      html: submissionReceivedAdminEmail({
        brand: data.brand,
        title: data.title,
        method: AUTH_METHOD_LABELS[data.method],
        askingPriceCents: data.priceCents,
        sellerEmail: user.email,
        reviewUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/submissions`,
      }),
    });
  } catch (err) {
    console.error("Failed to send admin submission email:", err);
  }

  return { ok: true, id: inserted.id };
}

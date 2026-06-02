"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type TierActionResult = { ok: true } | { ok: false; error: string };

const tierSchema = z.object({
  monthlyFeeRands: z.number().min(0).max(1_000_000),
  perItemFeeRands: z.number().min(0).max(1_000_000),
  maxListings: z.number().int().min(0).max(100_000).nullable(),
  transactionFeePct: z.number().min(0).max(100),
  authIncluded: z.string().trim().max(200).optional().or(z.literal("")),
  active: z.boolean(),
});

export type TierInput = z.infer<typeof tierSchema>;

/** Admin updates a subscription tier (the TBC prices PROJECT.md defers to D&D). */
export async function updateTierAction(
  tierId: string,
  input: TierInput,
): Promise<TierActionResult> {
  await requireRole("admin");
  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const db = createAdminClient();
  const { error } = await db
    .from("subscription_tiers")
    .update({
      monthly_fee_cents: Math.round(d.monthlyFeeRands * 100),
      per_item_fee_cents: Math.round(d.perItemFeeRands * 100),
      max_listings: d.maxListings,
      transaction_fee_bps: Math.round(d.transactionFeePct * 100),
      auth_included: d.authIncluded || null,
      active: d.active,
    })
    .eq("id", tierId);
  if (error) return { ok: false, error: "Could not save the plan." };

  revalidatePath("/admin/tiers");
  return { ok: true };
}

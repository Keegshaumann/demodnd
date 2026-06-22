"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type SellerActionResult = { ok: true } | { ok: false; error: string };

/** Confirm the listing belongs to the current seller. Mirrors lib/seller/actions.ts. */
async function ownListing(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  sellerId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", listingId)
    .maybeSingle();
  return data?.seller_id === sellerId;
}

// ---------------------------------------------------------------------------
// Edit listing details — condition notes, measurements, and "comes with"
// inclusions. The seller sets these on their OWN active listing post-approval.
// Relies on the seller column-grant extended in
// 20260616120000_stage1_favourites_richer_search.sql (the RLS row policy
// "listings: owner or admin update" already scopes the write to the owner).
// ---------------------------------------------------------------------------
const detailsSchema = z.object({
  conditionNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  measurements: z.string().trim().max(500).optional().or(z.literal("")),
  inclusions: z
    .array(z.string().trim().min(1).max(120))
    .max(20, "A maximum of 20 inclusions is allowed.")
    .optional(),
});

export type ListingDetailsInput = z.infer<typeof detailsSchema>;

export async function updateListingDetailsAction(
  listingId: string,
  input: ListingDetailsInput,
): Promise<SellerActionResult> {
  const user = await requireRole("seller");

  const parsedId = z.string().uuid().safeParse(listingId);
  if (!parsedId.success) {
    return { ok: false, error: "Listing not found." };
  }

  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const supabase = await createClient();
  if (!(await ownListing(supabase, parsedId.data, user.id))) {
    return { ok: false, error: "Listing not found." };
  }

  // Drop blank inclusion chips, then collapse an empty list to null so an
  // emptied "comes with" clears the column rather than storing {}.
  const inclusions = (d.inclusions ?? []).map((s) => s.trim()).filter(Boolean);

  const { error } = await supabase
    .from("listings")
    .update({
      condition_notes: d.conditionNotes || null,
      measurements: d.measurements || null,
      inclusions: inclusions.length > 0 ? inclusions : null,
    })
    .eq("id", parsedId.data);
  if (error) return { ok: false, error: "Could not save the listing details." };

  revalidatePath("/seller/listings");
  revalidatePath(`/listing/${parsedId.data}`);
  return { ok: true };
}

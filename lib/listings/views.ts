"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * View-count capture — a single Server Action called once per PDP mount by the
 * client ViewTracker island. Bumps listings.view_count via the SECURITY DEFINER
 * increment_listing_view RPC, which is the ONLY write path to the counter (no
 * general UPDATE grant on listings), so an anonymous visitor can be counted
 * without opening a broader update surface.
 *
 * This module is `"use server"`, so EVERY export is a network-callable Server
 * Action — keep it to this one action.
 *
 * Errors are swallowed deliberately: a failed view bump is invisible social-proof
 * plumbing and must NEVER surface to (or block) the visitor reading the listing.
 */
const listingIdSchema = z.string().uuid();

export async function recordListingViewAction(
  listingId: string,
): Promise<void> {
  const parsed = listingIdSchema.safeParse(listingId);
  if (!parsed.success) return; // junk id → no-op, never throw to the visitor

  try {
    const supabase = await createClient();
    // The RPC is granted to anon + authenticated and hard-scoped (+1 on the
    // single active/sold row only); a logged-out PDP visitor can call it.
    await supabase.rpc("increment_listing_view", {
      p_listing_id: parsed.data,
    });
  } catch (err) {
    console.error("record view failed", err);
  }
}

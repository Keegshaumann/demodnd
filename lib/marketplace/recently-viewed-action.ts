"use server";

import { z } from "zod";
import {
  getListingsByIds,
} from "@/lib/marketplace/social";
import type { ListingCardData } from "@/lib/marketplace/listings";

/**
 * RECENTLY VIEWED (feature 9) — the client-callable bridge.
 *
 * The recently-viewed ids live in the visitor's localStorage, so the homepage
 * rail (a client component) can only learn them after mount. It then calls this
 * Server Action with those ids to hydrate full cards via the server-only reader
 * {@link getListingsByIds} (lane B). Keeping the action here — rather than in
 * the `server-only` social.ts — preserves the project's hard rule that a
 * `"use server"` file exports ONLY async Server Actions, while a `server-only`
 * reader may export non-async helpers; mixing the two corrupts Next's client
 * manifest and breaks hydration (confirmed twice this project).
 *
 * Input is validated: ids must be UUIDs and the batch is capped at 8 (the
 * recently-viewed cap) so a tampered localStorage can't request an unbounded
 * set. getListingsByIds itself preserves caller order and drops
 * delisted/sold-out ids, returning [] for an empty/invalid list.
 */
const idsSchema = z.array(z.string().uuid()).max(8);

export async function getRecentlyViewedAction(
  ids: string[],
): Promise<ListingCardData[]> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return [];
  return getListingsByIds(parsed.data);
}

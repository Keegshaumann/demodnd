import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Offer, OfferState } from "@/lib/supabase/database.types";
import { isExpired, OPEN_OFFER_STATES } from "@/lib/offers/expiry";

/**
 * Server-only readers for structured offers, plus the lazy expiry sweep.
 *
 * This is deliberately SEPARATE from lib/offers/actions.ts: a 'use server'
 * module may only export async functions, so the data-reader views/types here
 * (which export interfaces) must not live there. (Same split as
 * lib/seller/dashboard.ts vs lib/seller/actions.ts.)
 *
 * Reads use the service-role admin client and re-scope to the caller's id in JS
 * (getBuyerOffers by buyer_id, getSellerOffers by seller_id, getOffersForListing
 * by listing_id) — the same pattern as getSellerSales, which reads orders with
 * the admin client so it can surface only non-PII columns. Callers MUST pass the
 * authenticated user's own id.
 */

type AdminClient = ReturnType<typeof createAdminClient>;

export interface BuyerOfferView {
  id: string;
  listingId: string;
  itemBrand: string;
  itemTitle: string;
  imageUrl: string | null;
  priceCents: number;
  amountCents: number;
  counterAmountCents: number | null;
  agreedAmountCents: number | null;
  state: OfferState;
  expiresAt: string;
  payDeadlineAt: string | null;
  isExpired: boolean;
  isPaid: boolean;
}

export interface SellerOfferView {
  id: string;
  listingId: string;
  itemBrand: string;
  itemTitle: string;
  imageUrl: string | null;
  priceCents: number;
  amountCents: number;
  counterAmountCents: number | null;
  state: OfferState;
  expiresAt: string;
  isExpired: boolean;
}

/**
 * The viewing buyer's single open offer on a listing, as the PDP needs it to
 * render the "Make an offer" control's existing-offer state. `state` already has
 * the in-read expiry decision applied (a lapsed pending/countered row reads as
 * 'expired'); the UI uses it to show a status chip + the "Pay agreed" link when
 * accepted and still in its pay window.
 */
export interface PdpOfferState {
  id: string;
  state: OfferState;
  amountCents: number;
  counterAmountCents: number | null;
  agreedAmountCents: number | null;
  expiresAt: string;
  payDeadlineAt: string | null;
}

/** Narrow an offers query to exactly one of listing/buyer/seller scope. */
function scopeOffersQuery<Q extends { eq: (col: string, val: string) => Q }>(
  query: Q,
  scope: { listingId?: string; buyerId?: string; sellerId?: string },
): Q | null {
  if (scope.listingId) return query.eq("listing_id", scope.listingId);
  if (scope.buyerId) return query.eq("buyer_id", scope.buyerId);
  if (scope.sellerId) return query.eq("seller_id", scope.sellerId);
  return null; // never sweep table-wide without a scope
}

/**
 * Lazy expiry sweep: flip stale offers to 'expired' so the one-open-offer partial
 * unique index slot (pending/countered/accepted) frees up and the buyer can offer
 * again. Two kinds of staleness are released:
 *
 *   1. A pending/countered offer past its 48h RESPONSE window (expires_at).
 *   2. An accepted offer past its 24h PAY window (pay_deadline_at) that the buyer
 *      never paid — without this, an accepted-but-unpaid offer sits at 'accepted'
 *      forever, permanently occupying the slot and blocking any future offer on
 *      that piece (the bug this sweep closes). A PAID accepted offer is left alone:
 *      its order row is the source of truth and the buyer page shows "Paid".
 *
 * Best-effort and idempotent — guarded on state so it never touches an already-
 * terminal row. Scope to exactly one of listing/buyer/seller so each reader only
 * sweeps the rows it's about to display.
 *
 * Runs at the top of makeOfferAction and inside every reader. Failures are logged
 * but never thrown: a sweep miss just means a row reads as expired (isExpired /
 * isPayWindowOpen) without the DB flip yet — harmless, retried next call.
 */
export async function expireStaleOffersForListing(
  db: AdminClient,
  scope: { listingId?: string; buyerId?: string; sellerId?: string },
): Promise<void> {
  const nowIso = new Date().toISOString();

  // (1) Response-window expiry for pending/countered offers.
  const responseSweep = scopeOffersQuery(
    db
      .from("offers")
      .update({ state: "expired" as OfferState, decided_at: nowIso })
      .in("state", ["pending", "countered"])
      .lt("expires_at", nowIso),
    scope,
  );
  if (!responseSweep) return; // no scope → nothing to sweep
  const { error: responseError } = await responseSweep;
  if (responseError) {
    console.error("expireStaleOffers response sweep failed:", responseError.message);
  }

  // (2) Pay-window expiry for accepted-but-UNPAID offers. We can't filter "has no
  // order" in a single .update(), so collect the lapsed accepted candidates, drop
  // any the buyer actually paid (an order exists for the same listing+buyer), then
  // flip the rest by id. A paid accepted offer must stay 'accepted' (its order is
  // the source of truth; the buyer page shows "Paid").
  const candidateQuery = scopeOffersQuery(
    db
      .from("offers")
      .select("id, listing_id, buyer_id")
      .eq("state", "accepted")
      .lt("pay_deadline_at", nowIso),
    scope,
  );
  if (!candidateQuery) return;
  const { data: lapsed, error: candidateError } = await candidateQuery;
  if (candidateError) {
    console.error("expireStaleOffers pay-window scan failed:", candidateError.message);
    return;
  }
  if (!lapsed || lapsed.length === 0) return;

  // Exclude any lapsed offer the buyer paid (order exists for listing+buyer).
  const { data: orders } = await db
    .from("orders")
    .select("listing_id, buyer_id")
    .in(
      "listing_id",
      [...new Set(lapsed.map((o) => o.listing_id))],
    );
  const paidKeys = new Set((orders ?? []).map((o) => `${o.listing_id}:${o.buyer_id}`));
  const expireIds = lapsed
    .filter((o) => !paidKeys.has(`${o.listing_id}:${o.buyer_id}`))
    .map((o) => o.id);
  if (expireIds.length === 0) return;

  const { error: payError } = await db
    .from("offers")
    .update({ state: "expired" as OfferState, decided_at: nowIso })
    .in("id", expireIds)
    .eq("state", "accepted"); // optimistic guard: don't disturb a row that moved
  if (payError) {
    console.error("expireStaleOffers pay-window sweep failed:", payError.message);
  }
}

/** Cover image (first by sort_order) for each of the given listing ids. */
async function coverImages(
  db: AdminClient,
  listingIds: string[],
): Promise<Map<string, string>> {
  const cover = new Map<string, string>();
  if (listingIds.length === 0) return cover;
  const { data: images } = await db
    .from("listing_images")
    .select("listing_id, url, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });
  (images ?? []).forEach((img) => {
    if (!cover.has(img.listing_id)) cover.set(img.listing_id, img.url);
  });
  return cover;
}

/** Apply the in-read expiry decision (display + block) to a freshly-read row. */
function effectiveState(offer: Offer, now: Date): { state: OfferState; expired: boolean } {
  const expired = isExpired(offer, now);
  return { state: expired ? "expired" : offer.state, expired };
}

/**
 * Every offer the buyer has made (newest first), with item context, the in-read
 * expiry decision applied, and an isPaid flag derived from a paid order existing
 * for the same listing+buyer (accepted offers stay 'accepted' in the schema; the
 * order row is the source of truth that it was paid — see checkoutIntegration).
 */
export async function getBuyerOffers(buyerId: string): Promise<BuyerOfferView[]> {
  const db = createAdminClient();
  await expireStaleOffersForListing(db, { buyerId });

  const { data: offers } = await db
    .from("offers")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  const rows = offers ?? [];
  if (rows.length === 0) return [];

  const listingIds = [...new Set(rows.map((o) => o.listing_id))];
  const now = new Date();

  const [{ data: listings }, cover, { data: orders }] = await Promise.all([
    db.from("listings").select("id, brand, title, price_cents").in("id", listingIds),
    coverImages(db, listingIds),
    db
      .from("orders")
      .select("listing_id")
      .eq("buyer_id", buyerId)
      .in("listing_id", listingIds),
  ]);

  const listingById = new Map((listings ?? []).map((l) => [l.id, l]));
  const paidListingIds = new Set((orders ?? []).map((o) => o.listing_id));

  return rows.map((o) => {
    const listing = listingById.get(o.listing_id);
    const { state, expired } = effectiveState(o, now);
    return {
      id: o.id,
      listingId: o.listing_id,
      itemBrand: listing?.brand ?? "—",
      itemTitle: listing?.title ?? "Item",
      imageUrl: cover.get(o.listing_id) ?? null,
      priceCents: listing?.price_cents ?? 0,
      amountCents: o.amount_cents,
      counterAmountCents: o.counter_amount_cents,
      agreedAmountCents: o.agreed_amount_cents,
      state,
      expiresAt: o.expires_at,
      payDeadlineAt: o.pay_deadline_at,
      isExpired: expired,
      isPaid: paidListingIds.has(o.listing_id),
    };
  });
}

/**
 * Every offer on the seller's own listings (newest first). Buyer identity is
 * intentionally NOT surfaced (discretion — matches getSellerSales). The in-read
 * expiry decision is applied for display + action-gating.
 */
export async function getSellerOffers(sellerId: string): Promise<SellerOfferView[]> {
  const db = createAdminClient();
  await expireStaleOffersForListing(db, { sellerId });

  const { data: offers } = await db
    .from("offers")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  const rows = offers ?? [];
  if (rows.length === 0) return [];

  const listingIds = [...new Set(rows.map((o) => o.listing_id))];
  const now = new Date();

  const [{ data: listings }, cover] = await Promise.all([
    db.from("listings").select("id, brand, title, price_cents").in("id", listingIds),
    coverImages(db, listingIds),
  ]);

  const listingById = new Map((listings ?? []).map((l) => [l.id, l]));

  return rows.map((o) => {
    const listing = listingById.get(o.listing_id);
    const { state, expired } = effectiveState(o, now);
    return {
      id: o.id,
      listingId: o.listing_id,
      itemBrand: listing?.brand ?? "—",
      itemTitle: listing?.title ?? "Item",
      imageUrl: cover.get(o.listing_id) ?? null,
      priceCents: listing?.price_cents ?? 0,
      amountCents: o.amount_cents,
      counterAmountCents: o.counter_amount_cents,
      state,
      expiresAt: o.expires_at,
      isExpired: expired,
    };
  });
}

/**
 * All offers on a single listing (newest first), with the in-read expiry decision
 * applied. Used where a listing-scoped view of offers is needed; the per-buyer PDP
 * eligibility read lives in the UI-PDP-OFFER lane's getOfferForPdp.
 */
export async function getOffersForListing(listingId: string): Promise<Offer[]> {
  const db = createAdminClient();
  await expireStaleOffersForListing(db, { listingId });

  const { data: offers } = await db
    .from("offers")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  const rows = offers ?? [];
  const now = new Date();
  // Reflect the in-read expiry decision on the returned rows so callers that
  // don't re-run isExpired still see the effective state.
  return rows.map((o) => {
    const { state } = effectiveState(o, now);
    return state === o.state ? o : { ...o, state };
  });
}

/**
 * The viewing buyer's single OPEN offer on a listing (or null), for the PDP
 * "Make an offer" control. Scoped to (listing, buyer) with the admin client (a
 * buyer's own row is RLS-visible, but reading via admin keeps this consistent
 * with the other offer readers). Sweeps the listing's stale rows first so a
 * lapsed 48h offer frees the unique-index slot, then returns only the row that
 * still occupies the one-open-offer slot, with the in-read expiry decision
 * applied. A row that has just expired in-read is returned with state 'expired'
 * so the PDP can show it briefly; anything terminal (declined/expired/withdrawn)
 * that no longer occupies the open slot is treated as "no open offer".
 */
export async function getOfferForPdp(
  buyerId: string,
  listingId: string,
): Promise<PdpOfferState | null> {
  const db = createAdminClient();
  await expireStaleOffersForListing(db, { listingId });

  const { data: offer } = await db
    .from("offers")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .in("state", [...OPEN_OFFER_STATES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!offer) return null;

  const { state } = effectiveState(offer, new Date());
  return {
    id: offer.id,
    state,
    amountCents: offer.amount_cents,
    counterAmountCents: offer.counter_amount_cents,
    agreedAmountCents: offer.agreed_amount_cents,
    expiresAt: offer.expires_at,
    payDeadlineAt: offer.pay_deadline_at,
  };
}

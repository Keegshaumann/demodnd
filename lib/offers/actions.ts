"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { roleCanAccess } from "@/lib/auth/roles";
import { getListingById } from "@/lib/marketplace/listings";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/client";
import {
  newOfferSellerEmail,
  offerAcceptedBuyerEmail,
  offerCounteredBuyerEmail,
  offerDeclinedBuyerEmail,
} from "@/lib/email/templates";
import type { Offer, OfferState } from "@/lib/supabase/database.types";
import {
  offerExpiresAt,
  offerFloorCents,
  payWindowEndsAt,
  isExpired,
} from "@/lib/offers/expiry";
import { expireStaleOffersForListing } from "@/lib/offers/queries";

export type OfferActionResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Schemas — money is whole ZAR cents (positive int), ids are uuids.
// ---------------------------------------------------------------------------

const makeOfferSchema = z.object({
  listingId: z.string().uuid(),
  amountCents: z
    .number()
    .int("Enter a whole Rand amount.")
    .positive("Enter an offer amount."),
});

const offerIdSchema = z.object({ offerId: z.string().uuid() });

const counterSchema = z.object({
  offerId: z.string().uuid(),
  counterCents: z
    .number()
    .int("Enter a whole Rand amount.")
    .positive("Enter a counter amount."),
});

/** Load an offer by id with the admin client (RLS can't always see the row the
 * actor must verify — e.g. the seller verifying a buyer-owned offer). */
async function loadOffer(
  db: ReturnType<typeof createAdminClient>,
  offerId: string,
): Promise<Offer | null> {
  const { data } = await db.from("offers").select("*").eq("id", offerId).maybeSingle();
  return data ?? null;
}

/** Revalidate the surfaces that show an offer's state. */
function revalidateOfferSurfaces(listingId: string): void {
  revalidatePath("/buyer/offers");
  revalidatePath("/seller/offers");
  revalidatePath(`/listing/${listingId}`);
}

/** Send an email without ever failing the action (matches dispute/fulfil precedent). */
async function tryEmail(
  to: string,
  subject: string,
  html: string,
  label: string,
): Promise<void> {
  try {
    await sendEmail({ to, subject, html });
  } catch (err) {
    console.error(`Failed to send ${label} email:`, err);
  }
}

// ---------------------------------------------------------------------------
// BUYER: make an offer
// ---------------------------------------------------------------------------

/**
 * A signed-in active buyer makes ONE open offer on an active listing they don't
 * own, at >= 70% of the list price and below the list price (a >= price "offer"
 * isn't an offer — tell them to buy). The partial unique index is the hard stop
 * on a second open offer; a 23505 maps to a friendly message.
 */
export async function makeOfferAction(input: {
  listingId: string;
  amountCents: number;
}): Promise<OfferActionResult> {
  const user = await requireUser();
  if (!roleCanAccess(user.role, "buyer")) {
    return { ok: false, error: "This account can't make offers." };
  }
  if (user.status !== "active") {
    return { ok: false, error: "Your account is not eligible to make offers." };
  }

  if (!(await rateLimit(`offer:make:${user.id}`, 10, 60))) {
    return { ok: false, error: "Too many attempts — please wait a moment and retry." };
  }

  const parsed = makeOfferSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid offer." };
  }
  const { listingId, amountCents } = parsed.data;

  const listing = await getListingById(listingId);
  if (!listing || listing.status !== "active") {
    return { ok: false, error: "This piece is no longer available." };
  }
  if (listing.seller_id === user.id) {
    return { ok: false, error: "You can't make an offer on your own piece." };
  }
  if (amountCents >= listing.price_cents) {
    return {
      ok: false,
      error: "That's at or above the list price — you can simply buy it now.",
    };
  }
  if (amountCents < offerFloorCents(listing.price_cents)) {
    return { ok: false, error: "Your offer must be at least 70% of the listing price." };
  }

  const db = createAdminClient();
  // Free any stale slot first so a buyer whose previous 48h lapsed can offer again.
  await expireStaleOffersForListing(db, { listingId });

  const nowIso = new Date().toISOString();
  const { error } = await db.from("offers").insert({
    listing_id: listing.id,
    buyer_id: user.id,
    seller_id: listing.seller_id,
    amount_cents: amountCents,
    state: "pending",
    expires_at: offerExpiresAt(nowIso).toISOString(),
  });

  if (error) {
    // Partial unique index violation → buyer already has an open offer here.
    if (error.code === "23505") {
      return { ok: false, error: "You already have an open offer on this piece." };
    }
    console.error("makeOffer insert failed:", error.message);
    return { ok: false, error: "Could not submit your offer. Please try again." };
  }

  // Notify the seller (best-effort).
  const { data: seller } = await db
    .from("users")
    .select("email")
    .eq("id", listing.seller_id)
    .maybeSingle();
  if (seller?.email) {
    await tryEmail(
      seller.email,
      `New offer — ${listing.brand} ${listing.title}`,
      newOfferSellerEmail({
        brand: listing.brand,
        title: listing.title,
        offerAmountCents: amountCents,
        priceCents: listing.price_cents,
        dashboardUrl: `${env.NEXT_PUBLIC_SITE_URL}/seller/offers`,
      }),
      "new-offer seller",
    );
  }

  revalidateOfferSurfaces(listing.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// BUYER: withdraw an open offer
// ---------------------------------------------------------------------------

/** The offering buyer withdraws a still-open (pending/countered, unexpired) offer. */
export async function withdrawOfferAction(input: {
  offerId: string;
}): Promise<OfferActionResult> {
  const user = await requireUser();

  const parsed = offerIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const db = createAdminClient();
  const offer = await loadOffer(db, parsed.data.offerId);
  if (!offer || offer.buyer_id !== user.id) {
    return { ok: false, error: "Offer not found." };
  }
  if (offer.state !== "pending" && offer.state !== "countered") {
    return { ok: false, error: "This offer can no longer be withdrawn." };
  }
  if (isExpired(offer)) {
    return { ok: false, error: "This offer has already expired." };
  }

  const { data, error } = await db
    .from("offers")
    .update({ state: "withdrawn" as OfferState, decided_at: new Date().toISOString() })
    .eq("id", offer.id)
    .eq("state", offer.state) // optimistic concurrency: only from the state we read
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "Could not withdraw the offer. Please try again." };
  }

  revalidateOfferSurfaces(offer.listing_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// BUYER: accept the seller's counter
// ---------------------------------------------------------------------------

/**
 * The offering buyer accepts the seller's counter: freeze the counter as the
 * agreed price and open the 24h pay window. Buyer is the actor → no email.
 */
export async function acceptCounterAction(input: {
  offerId: string;
}): Promise<OfferActionResult> {
  const user = await requireUser();

  const parsed = offerIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const db = createAdminClient();
  const offer = await loadOffer(db, parsed.data.offerId);
  if (!offer || offer.buyer_id !== user.id) {
    return { ok: false, error: "Offer not found." };
  }
  if (offer.state !== "countered" || offer.counter_amount_cents == null) {
    return { ok: false, error: "There's no counter to accept on this offer." };
  }
  if (isExpired(offer)) {
    return { ok: false, error: "This counter has expired." };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("offers")
    .update({
      state: "accepted" as OfferState,
      agreed_amount_cents: offer.counter_amount_cents,
      pay_deadline_at: payWindowEndsAt(nowIso).toISOString(),
      decided_at: nowIso,
    })
    .eq("id", offer.id)
    .eq("state", "countered")
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "Could not accept the counter. Please try again." };
  }

  revalidateOfferSurfaces(offer.listing_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// SELLER: accept a pending offer
// ---------------------------------------------------------------------------

/**
 * The seller accepts the buyer's pending offer: freeze the offered amount as the
 * agreed price and open the buyer's 24h pay window. Listing is NOT reserved by
 * status — others may still buy at full price until the buyer pays.
 */
export async function acceptOfferAction(input: {
  offerId: string;
}): Promise<OfferActionResult> {
  const user = await requireUser();

  const parsed = offerIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const db = createAdminClient();
  const offer = await loadOffer(db, parsed.data.offerId);
  if (!offer || offer.seller_id !== user.id) {
    return { ok: false, error: "Offer not found." };
  }
  if (offer.state !== "pending") {
    return { ok: false, error: "This offer can no longer be accepted." };
  }
  if (isExpired(offer)) {
    return { ok: false, error: "This offer has expired." };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("offers")
    .update({
      state: "accepted" as OfferState,
      agreed_amount_cents: offer.amount_cents,
      pay_deadline_at: payWindowEndsAt(nowIso).toISOString(),
      decided_at: nowIso,
    })
    .eq("id", offer.id)
    .eq("state", "pending")
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "Could not accept the offer. Please try again." };
  }

  // Notify the buyer to pay within 24h (best-effort).
  await notifyBuyerOnOfferOutcome(db, offer, "accepted");

  revalidateOfferSurfaces(offer.listing_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// SELLER: counter a pending offer
// ---------------------------------------------------------------------------

/**
 * The seller counters a pending offer with their own ask: a counter is a seller
 * ask (not floor-bound) but capped at the list price, must differ from the
 * buyer's amount, and resets the 48h response window.
 */
export async function counterOfferAction(input: {
  offerId: string;
  counterCents: number;
}): Promise<OfferActionResult> {
  const user = await requireUser();

  const parsed = counterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid counter." };
  }
  const { offerId, counterCents } = parsed.data;

  const db = createAdminClient();
  const offer = await loadOffer(db, offerId);
  if (!offer || offer.seller_id !== user.id) {
    return { ok: false, error: "Offer not found." };
  }
  if (offer.state !== "pending") {
    return { ok: false, error: "This offer can no longer be countered." };
  }
  if (isExpired(offer)) {
    return { ok: false, error: "This offer has expired." };
  }
  if (counterCents === offer.amount_cents) {
    return { ok: false, error: "Your counter must differ from the buyer's offer." };
  }

  // Cap at the list price (a counter is an ask, not above the sticker).
  const { data: listing } = await db
    .from("listings")
    .select("brand, title, price_cents")
    .eq("id", offer.listing_id)
    .maybeSingle();
  if (!listing) return { ok: false, error: "This piece is no longer available." };
  if (counterCents > listing.price_cents) {
    return { ok: false, error: "A counter can't be more than the list price." };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("offers")
    .update({
      state: "countered" as OfferState,
      counter_amount_cents: counterCents,
      countered_at: nowIso,
      expires_at: offerExpiresAt(nowIso).toISOString(),
    })
    .eq("id", offer.id)
    .eq("state", "pending")
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "Could not send the counter. Please try again." };
  }

  // Notify the buyer of the counter (best-effort).
  const { data: buyer } = await db
    .from("users")
    .select("email")
    .eq("id", offer.buyer_id)
    .maybeSingle();
  if (buyer?.email) {
    await tryEmail(
      buyer.email,
      `Seller countered — ${listing.brand} ${listing.title}`,
      offerCounteredBuyerEmail({
        brand: listing.brand,
        title: listing.title,
        counterAmountCents: counterCents,
        offerUrl: `${env.NEXT_PUBLIC_SITE_URL}/buyer/offers`,
      }),
      "offer-countered buyer",
    );
  }

  revalidateOfferSurfaces(offer.listing_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// SELLER: decline an offer
// ---------------------------------------------------------------------------

/** The seller declines a still-open (pending/countered, unexpired) offer. */
export async function declineOfferAction(input: {
  offerId: string;
}): Promise<OfferActionResult> {
  const user = await requireUser();

  const parsed = offerIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const db = createAdminClient();
  const offer = await loadOffer(db, parsed.data.offerId);
  if (!offer || offer.seller_id !== user.id) {
    return { ok: false, error: "Offer not found." };
  }
  if (offer.state !== "pending" && offer.state !== "countered") {
    return { ok: false, error: "This offer can no longer be declined." };
  }
  if (isExpired(offer)) {
    return { ok: false, error: "This offer has already expired." };
  }

  const { data, error } = await db
    .from("offers")
    .update({ state: "declined" as OfferState, decided_at: new Date().toISOString() })
    .eq("id", offer.id)
    .eq("state", offer.state) // optimistic concurrency from the state we read
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "Could not decline the offer. Please try again." };
  }

  // Notify the buyer (best-effort).
  await notifyBuyerOnOfferOutcome(db, offer, "declined");

  revalidateOfferSurfaces(offer.listing_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Shared buyer-outcome email (accepted / declined) — best-effort.
// ---------------------------------------------------------------------------

async function notifyBuyerOnOfferOutcome(
  db: ReturnType<typeof createAdminClient>,
  offer: Offer,
  outcome: "accepted" | "declined",
): Promise<void> {
  const [{ data: buyer }, { data: listing }] = await Promise.all([
    db.from("users").select("email").eq("id", offer.buyer_id).maybeSingle(),
    db
      .from("listings")
      .select("brand, title")
      .eq("id", offer.listing_id)
      .maybeSingle(),
  ]);
  if (!buyer?.email || !listing) return;

  if (outcome === "accepted") {
    await tryEmail(
      buyer.email,
      `Offer accepted — ${listing.brand} ${listing.title}`,
      offerAcceptedBuyerEmail({
        brand: listing.brand,
        title: listing.title,
        agreedAmountCents: offer.amount_cents,
        payUrl: `${env.NEXT_PUBLIC_SITE_URL}/checkout/${offer.listing_id}?offer=${offer.id}`,
      }),
      "offer-accepted buyer",
    );
  } else {
    await tryEmail(
      buyer.email,
      `Offer outcome — ${listing.brand} ${listing.title}`,
      offerDeclinedBuyerEmail({
        brand: listing.brand,
        title: listing.title,
        offerUrl: `${env.NEXT_PUBLIC_SITE_URL}/listing/${offer.listing_id}`,
      }),
      "offer-declined buyer",
    );
  }
}

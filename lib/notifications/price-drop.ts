import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import { priceDropBuyerEmail } from "@/lib/email/notification-templates";
import { formatZar } from "@/lib/money";
import { env } from "@/lib/env";

/**
 * Notify every buyer who has saved a listing that its price has DROPPED: an
 * in-platform notification row + a best-effort Resend email. Called from the
 * price-edit hooks (seller updateListingPriceAction, admin setListingPriceAction)
 * server-side; uses the service-role client to read saved_listings across all
 * buyers (owner-scoped RLS would otherwise hide other buyers' saves) and to write
 * notifications. Mirrors notifyWishlistMatches in lib/wishlist/match.ts.
 *
 * Guard: a genuine decrease only — returns immediately if newCents >= oldCents.
 * Never alerts the seller about their own listing.
 */
export async function notifyPriceDrop(
  listingId: string,
  oldCents: number,
  newCents: number,
): Promise<void> {
  // Only genuine decreases warrant an alert.
  if (newCents >= oldCents) return;

  const db = createAdminClient();

  const { data: listing } = await db
    .from("listings")
    .select("id, brand, title, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return;

  // Buyers who have this listing saved (favourites). Service-role read bypasses
  // the owner-scoped saved_listings RLS so we see every buyer, not just one.
  const { data: saves } = await db
    .from("saved_listings")
    .select("buyer_id")
    .eq("listing_id", listing.id);
  if (!saves || saves.length === 0) return;

  // Unique buyer ids, never the seller themselves.
  const buyerIds = [
    ...new Set(
      saves
        .map((s) => s.buyer_id)
        .filter((id) => id !== listing.seller_id),
    ),
  ];
  if (buyerIds.length === 0) return;

  const listingUrl = `${env.NEXT_PUBLIC_SITE_URL}/listing/${listing.id}`;
  const notifTitle = `Price drop on ${listing.brand}`;
  const notifBody = `${listing.title} — was ${formatZar(oldCents)}, now ${formatZar(newCents)}`;

  // In-platform notifications (bulk insert).
  await db.from("notifications").insert(
    buyerIds.map((uid) => ({
      user_id: uid,
      type: "price_drop",
      title: notifTitle,
      body: notifBody,
      link: `/listing/${listing.id}`,
      read: false,
    })),
  );

  // Emails (best-effort per buyer).
  const { data: users } = await db
    .from("users")
    .select("id, email")
    .in("id", buyerIds);

  for (const u of users ?? []) {
    if (!u.email) continue;
    try {
      await sendEmail({
        to: u.email,
        subject: notifTitle,
        html: priceDropBuyerEmail({
          title: listing.title,
          brand: listing.brand,
          oldCents,
          newCents,
          listingUrl,
        }),
      });
    } catch (err) {
      console.error("price-drop email failed", u.id, err);
    }
  }
}

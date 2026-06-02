import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import { wishlistAlertBuyerEmail } from "@/lib/email/templates";
import { formatZar } from "@/lib/money";
import { env } from "@/lib/env";
import type { Wishlist } from "@/lib/supabase/database.types";

/** Does a wishlist match this listing? brand/category/keywords/price all narrow. */
function matches(
  w: Wishlist,
  listing: {
    brand: string;
    category: string;
    title: string;
    description: string | null;
    price_cents: number;
  },
): boolean {
  // A wishlist with no brand/category/keywords would match everything — never
  // alert on it (defends against any all-null row slipping past validation).
  if (!w.brand && !w.category && !w.keywords) return false;
  if (w.brand && w.brand.toLowerCase() !== listing.brand.toLowerCase()) {
    return false;
  }
  if (w.category && w.category !== listing.category) return false;
  if (w.max_price_cents != null && listing.price_cents > w.max_price_cents) {
    return false;
  }
  if (w.keywords) {
    const haystack =
      `${listing.title} ${listing.brand} ${listing.description ?? ""}`.toLowerCase();
    const tokens = w.keywords
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    // Every keyword token must appear (precise — luxury buyers don't want spam).
    if (!tokens.every((t) => haystack.includes(t))) return false;
  }
  return true;
}

/**
 * Notify buyers whose wishlists match a newly-active listing: an in-platform
 * notification row + a Resend email. Called from the admin approve action
 * (which runs server-side); uses the service-role client to read across all
 * buyers' wishlists and write notifications.
 *
 * Note: this scans all wishlists in memory — fine at current scale; revisit with
 * SQL pre-filtering / a queue if wishlist volume grows large.
 */
export async function notifyWishlistMatches(listingId: string): Promise<void> {
  const db = createAdminClient();

  const { data: listing } = await db
    .from("listings")
    .select("id, brand, category, title, description, price_cents, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.status !== "active") return;

  const { data: wishlists } = await db.from("wishlists").select("*");
  if (!wishlists || wishlists.length === 0) return;

  // Unique matching buyer ids (a buyer may have several matching wishlists).
  const matchedBuyerIds = new Set<string>();
  for (const w of wishlists) {
    if (w.buyer_id === listing.seller_id) continue; // never alert the seller
    if (matches(w, listing)) matchedBuyerIds.add(w.buyer_id);
  }
  if (matchedBuyerIds.size === 0) return;

  const buyerIds = [...matchedBuyerIds];
  const listingUrl = `${env.NEXT_PUBLIC_SITE_URL}/listing/${listing.id}`;
  const notifTitle = `New ${listing.brand} matching your wishlist`;
  const notifBody = `${listing.title} — ${formatZar(listing.price_cents)}`;

  // In-platform notifications (bulk insert).
  await db.from("notifications").insert(
    buyerIds.map((uid) => ({
      user_id: uid,
      type: "wishlist_match",
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
        html: wishlistAlertBuyerEmail({
          title: listing.title,
          brand: listing.brand,
          priceCents: listing.price_cents,
          listingUrl,
        }),
      });
    } catch (err) {
      console.error("wishlist alert email failed", u.id, err);
    }
  }
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import { brandFollowBuyerEmail } from "@/lib/email/notification-templates";
import { formatZar } from "@/lib/money";
import { env } from "@/lib/env";

/**
 * Notify every buyer who follows a brand that a NEW piece by it has gone live:
 * an in-platform notification row + a best-effort Resend email. Called from the
 * admin approve action (alongside notifyWishlistMatches) server-side; uses the
 * service-role client to read followed_brands across all buyers (owner-scoped
 * RLS would otherwise hide other buyers' follows) and to write notifications.
 * Mirrors notifyWishlistMatches in lib/wishlist/match.ts.
 *
 * Never alerts the seller about their own listing.
 */
export async function notifyBrandFollowers(listingId: string): Promise<void> {
  const db = createAdminClient();

  const { data: listing } = await db
    .from("listings")
    .select("id, brand, title, price_cents, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();
  // Only fan out when the piece is genuinely live.
  if (!listing || listing.status !== "active") return;

  // Buyers following this brand. Service-role read bypasses the owner-scoped
  // followed_brands RLS so we see every follower, not just one.
  const { data: follows } = await db
    .from("followed_brands")
    .select("buyer_id")
    .eq("brand", listing.brand);
  if (!follows || follows.length === 0) return;

  // Unique follower ids, never the seller themselves.
  const buyerIds = [
    ...new Set(
      follows
        .map((f) => f.buyer_id)
        .filter((id) => id !== listing.seller_id),
    ),
  ];
  if (buyerIds.length === 0) return;

  const listingUrl = `${env.NEXT_PUBLIC_SITE_URL}/listing/${listing.id}`;
  const notifTitle = `New ${listing.brand} just listed`;
  const notifBody = `${listing.title} — ${formatZar(listing.price_cents)}`;

  // In-platform notifications (bulk insert).
  await db.from("notifications").insert(
    buyerIds.map((uid) => ({
      user_id: uid,
      type: "brand_follow",
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
        html: brandFollowBuyerEmail({
          title: listing.title,
          brand: listing.brand,
          priceCents: listing.price_cents,
          listingUrl,
        }),
      });
    } catch (err) {
      console.error("brand-follow email failed", u.id, err);
    }
  }
}

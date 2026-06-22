import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AuthSubmission,
  ListingStatus,
  OrderStatus,
  SubscriptionTier,
} from "@/lib/supabase/database.types";

export interface SellerListingRow {
  id: string;
  title: string;
  brand: string;
  status: ListingStatus;
  priceCents: number;
  feeRateBps: number;
  createdAt: string;
  imageUrl: string | null;
  conditionNotes: string | null;
  measurements: string | null;
  inclusions: string[] | null;
}

export interface SellerSaleRow {
  orderId: string;
  createdAt: string;
  status: OrderStatus;
  itemBrand: string;
  itemTitle: string;
  grossCents: number;
  commissionCents: number;
  payoutCents: number;
  rating: number | null;
}

export interface SellerStats {
  activeListings: number;
  pendingSubmissions: number;
  itemsSold: number;
  grossSalesCents: number;
  netEarningsCents: number;
}

/** All of a seller's listings (any status) with a cover image. */
export async function getSellerListings(
  sellerId: string,
): Promise<SellerListingRow[]> {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  const rows = listings ?? [];
  const ids = rows.map((l) => l.id);
  const cover = new Map<string, string>();
  if (ids.length > 0) {
    const { data: images } = await supabase
      .from("listing_images")
      .select("listing_id, url, sort_order")
      .in("listing_id", ids)
      .order("sort_order", { ascending: true });
    (images ?? []).forEach((img) => {
      if (!cover.has(img.listing_id)) cover.set(img.listing_id, img.url);
    });
  }

  return rows.map((l) => ({
    id: l.id,
    title: l.title,
    brand: l.brand,
    status: l.status,
    priceCents: l.price_cents,
    feeRateBps: l.fee_rate_bps,
    createdAt: l.created_at,
    imageUrl: cover.get(l.id) ?? null,
    conditionNotes: l.condition_notes,
    measurements: l.measurements,
    inclusions: l.inclusions,
  }));
}

export async function getSellerSubmissions(
  sellerId: string,
): Promise<AuthSubmission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("auth_submissions")
    .select("*")
    .eq("seller_id", sellerId)
    .order("submitted_at", { ascending: false });
  return data ?? [];
}

/**
 * A seller's sales. Buyer identity is intentionally NOT included (discretion —
 * buyers are never shown to sellers). Ratings come from public reviews.
 */
export async function getSellerSales(sellerId: string): Promise<SellerSaleRow[]> {
  const supabase = await createClient();
  // Orders are read with the service-role client and only non-PII columns are
  // surfaced — sellers are deliberately blocked from reading buyer identity /
  // shipping via RLS. MUST only be called with the authenticated seller's own id.
  const db = createAdminClient();
  const { data: orders } = await db
    .from("orders")
    .select(
      "id, listing_id, created_at, status, gross_amount_cents, commission_amount_cents, seller_payout_amount_cents",
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  const rows = orders ?? [];
  if (rows.length === 0) return [];

  const listingIds = [...new Set(rows.map((o) => o.listing_id))];
  const orderIds = rows.map((o) => o.id);

  const [{ data: listings }, { data: reviews }] = await Promise.all([
    supabase.from("listings").select("id, brand, title").in("id", listingIds),
    supabase.from("reviews").select("order_id, rating").in("order_id", orderIds),
  ]);

  const listingById = new Map((listings ?? []).map((l) => [l.id, l]));
  const ratingByOrder = new Map((reviews ?? []).map((r) => [r.order_id, r.rating]));

  return rows.map((o) => ({
    orderId: o.id,
    createdAt: o.created_at,
    status: o.status,
    itemBrand: listingById.get(o.listing_id)?.brand ?? "—",
    itemTitle: listingById.get(o.listing_id)?.title ?? "Item",
    grossCents: o.gross_amount_cents,
    commissionCents: o.commission_amount_cents,
    payoutCents: o.seller_payout_amount_cents,
    rating: ratingByOrder.get(o.id) ?? null,
  }));
}

export async function getSellerStats(sellerId: string): Promise<SellerStats> {
  const supabase = await createClient();
  // Orders via service-role (sellers can't read orders through RLS); listings
  // and submissions via the seller's own RLS-bound client.
  const db = createAdminClient();
  const [{ data: listings }, { data: submissions }, { data: orders }] =
    await Promise.all([
      supabase.from("listings").select("status").eq("seller_id", sellerId),
      supabase
        .from("auth_submissions")
        .select("status")
        .eq("seller_id", sellerId),
      db
        .from("orders")
        .select("status, gross_amount_cents, seller_payout_amount_cents")
        .eq("seller_id", sellerId),
    ]);

  const activeListings = (listings ?? []).filter((l) => l.status === "active").length;
  const pendingSubmissions = (submissions ?? []).filter(
    (s) => s.status === "pending" || s.status === "more_info",
  ).length;
  const soldOrders = (orders ?? []).filter(
    (o) => o.status === "paid" || o.status === "delivered",
  );

  return {
    activeListings,
    pendingSubmissions,
    itemsSold: soldOrders.length,
    grossSalesCents: soldOrders.reduce((a, o) => a + o.gross_amount_cents, 0),
    netEarningsCents: soldOrders.reduce(
      (a, o) => a + o.seller_payout_amount_cents,
      0,
    ),
  };
}

export interface SellerSubscriptionInfo {
  tier: SubscriptionTier | null;
  status: string | null;
  currentPeriodEnd: string | null;
}

export async function getSellerSubscription(
  sellerId: string,
): Promise<SellerSubscriptionInfo> {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("seller_subscriptions")
    .select("tier_id, status, current_period_end")
    .eq("user_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.tier_id) {
    return { tier: null, status: null, currentPeriodEnd: null };
  }

  const { data: tier } = await supabase
    .from("subscription_tiers")
    .select("*")
    .eq("id", sub.tier_id)
    .maybeSingle();

  return {
    tier: tier ?? null,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
  };
}

export async function getActiveTiers(): Promise<SubscriptionTier[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_tiers")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

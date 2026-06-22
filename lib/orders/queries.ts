import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderStatus } from "@/lib/supabase/database.types";

export interface BuyerOrderDetail {
  order: Order;
  item: {
    listingId: string;
    brand: string;
    title: string;
    category: string;
    condition: string;
    imageUrl: string | null;
  };
  /**
   * ANON: buyer-facing seller identity is never exposed. Buyers see only the
   * "Verified Seller" / D&D authentication guarantee — no name, username,
   * rating or profile. Kept as an always-`null` field so existing buyer-order
   * consumers compile while the UI removes the now-dead "Sold by" surface.
   */
  sellerName: null;
}

/**
 * Fetch one order for the current buyer. Ownership is enforced by RLS (the user
 * client only returns the buyer's own orders); the listing is then loaded with
 * the admin client because a sold listing is no longer publicly readable.
 */
export async function getOrderForBuyer(
  orderId: string,
  buyerId: string,
): Promise<BuyerOrderDetail | null> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== buyerId) return null;

  const db = createAdminClient();
  const { data: listing } = await db
    .from("listings")
    .select("id, brand, title, category, condition")
    .eq("id", order.listing_id)
    .maybeSingle();

  const { data: image } = await db
    .from("listing_images")
    .select("url")
    .eq("listing_id", order.listing_id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  // ANON: no seller_public_profiles lookup — buyers never see seller identity.
  // The D&D authentication/evaluation guarantee carries trust instead.
  return {
    order,
    item: {
      listingId: order.listing_id,
      brand: listing?.brand ?? "—",
      title: listing?.title ?? "Item",
      category: listing?.category ?? "",
      condition: listing?.condition ?? "",
      imageUrl: image?.url ?? null,
    },
    sellerName: null,
  };
}

/** All orders for the current buyer (newest first) — used by the dashboard. */
export interface BuyerOrderRow {
  id: string;
  status: OrderStatus;
  grossCents: number;
  createdAt: string;
  brand: string;
  title: string;
  imageUrl: string | null;
}

export async function getBuyerOrders(buyerId: string): Promise<BuyerOrderRow[]> {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  const rows = orders ?? [];
  if (rows.length === 0) return [];

  const db = createAdminClient();
  const listingIds = [...new Set(rows.map((o) => o.listing_id))];
  const { data: listings } = await db
    .from("listings")
    .select("id, brand, title")
    .in("id", listingIds);
  const { data: images } = await db
    .from("listing_images")
    .select("listing_id, url, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  const listingById = new Map((listings ?? []).map((l) => [l.id, l]));
  const coverByListing = new Map<string, string>();
  (images ?? []).forEach((img) => {
    if (!coverByListing.has(img.listing_id))
      coverByListing.set(img.listing_id, img.url);
  });

  return rows.map((o) => ({
    id: o.id,
    status: o.status,
    grossCents: o.gross_amount_cents,
    createdAt: o.created_at,
    brand: listingById.get(o.listing_id)?.brand ?? "—",
    title: listingById.get(o.listing_id)?.title ?? "Item",
    imageUrl: coverByListing.get(o.listing_id) ?? null,
  }));
}

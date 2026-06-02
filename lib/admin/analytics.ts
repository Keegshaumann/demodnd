import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { categoryLabel } from "@/lib/marketplace/constants";

export interface DemandItem {
  label: string;
  count: number;
}

export interface AdminAnalytics {
  gmvAllCents: number;
  gmvMonthCents: number;
  commissionAllCents: number;
  commissionMonthCents: number;
  activeListings: number;
  pendingSubmissions: number;
  totalOrders: number;
  sellersCount: number;
  topBrands: DemandItem[];
  topCategories: DemandItem[];
}

/**
 * Platform analytics for the admin overview. GMV and commission count only
 * payable orders (paid/delivered) — refunded/disputed are excluded.
 * `monthStartIso` is passed in so the function stays deterministic/testable.
 */
export async function getAdminAnalytics(
  monthStartIso: string,
): Promise<AdminAnalytics> {
  const db = createAdminClient();

  const [
    ordersRes,
    activeListingsRes,
    pendingSubsRes,
    sellersRes,
    wishlistsRes,
  ] = await Promise.all([
    db
      .from("orders")
      .select("gross_amount_cents, commission_amount_cents, status, created_at")
      .in("status", ["paid", "delivered"]),
    db
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    db
      .from("auth_submissions")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "more_info"]),
    db
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "seller"),
    db.from("wishlists").select("brand, category"),
  ]);

  const orders = ordersRes.data ?? [];
  let gmvAll = 0;
  let gmvMonth = 0;
  let commAll = 0;
  let commMonth = 0;
  for (const o of orders) {
    gmvAll += o.gross_amount_cents;
    commAll += o.commission_amount_cents;
    if (o.created_at >= monthStartIso) {
      gmvMonth += o.gross_amount_cents;
      commMonth += o.commission_amount_cents;
    }
  }

  // Wishlist demand — tally non-null brands and categories.
  const brandTally = new Map<string, number>();
  const catTally = new Map<string, number>();
  for (const w of wishlistsRes.data ?? []) {
    if (w.brand) brandTally.set(w.brand, (brandTally.get(w.brand) ?? 0) + 1);
    if (w.category)
      catTally.set(w.category, (catTally.get(w.category) ?? 0) + 1);
  }
  const topBrands: DemandItem[] = [...brandTally.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const topCategories: DemandItem[] = [...catTally.entries()]
    .map(([value, count]) => ({ label: categoryLabel(value), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    gmvAllCents: gmvAll,
    gmvMonthCents: gmvMonth,
    commissionAllCents: commAll,
    commissionMonthCents: commMonth,
    activeListings: activeListingsRes.count ?? 0,
    pendingSubmissions: pendingSubsRes.count ?? 0,
    totalOrders: orders.length,
    sellersCount: sellersRes.count ?? 0,
    topBrands,
    topCategories,
  };
}

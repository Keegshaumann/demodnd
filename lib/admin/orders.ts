import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/supabase/database.types";

export interface LedgerRow {
  id: string;
  createdAt: string;
  status: OrderStatus;
  itemBrand: string;
  itemTitle: string;
  buyerEmail: string;
  sellerName: string;
  sellerEmail: string;
  bank: {
    name: string | null;
    accountNumber: string | null;
    branchCode: string | null;
    accountHolder: string | null;
  };
  grossCents: number;
  commissionCents: number;
  payoutCents: number;
}

export interface LedgerTotals {
  count: number;
  grossCents: number;
  commissionCents: number;
  payoutCents: number;
}

export interface LedgerFilters {
  status?: OrderStatus | "all";
  dateFrom?: string;
  dateTo?: string;
  seller?: string;
}

/**
 * Admin sales ledger: every order with gross, commission earned, and the seller
 * payout amount + banking details for D&D's offline EFT. Admin-only data,
 * fetched with the service-role client (the page is behind requireRole('admin')).
 */
export async function getSalesLedger(
  filters: LedgerFilters = {},
): Promise<{ rows: LedgerRow[]; totals: LedgerTotals }> {
  const db = createAdminClient();

  let query = db.from("orders").select("*").order("created_at", {
    ascending: false,
  });
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);

  const { data: orders, error } = await query;
  // Throw on a real DB error so the ledger doesn't silently render R0 totals.
  if (error) throw new Error(`getSalesLedger: ${error.message}`);
  const rowsRaw = orders ?? [];

  const listingIds = [...new Set(rowsRaw.map((o) => o.listing_id))];
  const userIds = [
    ...new Set(rowsRaw.flatMap((o) => [o.buyer_id, o.seller_id])),
  ];
  const sellerIds = [...new Set(rowsRaw.map((o) => o.seller_id))];

  const [listingsRes, usersRes, profilesRes] = await Promise.all([
    listingIds.length
      ? db.from("listings").select("id, brand, title").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; brand: string; title: string }[] }),
    userIds.length
      ? db.from("users").select("id, email, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string; full_name: string | null }[] }),
    sellerIds.length
      ? db
          .from("seller_profiles")
          .select(
            "user_id, display_name, bank_name, bank_account_number, bank_branch_code, bank_account_holder",
          )
          .in("user_id", sellerIds)
      : Promise.resolve({
          data: [] as {
            user_id: string;
            display_name: string | null;
            bank_name: string | null;
            bank_account_number: string | null;
            bank_branch_code: string | null;
            bank_account_holder: string | null;
          }[],
        }),
  ]);

  const listingById = new Map((listingsRes.data ?? []).map((l) => [l.id, l]));
  const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p]),
  );

  let rows: LedgerRow[] = rowsRaw.map((o) => {
    const listing = listingById.get(o.listing_id);
    const buyer = userById.get(o.buyer_id);
    const seller = userById.get(o.seller_id);
    const profile = profileById.get(o.seller_id);
    return {
      id: o.id,
      createdAt: o.created_at,
      status: o.status,
      itemBrand: listing?.brand ?? "—",
      itemTitle: listing?.title ?? "Item",
      buyerEmail: buyer?.email ?? "—",
      sellerName: profile?.display_name ?? seller?.full_name ?? seller?.email ?? "—",
      sellerEmail: seller?.email ?? "—",
      bank: {
        name: profile?.bank_name ?? null,
        accountNumber: profile?.bank_account_number ?? null,
        branchCode: profile?.bank_branch_code ?? null,
        accountHolder: profile?.bank_account_holder ?? null,
      },
      grossCents: o.gross_amount_cents,
      commissionCents: o.commission_amount_cents,
      payoutCents: o.seller_payout_amount_cents,
    };
  });

  if (filters.seller) {
    const needle = filters.seller.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.sellerName.toLowerCase().includes(needle) ||
        r.sellerEmail.toLowerCase().includes(needle),
    );
  }

  // Money totals reflect only payable orders (paid/delivered). Refunded and
  // disputed orders are reversed/withheld and must not inflate commission
  // earned or the seller payout due that drives D&D's offline EFT.
  const totals = rows.reduce<LedgerTotals>(
    (acc, r) => {
      const payable = r.status === "paid" || r.status === "delivered";
      return {
        count: acc.count + 1,
        grossCents: acc.grossCents + (payable ? r.grossCents : 0),
        commissionCents: acc.commissionCents + (payable ? r.commissionCents : 0),
        payoutCents: acc.payoutCents + (payable ? r.payoutCents : 0),
      };
    },
    { count: 0, grossCents: 0, commissionCents: 0, payoutCents: 0 },
  );

  return { rows, totals };
}

export interface OrderDetailRow {
  id: string;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  grossCents: number;
  commissionCents: number;
  payoutCents: number;
  feeRateBps: number;
  shippingName: string | null;
  shippingAddress: string | null;
  listingId: string;
  itemBrand: string;
  itemTitle: string;
  buyerEmail: string;
  buyerName: string | null;
  sellerName: string;
  sellerEmail: string;
  bank: {
    name: string | null;
    accountNumber: string | null;
    branchCode: string | null;
    accountHolder: string | null;
  };
}

/** One order with full detail for the admin order page. Admin-only (page gated). */
export async function getOrderDetail(
  orderId: string,
): Promise<OrderDetailRow | null> {
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  const [listingRes, usersRes, profileRes] = await Promise.all([
    db
      .from("listings")
      .select("id, brand, title")
      .eq("id", order.listing_id)
      .maybeSingle(),
    db
      .from("users")
      .select("id, email, full_name")
      .in("id", [order.buyer_id, order.seller_id]),
    db
      .from("seller_profiles")
      .select(
        "display_name, bank_name, bank_account_number, bank_branch_code, bank_account_holder",
      )
      .eq("user_id", order.seller_id)
      .maybeSingle(),
  ]);
  const listing = listingRes.data;
  const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const buyer = userById.get(order.buyer_id);
  const seller = userById.get(order.seller_id);
  const profile = profileRes.data;

  return {
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    deliveredAt: order.delivered_at,
    grossCents: order.gross_amount_cents,
    commissionCents: order.commission_amount_cents,
    payoutCents: order.seller_payout_amount_cents,
    feeRateBps: order.fee_rate_bps,
    shippingName: order.shipping_name,
    shippingAddress: order.shipping_address,
    listingId: order.listing_id,
    itemBrand: listing?.brand ?? "—",
    itemTitle: listing?.title ?? "Item",
    buyerEmail: buyer?.email ?? "—",
    buyerName: buyer?.full_name ?? null,
    sellerName: profile?.display_name ?? seller?.full_name ?? seller?.email ?? "—",
    sellerEmail: seller?.email ?? "—",
    bank: {
      name: profile?.bank_name ?? null,
      accountNumber: profile?.bank_account_number ?? null,
      branchCode: profile?.bank_branch_code ?? null,
      accountHolder: profile?.bank_account_holder ?? null,
    },
  };
}

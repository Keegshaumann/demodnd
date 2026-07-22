"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CashOutStatus, ListingStatus } from "@/lib/supabase/database.types";

export type AdminCashOutActionResult = { ok: true } | { ok: false; error: string };

export interface AdminCashOutRow {
  id: string;
  listingId: string;
  status: CashOutStatus;
  createdAt: string;
  handledAt: string | null;
  itemBrand: string;
  itemTitle: string;
  listPriceCents: number;
  listingStatus: ListingStatus | null;
  sellerEmail: string;
  sellerName: string | null;
}

/**
 * All cash-out requests with their listing + seller context. Admin-only; uses
 * the service-role client and the same manual id-batched joins as the disputes
 * queue (sellers/listings aren't publicly joinable here).
 */
export async function getCashOutRequests(): Promise<{
  open: AdminCashOutRow[];
  handled: AdminCashOutRow[];
}> {
  await requireRole("admin");
  const db = createAdminClient();

  const { data: requests, error } = await db
    .from("cash_out_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getCashOutRequests: ${error.message}`);
  const list = requests ?? [];
  if (list.length === 0) return { open: [], handled: [] };

  const listingIds = [...new Set(list.map((r) => r.listing_id))];
  const sellerIds = [...new Set(list.map((r) => r.seller_id))];

  const [listingsRes, sellersRes] = await Promise.all([
    listingIds.length
      ? db
          .from("listings")
          .select("id, brand, title, price_cents, status")
          .in("id", listingIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            brand: string;
            title: string;
            price_cents: number;
            status: ListingStatus;
          }[],
        }),
    sellerIds.length
      ? db.from("users").select("id, email, full_name").in("id", sellerIds)
      : Promise.resolve({
          data: [] as { id: string; email: string; full_name: string | null }[],
        }),
  ]);
  const listingById = new Map((listingsRes.data ?? []).map((l) => [l.id, l]));
  const sellerById = new Map((sellersRes.data ?? []).map((u) => [u.id, u]));

  const rows: AdminCashOutRow[] = list.map((r) => {
    const l = listingById.get(r.listing_id);
    const s = sellerById.get(r.seller_id);
    return {
      id: r.id,
      listingId: r.listing_id,
      status: r.status,
      createdAt: r.created_at,
      handledAt: r.handled_at,
      itemBrand: l?.brand ?? "—",
      itemTitle: l?.title ?? "Item",
      listPriceCents: l?.price_cents ?? 0,
      listingStatus: l?.status ?? null,
      sellerEmail: s?.email ?? "—",
      sellerName: s?.full_name ?? null,
    };
  });

  return {
    open: rows.filter((r) => r.status === "open"),
    handled: rows.filter((r) => r.status !== "open"),
  };
}

/**
 * Advance a cash-out request's workflow state (open → contacted → closed).
 * Admin-only; records who handled it and when. No money moves — this is queue
 * bookkeeping so D&D can track which sellers have been contacted.
 */
export async function setCashOutStatusAction(
  id: string,
  status: "contacted" | "closed",
): Promise<AdminCashOutActionResult> {
  const admin = await requireRole("admin");
  if (status !== "contacted" && status !== "closed") {
    return { ok: false, error: "Invalid status." };
  }

  const db = createAdminClient();
  const { data: existing } = await db
    .from("cash_out_requests")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Request not found." };

  const { error } = await db
    .from("cash_out_requests")
    .update({
      status,
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Could not update the request." };

  revalidatePath("/admin/cash-outs");
  return { ok: true };
}

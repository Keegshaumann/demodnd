"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DisputeStatus, OrderStatus } from "@/lib/supabase/database.types";

export type AdminDisputeActionResult = { ok: true } | { ok: false; error: string };

export interface AdminDisputeRow {
  id: string;
  orderId: string;
  status: DisputeStatus;
  reason: string;
  resolution: string | null;
  raisedAt: string;
  resolvedAt: string | null;
  raisedByEmail: string;
  raisedByRole: string;
  itemBrand: string;
  itemTitle: string;
  buyerEmail: string;
  grossCents: number;
  orderStatus: OrderStatus | null;
}

/**
 * All disputes (open + resolved) with their order context. Admin-only; uses the
 * service-role client and the same manual id-batched joins as the sales ledger.
 */
export async function getDisputes(): Promise<{
  open: AdminDisputeRow[];
  resolved: AdminDisputeRow[];
}> {
  await requireRole("admin");
  const db = createAdminClient();

  const { data: disputes } = await db
    .from("disputes")
    .select("*")
    .order("created_at", { ascending: false });
  const list = disputes ?? [];
  if (list.length === 0) return { open: [], resolved: [] };

  const orderIds = [...new Set(list.map((d) => d.order_id))];
  const raiserIds = [...new Set(list.map((d) => d.raised_by))];

  const [ordersRes, raisersRes] = await Promise.all([
    orderIds.length
      ? db
          .from("orders")
          .select("id, listing_id, buyer_id, gross_amount_cents, status")
          .in("id", orderIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            listing_id: string;
            buyer_id: string;
            gross_amount_cents: number;
            status: OrderStatus;
          }[],
        }),
    raiserIds.length
      ? db.from("users").select("id, email, role").in("id", raiserIds)
      : Promise.resolve({
          data: [] as { id: string; email: string; role: string }[],
        }),
  ]);
  const orders = ordersRes.data ?? [];
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const raiserById = new Map((raisersRes.data ?? []).map((u) => [u.id, u]));

  const listingIds = [...new Set(orders.map((o) => o.listing_id))];
  const buyerIds = [...new Set(orders.map((o) => o.buyer_id))];
  const [listingsRes, buyersRes] = await Promise.all([
    listingIds.length
      ? db.from("listings").select("id, brand, title").in("id", listingIds)
      : Promise.resolve({
          data: [] as { id: string; brand: string; title: string }[],
        }),
    buyerIds.length
      ? db.from("users").select("id, email").in("id", buyerIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
  ]);
  const listingById = new Map((listingsRes.data ?? []).map((l) => [l.id, l]));
  const buyerById = new Map((buyersRes.data ?? []).map((u) => [u.id, u]));

  const rows: AdminDisputeRow[] = list.map((d) => {
    const order = orderById.get(d.order_id);
    const listing = order ? listingById.get(order.listing_id) : undefined;
    const raiser = raiserById.get(d.raised_by);
    return {
      id: d.id,
      orderId: d.order_id,
      status: d.status,
      reason: d.reason,
      resolution: d.resolution,
      raisedAt: d.created_at,
      resolvedAt: d.resolved_at,
      raisedByEmail: raiser?.email ?? "—",
      raisedByRole: raiser?.role ?? "—",
      itemBrand: listing?.brand ?? "—",
      itemTitle: listing?.title ?? "Item",
      buyerEmail: order ? buyerById.get(order.buyer_id)?.email ?? "—" : "—",
      grossCents: order?.gross_amount_cents ?? 0,
      orderStatus: order?.status ?? null,
    };
  });

  return {
    open: rows.filter((r) => r.status === "open"),
    resolved: rows.filter((r) => r.status === "resolved"),
  };
}

/**
 * Record an admin's resolution for a dispute. This logs the DECISION only —
 * the actual refund (money movement via Stripe) is handled separately and is
 * deferred until Stripe is live.
 */
export async function resolveDisputeAction(
  disputeId: string,
  resolution: string,
): Promise<AdminDisputeActionResult> {
  await requireRole("admin");
  const note = resolution.trim();
  if (!note) return { ok: false, error: "Add a resolution note before resolving." };
  if (note.length > 2000) return { ok: false, error: "Resolution note is too long." };

  const db = createAdminClient();
  const { data: existing } = await db
    .from("disputes")
    .select("status")
    .eq("id", disputeId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Dispute not found." };
  if (existing.status === "resolved") {
    return { ok: false, error: "This dispute is already resolved." };
  }

  const { error } = await db
    .from("disputes")
    .update({
      status: "resolved",
      resolution: note,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);
  if (error) return { ok: false, error: "Could not resolve the dispute." };

  revalidatePath("/admin/disputes");
  return { ok: true };
}

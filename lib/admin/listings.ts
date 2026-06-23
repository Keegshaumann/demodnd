"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingStatus } from "@/lib/supabase/database.types";

export type AdminListingActionResult = { ok: true } | { ok: false; error: string };

export interface AdminListingFilters {
  q?: string;
  status?: ListingStatus | "all";
}

export interface AdminListingRow {
  id: string;
  title: string;
  brand: string;
  category: string;
  priceCents: number;
  retailPriceCents: number | null;
  status: ListingStatus;
  featured: boolean;
  createdAt: string;
  sellerName: string;
  sellerEmail: string;
  imageUrl: string | null;
}

/** Strip characters that would break a PostgREST `or` filter string. */
function sanitize(q: string): string {
  return q.replace(/[,()*%]/g, "").trim().slice(0, 80);
}

/** Every listing (any status, any seller) for admin oversight. Admin-only. */
export async function getAdminListings(
  filters: AdminListingFilters = {},
): Promise<AdminListingRow[]> {
  await requireRole("admin");
  const db = createAdminClient();

  let query = db
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.q) {
    const s = sanitize(filters.q);
    if (s) {
      query = query.or(`title.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%`);
    }
  }
  const { data: listings, error } = await query;
  // Throw on a real DB error so the admin route shows an error boundary rather
  // than a misleading empty catalogue.
  if (error) throw new Error(`getAdminListings: ${error.message}`);
  const list = listings ?? [];
  if (list.length === 0) return [];

  const sellerIds = [...new Set(list.map((l) => l.seller_id))];
  const listingIds = list.map((l) => l.id);
  const [usersRes, profilesRes, imagesRes] = await Promise.all([
    db.from("users").select("id, email, full_name").in("id", sellerIds),
    db
      .from("seller_profiles")
      .select("user_id, display_name")
      .in("user_id", sellerIds),
    db
      .from("listing_images")
      .select("listing_id, url, sort_order")
      .in("listing_id", listingIds)
      .order("sort_order", { ascending: true }),
  ]);
  const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p]),
  );
  const cover = new Map<string, string>();
  (imagesRes.data ?? []).forEach((img) => {
    if (!cover.has(img.listing_id)) cover.set(img.listing_id, img.url);
  });

  return list.map((l) => {
    const u = userById.get(l.seller_id);
    const p = profileById.get(l.seller_id);
    return {
      id: l.id,
      title: l.title,
      brand: l.brand,
      category: l.category,
      priceCents: l.price_cents,
      retailPriceCents: l.retail_price_cents,
      status: l.status,
      featured: l.featured,
      createdAt: l.created_at,
      sellerName: p?.display_name ?? u?.full_name ?? u?.email ?? "—",
      sellerEmail: u?.email ?? "—",
      imageUrl: cover.get(l.id) ?? null,
    };
  });
}

/** Read a listing's status, or null if missing. */
async function listingStatus(
  db: ReturnType<typeof createAdminClient>,
  listingId: string,
): Promise<ListingStatus | null> {
  const { data } = await db
    .from("listings")
    .select("status")
    .eq("id", listingId)
    .maybeSingle();
  return data?.status ?? null;
}

export async function delistListingAction(
  listingId: string,
): Promise<AdminListingActionResult> {
  await requireRole("admin");
  const db = createAdminClient();
  const status = await listingStatus(db, listingId);
  if (!status) return { ok: false, error: "Listing not found." };
  // A sold listing is settled — its status must never change.
  if (status === "sold") {
    return { ok: false, error: "You can't change a sold listing's status." };
  }
  const { error } = await db
    .from("listings")
    .update({ status: "delisted" })
    .eq("id", listingId);
  if (error) return { ok: false, error: "Could not delist the listing." };
  revalidatePath("/admin/listings");
  revalidatePath("/browse");
  return { ok: true };
}

export async function relistListingAction(
  listingId: string,
): Promise<AdminListingActionResult> {
  await requireRole("admin");
  const db = createAdminClient();
  const status = await listingStatus(db, listingId);
  if (!status) return { ok: false, error: "Listing not found." };
  if (status === "sold") {
    return { ok: false, error: "You can't change a sold listing's status." };
  }
  const { error } = await db
    .from("listings")
    .update({ status: "active" })
    .eq("id", listingId);
  if (error) return { ok: false, error: "Could not relist the listing." };
  revalidatePath("/admin/listings");
  revalidatePath("/browse");
  return { ok: true };
}

export async function setListingFeaturedAction(
  listingId: string,
  featured: boolean,
): Promise<AdminListingActionResult> {
  await requireRole("admin");
  const db = createAdminClient();
  const status = await listingStatus(db, listingId);
  if (!status) return { ok: false, error: "Listing not found." };
  // Featured pieces lead browse and the homepage, which only show active
  // stock — featuring anything else would be invisible, confusing state.
  // Unfeaturing is always allowed (cleanup of delisted/sold pieces).
  if (featured && status !== "active") {
    return { ok: false, error: "Only active listings can be featured." };
  }
  const { error } = await db
    .from("listings")
    .update({ featured })
    .eq("id", listingId);
  if (error) return { ok: false, error: "Could not update the listing." };
  revalidatePath("/admin/listings");
  revalidatePath("/browse");
  revalidatePath("/"); // homepage grid surfaces featured first
  return { ok: true };
}

export async function setListingPriceAction(
  listingId: string,
  priceCents: number,
): Promise<AdminListingActionResult> {
  await requireRole("admin");
  // Money is integer ZAR cents — never floats. Validate server-side.
  if (
    !Number.isInteger(priceCents) ||
    priceCents <= 0 ||
    priceCents > 10_000_000_000
  ) {
    return { ok: false, error: "Enter a valid price." };
  }
  const db = createAdminClient();
  // Capture status AND the pre-edit price so we can detect a genuine drop.
  const { data: existing } = await db
    .from("listings")
    .select("status, price_cents")
    .eq("id", listingId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Listing not found." };
  const oldCents = existing.price_cents;
  const { error } = await db
    .from("listings")
    .update({ price_cents: priceCents })
    .eq("id", listingId);
  if (error) return { ok: false, error: "Could not update the price." };

  // Price-drop alerts: notify buyers who saved this piece on a genuine decrease.
  // priceCents is already integer cents. Dynamic import keeps the server-only
  // notification module out of this action's static graph.
  if (priceCents < oldCents) {
    try {
      const { notifyPriceDrop } = await import("@/lib/notifications/price-drop");
      await notifyPriceDrop(listingId, oldCents, priceCents);
    } catch (err) {
      console.error("price-drop notify failed", err);
    }
  }

  revalidatePath("/admin/listings");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

/**
 * Set (or clear) a listing's original-retail anchor. Pass `null` to clear it.
 * Retail is optional whole ZAR cents — the resale anchor is only rendered when
 * it's present and higher than the asking price, so we don't gate on that here:
 * an admin may legitimately set a retail that is currently at/below asking.
 */
export async function setListingRetailAction(
  listingId: string,
  retailCents: number | null,
): Promise<AdminListingActionResult> {
  await requireRole("admin");
  // null clears the anchor; otherwise it must be valid integer ZAR cents.
  if (retailCents !== null) {
    if (
      !Number.isInteger(retailCents) ||
      retailCents <= 0 ||
      retailCents > 10_000_000_000
    ) {
      return { ok: false, error: "Enter a valid retail price." };
    }
  }
  const db = createAdminClient();
  const status = await listingStatus(db, listingId);
  if (!status) return { ok: false, error: "Listing not found." };
  const { error } = await db
    .from("listings")
    .update({ retail_price_cents: retailCents })
    .eq("id", listingId);
  if (error) return { ok: false, error: "Could not update the retail price." };
  revalidatePath("/admin/listings");
  revalidatePath("/browse");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

export async function deleteListingAction(
  listingId: string,
): Promise<AdminListingActionResult> {
  await requireRole("admin");
  const db = createAdminClient();
  // orders.listing_id is a NON-cascading FK (init.sql) — a listing with any
  // order can't be hard-deleted without orphaning the order. Block it cleanly;
  // the admin should delist instead.
  const { count } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "This listing has orders and can't be deleted — delist it instead.",
    };
  }
  const { error } = await db.from("listings").delete().eq("id", listingId);
  if (error) return { ok: false, error: "Could not delete the listing." };
  revalidatePath("/admin/listings");
  revalidatePath("/browse");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminReviewActionResult = { ok: true } | { ok: false; error: string };

export interface ReviewFilters {
  seller?: string;
}

export interface AdminReviewRow {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  sellerName: string;
  sellerEmail: string;
}

/** The 100 most recent reviews with their seller, for moderation. Admin-only. */
export async function getReviews(
  filters: ReviewFilters = {},
): Promise<AdminReviewRow[]> {
  await requireRole("admin");
  const db = createAdminClient();

  const { data: reviews } = await db
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const list = reviews ?? [];
  if (list.length === 0) return [];

  const sellerIds = [...new Set(list.map((r) => r.seller_id))];
  const [usersRes, profilesRes] = await Promise.all([
    sellerIds.length
      ? db.from("users").select("id, email, full_name").in("id", sellerIds)
      : Promise.resolve({
          data: [] as { id: string; email: string; full_name: string | null }[],
        }),
    sellerIds.length
      ? db
          .from("seller_profiles")
          .select("user_id, display_name")
          .in("user_id", sellerIds)
      : Promise.resolve({
          data: [] as { user_id: string; display_name: string | null }[],
        }),
  ]);
  const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p]),
  );

  let rows: AdminReviewRow[] = list.map((r) => {
    const u = userById.get(r.seller_id);
    const p = profileById.get(r.seller_id);
    return {
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.created_at,
      sellerName: p?.display_name ?? u?.full_name ?? u?.email ?? "—",
      sellerEmail: u?.email ?? "—",
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
  return rows;
}

/** Remove a review that violates the marketplace guidelines. Admin-only. */
export async function deleteReviewAction(
  reviewId: string,
): Promise<AdminReviewActionResult> {
  await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db.from("reviews").delete().eq("id", reviewId);
  if (error) return { ok: false, error: "Could not delete the review." };
  revalidatePath("/admin/reviews");
  return { ok: true };
}

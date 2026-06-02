import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthMethod } from "@/lib/supabase/database.types";

export interface SellerReviewItem {
  rating: number;
  body: string | null;
  createdAt: string;
}

/**
 * Recent reviews for a seller (public). Reviewer identity is intentionally
 * omitted — buyers are never named publicly.
 */
export async function getSellerReviews(
  sellerId: string,
  limit = 5,
): Promise<SellerReviewItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("rating, body, created_at")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    rating: r.rating,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export interface SellerReputation {
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  itemsListed: number;
  completedTransactions: number;
  memberSince: string | null;
  primaryAuthMethod: AuthMethod | null;
}

/**
 * Aggregate public reputation for a seller. Uses the service-role client because
 * order counts aren't readable under public RLS — but only ever returns
 * non-sensitive aggregates (never order rows or banking details).
 */
export async function getSellerReputation(
  sellerId: string,
): Promise<SellerReputation | null> {
  const db = createAdminClient();

  const { data: profile } = await db
    .from("seller_profiles")
    .select("username, display_name, bio, reputation_score, verified, created_at")
    .eq("user_id", sellerId)
    .maybeSingle();

  const [{ count: itemsListed }, { count: completedTransactions }, { count: reviewsCount }] =
    await Promise.all([
      db
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .eq("status", "active"),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["paid", "delivered"]),
      db
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId),
    ]);

  // Primary auth method = that of the most recent active listing.
  const { data: recent } = await db
    .from("listings")
    .select("auth_method")
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    userId: sellerId,
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    bio: profile?.bio ?? null,
    verified: profile?.verified ?? false,
    rating: profile?.reputation_score ?? 0,
    reviewsCount: reviewsCount ?? 0,
    itemsListed: itemsListed ?? 0,
    completedTransactions: completedTransactions ?? 0,
    memberSince: profile?.created_at ?? null,
    primaryAuthMethod: recent?.auth_method ?? null,
  };
}

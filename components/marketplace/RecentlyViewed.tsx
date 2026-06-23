"use client";

import { useEffect } from "react";
import { pushRecentlyViewed } from "@/lib/marketplace/recently-viewed";

/**
 * RECENTLY VIEWED writer (feature 9). A render-nothing client component mounted
 * on the listing detail page (lane G imports + mounts it). On mount it records
 * the current listing id at the front of the visitor's localStorage history so
 * the homepage "Recently viewed" rail can resurface it.
 *
 * Owned by lane E (the recently-viewed feature lane) so the storage key/shape
 * stays in one place; lane G only imports and mounts it on the PDP.
 *
 * StrictMode double-invokes effects in dev — harmless here because
 * pushRecentlyViewed dedupes (a second push of the same id is a no-op beyond
 * re-fronting it). No ref-guard needed.
 */
export function RecentlyViewed({ listingId }: { listingId: string }) {
  useEffect(() => {
    if (listingId) pushRecentlyViewed(listingId);
  }, [listingId]);

  return null;
}

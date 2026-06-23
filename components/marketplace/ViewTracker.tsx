"use client";

import { useEffect, useRef } from "react";
import { recordListingViewAction } from "@/lib/listings/views";

/**
 * Render-nothing PDP island that counts ONE view per real page load.
 *
 * The increment is deliberately client-side (not in the RSC render) so an RSC
 * prefetch or re-render can't inflate the counter — only a mounted browser load
 * bumps it. A ref guard makes it idempotent against React 18 StrictMode's dev
 * double-invoke (the underlying RPC is cheap, but counts should track real
 * loads). Errors are swallowed inside the action; a failed bump is invisible.
 */
export function ViewTracker({ listingId }: { listingId: string }) {
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    // Fire-and-forget; the action never throws to the visitor.
    void recordListingViewAction(listingId);
  }, [listingId]);

  return null;
}

"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveSearchAction } from "@/lib/buyer/save-search";
import type { AuthMethod } from "@/lib/supabase/database.types";
import { HeartIcon, CheckIcon } from "@/components/ui/icons";

const VALID_METHODS: AuthMethod[] = ["photo", "courier", "dropoff"];

/**
 * "Save this search" — a small results-header control that turns the buyer's
 * current browse filters into a sourcing alert (a wishlists row) via
 * saveSearchAction. Reads the live URL so it always saves exactly what's on
 * screen. Guests are routed to /signin (with a redirect back here); the action
 * itself enforces auth, this is purely the prompt.
 *
 * The button disables once saved (within this navigation) so a buyer can't pile
 * up duplicate alerts with repeated taps; the action also de-dupes server-side.
 */
export function SaveSearchButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only offer "save this search" when there's actually something to save —
  // a bare /browse with no filters would create a match-everything alert (which
  // the action rejects anyway). Mirror browse/page.tsx's param parsing.
  const q = searchParams.get("q")?.trim() ?? "";
  const brands = searchParams.getAll("brand").filter(Boolean);
  const categories = searchParams.getAll("category").filter(Boolean);
  const methods = searchParams
    .getAll("method")
    .filter((m): m is AuthMethod => VALID_METHODS.includes(m as AuthMethod));
  const minRaw = searchParams.get("min");
  const maxRaw = searchParams.get("max");
  const hasPrice = !!(minRaw || maxRaw);

  const hasFilters =
    !!q ||
    brands.length > 0 ||
    categories.length > 0 ||
    methods.length > 0 ||
    hasPrice;

  // Nothing to alert on — keep the header clean rather than show a dead control.
  if (!hasFilters) return null;

  function save() {
    setError(null);
    const maxRands = Number(maxRaw);
    const maxCents =
      Number.isFinite(maxRands) && maxRands > 0 ? Math.round(maxRands * 100) : null;
    startTransition(async () => {
      const res = await saveSearchAction({
        q: q || undefined,
        brands: brands.length ? brands : undefined,
        categories: categories.length ? categories : undefined,
        maxCents,
      });
      if (res.ok) {
        setSaved(true);
        return;
      }
      if (res.error === "signin") {
        const here =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/browse";
        router.push(`/signin?redirect=${encodeURIComponent(here)}`);
        return;
      }
      setError(res.error);
    });
  }

  if (saved) {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.16em] text-ink-muted">
        <CheckIcon width={14} height={14} className="text-gold" />
        Search saved
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-3.5 py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:border-gold disabled:opacity-50"
      >
        <HeartIcon width={14} height={14} className="text-ink-dim" />
        {pending ? "Saving…" : "Save this search"}
      </button>
      {error && (
        <span role="alert" className="text-[11px] text-[#e85d5d]">
          {error}
        </span>
      )}
    </div>
  );
}

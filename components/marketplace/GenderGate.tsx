"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GENDER_COOKIE, GENDER_OPTIONS } from "@/lib/marketplace/gender";

/**
 * First-open gender gate (Vestiaire-style). Sets the `dnd_gender` cookie the
 * homepage + browse read to scope the catalogue, then refreshes so the server
 * components re-query.
 *
 * ponytail: shows on EVERY load for now (test mode, as requested). To make it
 * first-visit only, seed `useState` from the cookie's absence — one line.
 */
export function GenderGate() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function choose(value: string) {
    document.cookie = `${GENDER_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose what you're shopping for"
      className="fixed inset-0 z-[200] flex items-center justify-center p-5"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className="relative w-full max-w-[540px] rounded-[4px] border border-border-soft bg-bg p-10 text-center shadow-2xl motion-safe:animate-fadeIn sm:p-12">
        <div className="mb-5 flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-ink-dim">
          <span className="h-px w-8 bg-border" />
          D&amp;D · All things luxury
        </div>
        <h2 className="font-serif" style={{ fontSize: "clamp(26px,3.2vw,38px)", lineHeight: 1.08 }}>
          Who are we shopping for?
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
          We&apos;ll tailor the collection to you. You can change it anytime.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4">
          {GENDER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              className="btn btn-outline btn-lg justify-center"
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => choose("all")}
          className="mt-6 text-[11.5px] uppercase tracking-[0.14em] text-ink-dim underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Just browsing — show everything
        </button>
      </div>
    </div>
  );
}

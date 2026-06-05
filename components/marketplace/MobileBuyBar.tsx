"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatZar } from "@/lib/money";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * Mobile-only sticky purchase bar. It mirrors the inline buy CTA and appears
 * only once that inline CTA has scrolled out of view, so the buyer always has a
 * way to act without two competing CTAs being visible at once.
 */
export function MobileBuyBar({
  priceCents,
  cta,
  watchSelector = "#buy-card",
}: {
  priceCents: number;
  cta: { label: string; href?: string; disabled?: boolean };
  watchSelector?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.querySelector(watchSelector);
    if (!target) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setShow(!entry.isIntersecting);
      },
      { rootMargin: "0px 0px -40% 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [watchSelector]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[120] border-t border-border bg-bg/95 backdrop-blur-xl transition-transform duration-300 ease-out-soft lg:hidden motion-reduce:transition-none ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!show}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-dim">
            Price
          </div>
          <div className="price text-[20px] leading-tight">
            {formatZar(priceCents)}
          </div>
        </div>
        {cta.disabled || !cta.href ? (
          <button
            type="button"
            disabled
            className="btn btn-primary"
            tabIndex={show ? 0 : -1}
          >
            {cta.label}
          </button>
        ) : (
          <Link
            href={cta.href}
            className="btn btn-primary"
            tabIndex={show ? 0 : -1}
          >
            {cta.label} <ArrowRightIcon width={16} height={16} />
          </Link>
        )}
      </div>
    </div>
  );
}

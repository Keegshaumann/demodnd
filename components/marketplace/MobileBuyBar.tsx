"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatZar } from "@/lib/money";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * Mobile-only sticky purchase bar. It mirrors the inline buy CTA and appears
 * only once that inline CTA has scrolled out of view, so the buyer always has a
 * way to act without two competing CTAs being visible at once. It slides away
 * again while the site footer is on screen so it never covers the footer's
 * bottom legal links.
 *
 * `secondary` is an optional ghost affordance shown beside the buy CTA — used by
 * the PDP to offer a "Make an offer" action to eligible buyers. It links back to
 * the buy-card / offer anchor on the page (the PDP lane owns the actual offer
 * trigger); when omitted the bar renders exactly as before.
 */
export function MobileBuyBar({
  priceCents,
  cta,
  secondary,
  watchSelector = "#buy-card",
}: {
  priceCents: number;
  cta: { label: string; href?: string; disabled?: boolean };
  secondary?: { label: string; href: string };
  watchSelector?: string;
}) {
  const [show, setShow] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

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

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) setFooterVisible(entry.isIntersecting);
    });
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  const visible = show && !footerVisible;

  // When a secondary action shares the row, both actions shrink to btn-sm and
  // trim their horizontal padding/tracking so the two CTAs plus the price block
  // fit the narrow mobile bar (~360px) without overflowing; with no secondary
  // the primary CTA keeps its original full-size appearance (zero regression to
  // the buy-only bar).
  const ctaClass = secondary
    ? "btn btn-primary btn-sm !px-3 !tracking-[0.12em] min-w-0"
    : "btn btn-primary";

  // The guest "Sign in to purchase" label is the longest case and is what tips
  // the row into overflow when the secondary action is present, so shorten it to
  // a buy-bar short form in that case only.
  const ctaLabel =
    secondary && cta.label === "Sign in to purchase" ? "Sign in" : cta.label;

  return (
    <div
      className={`fixed inset-x-0 bottom-[var(--cookie-banner-h,0px)] z-[120] border-t border-border bg-bg/95 backdrop-blur-xl transition-transform duration-300 ease-out-soft lg:hidden motion-reduce:transition-none ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <div className="min-w-0 max-w-[55%]">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-dim">
            Price
          </div>
          <div className="price truncate text-[20px] leading-tight">
            {formatZar(priceCents)}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          {secondary ? (
            <Link
              href={secondary.href}
              className="btn btn-outline btn-sm"
              tabIndex={visible ? 0 : -1}
            >
              {secondary.label}
            </Link>
          ) : null}
          {cta.disabled || !cta.href ? (
            <button
              type="button"
              disabled
              className={ctaClass}
              tabIndex={visible ? 0 : -1}
            >
              <span className="min-w-0 truncate">{ctaLabel}</span>
            </button>
          ) : (
            <Link
              href={cta.href}
              className={ctaClass}
              tabIndex={visible ? 0 : -1}
            >
              <span className="min-w-0 truncate">{ctaLabel}</span>{" "}
              <ArrowRightIcon
                width={16}
                height={16}
                className="flex-shrink-0"
              />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

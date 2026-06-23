"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatZar } from "@/lib/money";
import {
  brandedTitle,
  categoryLabel,
  processBadgeLabel,
} from "@/lib/marketplace/constants";
import {
  CertificateIcon,
  CloseIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";
import { FavouriteButton } from "@/components/marketplace/FavouriteButton";
import { useQuickView } from "@/components/marketplace/QuickViewProvider";

/**
 * Quick-view dialog — previews a listing from the browse grid WITHOUT
 * navigating. Reads the open target from {@link useQuickView}, so the page only
 * has to mount this once inside <QuickViewProvider>. Mirrors MakeOfferModal's
 * accessibility contract: backdrop + Escape close, body scroll-lock, focus moved
 * into the dialog and restored to the opener on close, role=dialog + aria-modal.
 *
 * Renders only what the card already carries (image, brand, title, price,
 * condition, category → Authenticated/Evaluated label, id → favourite + "View
 * piece" link). Monochrome editorial; rounded-[3px]; sheet-on-mobile so it never
 * overflows at 390px.
 */
export function QuickViewModal() {
  const ctx = useQuickView();
  const current = ctx?.current ?? null;
  const closeQuickView = ctx?.closeQuickView;

  const panelRef = useRef<HTMLDivElement | null>(null);
  // Remember the element that had focus when the modal opened, to restore it.
  const openerRef = useRef<HTMLElement | null>(null);

  const open = current !== null;

  useEffect(() => {
    if (!open || !closeQuickView) return;

    openerRef.current = (document.activeElement as HTMLElement) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog (the close button) for keyboard/AT users.
    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-quickview-initial-focus]")
        ?.focus();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeQuickView();
        return;
      }
      // Lightweight focus trap: keep Tab cycling inside the panel.
      if (e.key === "Tab") {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the card's Quick-view button.
      openerRef.current?.focus?.();
    };
  }, [open, closeQuickView]);

  if (!open || !current || !closeQuickView) return null;

  const { listing, isSaved } = current;
  const title = brandedTitle(listing);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickview-title"
      onMouseDown={(e) => {
        // Click on the backdrop (not the panel) closes.
        if (e.target === e.currentTarget) closeQuickView();
      }}
    >
      <div
        ref={panelRef}
        className="surface-card flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-b-none rounded-t-[14px] sm:max-h-[88vh] sm:flex-row sm:rounded-[3px]"
      >
        {/* Image — full-bleed top on mobile, left half on desktop. */}
        <div className="relative aspect-[4/5] w-full flex-shrink-0 overflow-hidden bg-deep sm:aspect-auto sm:w-[46%]">
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, 360px"
              className={`object-cover ${
                listing.status === "sold" ? "opacity-60 grayscale" : ""
              }`}
            />
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center text-ink-dim">
              <CertificateIcon width={34} height={34} />
            </div>
          )}

          <span className="pill pill-glass absolute left-4 top-4">
            <CertificateIcon width={11} height={11} />{" "}
            {processBadgeLabel(listing.category)}
          </span>

          {listing.status === "sold" && (
            <span className="absolute bottom-4 left-4 inline-flex items-center rounded-full border border-border bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-dim backdrop-blur-[6px]">
              Sold
            </span>
          )}
        </div>

        {/* Detail column. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.24em] text-gold">
                {listing.brand}
              </div>
              <h2
                id="quickview-title"
                className="font-serif text-[26px] leading-tight text-ink"
              >
                {listing.title}
              </h2>
            </div>
            <button
              type="button"
              data-quickview-initial-focus
              onClick={closeQuickView}
              aria-label="Close quick view"
              className="-mr-1.5 -mt-1.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-card hover:text-ink motion-reduce:transition-none"
            >
              <CloseIcon width={16} height={16} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] tracking-wide text-ink-dim">
            <span>{categoryLabel(listing.category)}</span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>{listing.condition}</span>
            {listing.year && (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span>{listing.year}</span>
              </>
            )}
          </div>

          <div className="mt-5 border-t border-border-soft pt-5">
            <div className="price text-[30px] leading-none">
              {formatZar(listing.priceCents)}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2.5 pt-7">
            <Link
              href={`/listing/${listing.id}`}
              onClick={closeQuickView}
              className="btn btn-primary btn-block"
            >
              View piece <ArrowRightIcon width={16} height={16} />
            </Link>
            <FavouriteButton
              listingId={listing.id}
              isSavedInitial={isSaved}
              variant="panel"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

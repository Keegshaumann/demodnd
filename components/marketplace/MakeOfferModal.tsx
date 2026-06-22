"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { makeOfferAction } from "@/lib/offers/actions";
import { formatZar, randsToCents } from "@/lib/money";
import { CloseIcon, ArrowRightIcon, CertificateIcon } from "@/components/ui/icons";

/**
 * The "Make an offer" dialog. A focused, accessible overlay (Escape + body
 * scroll-lock + focused field, mirroring ListingGallery's lightbox) collecting a
 * whole-Rand offer, validating the 70% floor client-side as a courtesy, then
 * calling makeOfferAction. The server re-validates everything (floor, < price,
 * one-open-offer, role/status) — this UI only mirrors those rules for fast
 * feedback and surfaces the action's { ok:false, error } verbatim.
 */
export function MakeOfferModal({
  listingId,
  priceCents,
  floorCents,
  onDone,
  onClose,
}: {
  listingId: string;
  priceCents: number;
  floorCents: number;
  onDone?: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rands, setRands] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Scroll-lock + Escape, restoring focus to the opener on unmount.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const value = Number(rands);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter your offer amount.");
      return;
    }
    const amountCents = randsToCents(value);
    // Client-side mirrors of the server guards (for fast feedback only).
    if (amountCents >= priceCents) {
      setError("That's at or above the list price — you can simply buy it now.");
      return;
    }
    if (amountCents < floorCents) {
      setError(`Offers start from ${formatZar(floorCents)}.`);
      return;
    }

    startTransition(async () => {
      const res = await makeOfferAction({ listingId, amountCents });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Reflect the new offer state on the PDP (the server already revalidated).
      router.refresh();
      onDone?.();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="make-offer-title"
      onMouseDown={(e) => {
        // Click on the backdrop (not the panel) closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="surface-card w-full max-w-[460px] rounded-b-none rounded-t-[14px] p-7 sm:rounded-[3px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="caption mb-1.5 text-gold">Make an offer</div>
            <h2 id="make-offer-title" className="font-serif text-[24px] leading-tight">
              Name your price
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-card hover:text-ink motion-reduce:transition-none"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
          List price {formatZar(priceCents)}. The seller has 48 hours to accept,
          counter, or decline. If accepted, you&apos;ll have 24 hours to pay the
          agreed amount.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6">
          <label htmlFor="offer-amount" className="field-label">
            Your offer (ZAR)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-ink-dim">
              R
            </span>
            <input
              ref={inputRef}
              id="offer-amount"
              name="amount"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={rands}
              onChange={(e) => {
                setRands(e.target.value);
                if (error) setError(null);
              }}
              placeholder="0"
              required
              aria-invalid={error ? "true" : undefined}
              className="field-input pl-7"
            />
          </div>
          <p className="mt-2 text-[12px] text-ink-dim">
            Offers from {formatZar(floorCents)} (70% of the list price).
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-[3px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-lg btn-block mt-6"
          >
            {pending ? "Submitting…" : "Submit offer"}
            {!pending && <ArrowRightIcon width={16} height={16} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-block mt-2"
          >
            Cancel
          </button>

          <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-dim">
            <CertificateIcon width={14} height={14} /> No payment is taken now.
            You only pay if your offer is accepted.
          </p>
        </form>
      </div>
    </div>
  );
}

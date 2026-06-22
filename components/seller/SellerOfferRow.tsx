"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatZar, randsToCents } from "@/lib/money";
import {
  acceptOfferAction,
  counterOfferAction,
  declineOfferAction,
} from "@/lib/offers/actions";
import { CertificateIcon } from "@/components/ui/icons";
import type { OfferState } from "@/lib/supabase/database.types";
import type { SellerOfferView } from "@/lib/offers/queries";

/**
 * One incoming offer on the seller's own listing. Buyer identity is intentionally
 * NOT surfaced (discretion — matches getSellerSales). A live response deadline is
 * shown for still-open offers; the action set is gated by the (in-read,
 * expiry-adjusted) state:
 *   pending   → Accept · Counter (inline ask) · Decline
 *   countered → awaiting the buyer · Decline
 *   terminal/expired → read-only chip
 *
 * The view shape comes from getSellerOffers (lib/offers/queries.ts) so the page
 * can hand its rows straight in without a re-map.
 */

const STATE_CHIP: Record<OfferState, { label: string; cls: string }> = {
  pending: { label: "Awaiting you", cls: "border-amber-300 text-amber-700" },
  countered: { label: "Countered", cls: "border-blue-300 text-blue-700" },
  accepted: { label: "Accepted", cls: "border-emerald-300 text-emerald-700" },
  declined: { label: "Declined", cls: "border-ink-dim/40 text-ink-dim" },
  expired: { label: "Expired", cls: "border-ink-dim/40 text-ink-dim" },
  withdrawn: { label: "Withdrawn", cls: "border-ink-dim/40 text-ink-dim" },
};

/** "Expires in 8h" / "Expires in 2d" / "Expired" — relative, computed at render. */
function deadlineLabel(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Expires in ${days}d`;
  }
  if (hours >= 1) return `Expires in ${hours}h`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `Expires in ${mins}m`;
}

export function SellerOfferRow({ offer }: { offer: SellerOfferView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [counterRands, setCounterRands] = useState("");

  // An open offer the seller can still act on (in-read state already reflects 48h
  // expiry; the isExpired flag is the belt-and-braces guard).
  const isOpen = !offer.isExpired && (offer.state === "pending" || offer.state === "countered");
  const canDecide = isOpen && offer.state === "pending";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  function submitCounter() {
    setError(null);
    const rands = Number(counterRands);
    if (!Number.isFinite(rands) || rands <= 0) {
      setError("Enter a counter amount.");
      return;
    }
    const counterCents = randsToCents(rands);
    if (counterCents > offer.priceCents) {
      setError("A counter can't be more than the list price.");
      return;
    }
    if (counterCents === offer.amountCents) {
      setError("Your counter must differ from the buyer's offer.");
      return;
    }
    run(() => counterOfferAction({ offerId: offer.id, counterCents }));
  }

  const chip = STATE_CHIP[offer.state];

  return (
    <article className="surface-card p-5">
      <div className="flex items-start gap-5">
        <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-[3px] bg-deep">
          {offer.imageUrl ? (
            <Image
              src={offer.imageUrl}
              alt={`${offer.itemBrand} ${offer.itemTitle}`}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-dim">
              <CertificateIcon width={20} height={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold">
              {offer.itemBrand}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] ${chip.cls}`}
            >
              {chip.label}
            </span>
          </div>
          <div className="mt-0.5 truncate font-serif text-lg">{offer.itemTitle}</div>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <Amount label="List price" value={formatZar(offer.priceCents)} muted />
            <Amount label="Their offer" value={formatZar(offer.amountCents)} strong />
            {offer.counterAmountCents != null && (
              <Amount label="Your counter" value={formatZar(offer.counterAmountCents)} />
            )}
          </div>

          {isOpen && (
            <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-ink-dim">
              {deadlineLabel(offer.expiresAt)}
            </p>
          )}

          {/* Actions */}
          {canDecide && !countering && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => acceptOfferAction({ offerId: offer.id }))}
                className="btn btn-primary btn-sm"
              >
                {pending ? "Working…" : "Accept"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setCountering(true);
                }}
                className="btn btn-outline btn-sm"
              >
                Counter
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => declineOfferAction({ offerId: offer.id }))}
                className="btn btn-outline btn-sm"
              >
                Decline
              </button>
            </div>
          )}

          {canDecide && countering && (
            <div className="mt-4">
              <label
                htmlFor={`counter-${offer.id}`}
                className="mb-1.5 block text-[10.5px] uppercase tracking-[0.16em] text-ink-dim"
              >
                Your counter (ZAR)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={`counter-${offer.id}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={Math.floor(offer.priceCents / 100)}
                  value={counterRands}
                  onChange={(e) => setCounterRands(e.target.value)}
                  placeholder="e.g. 18000"
                  className="field-input w-40"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={submitCounter}
                  className="btn btn-primary btn-sm"
                >
                  {pending ? "Sending…" : "Send counter"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setCountering(false);
                    setCounterRands("");
                    setError(null);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-dim">
                Up to the list price ({formatZar(offer.priceCents)}). Resets the
                buyer&apos;s 48-hour response window.
              </p>
            </div>
          )}

          {isOpen && offer.state === "countered" && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-ink-muted">
                Awaiting the buyer&apos;s response to your counter.
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => declineOfferAction({ offerId: offer.id }))}
                className="btn btn-outline btn-sm"
              >
                Decline
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-[12px] text-[#e85d5d]">{error}</p>}
        </div>
      </div>
    </article>
  );
}

function Amount({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div
        className={`mt-0.5 ${
          strong
            ? "font-serif text-lg text-ink"
            : muted
              ? "text-sm text-ink-muted"
              : "text-sm text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

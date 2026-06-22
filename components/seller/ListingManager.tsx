"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateListingPriceAction,
  setListingStatusAction,
} from "@/lib/seller/actions";
import { updateListingDetailsAction } from "@/lib/seller/listing-details";
import { formatZar, formatBps } from "@/lib/money";
import { CertificateIcon } from "@/components/ui/icons";
import type { SellerListingRow } from "@/lib/seller/dashboard";
import type { ListingStatus } from "@/lib/supabase/database.types";

const STATUS_CLASS: Record<ListingStatus, string> = {
  active: "border-emerald-300 text-emerald-700",
  pending: "border-amber-300 text-amber-700",
  sold: "border-blue-300 text-blue-700",
  delisted: "border-ink-dim/40 text-ink-dim",
};

export function ListingManager({ listing }: { listing: SellerListingRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(Math.round(listing.priceCents / 100)));
  const [error, setError] = useState<string | null>(null);

  // Details editor (condition notes / measurements / "comes with").
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsPending, startDetailsTransition] = useTransition();
  const [conditionNotes, setConditionNotes] = useState(listing.conditionNotes ?? "");
  const [measurements, setMeasurements] = useState(listing.measurements ?? "");
  // Inclusions are stored as string[]; edited here as one comma-separated field.
  const [inclusions, setInclusions] = useState((listing.inclusions ?? []).join(", "));
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState(false);

  function openDetails() {
    setDetailsError(null);
    setDetailsSaved(false);
    setConditionNotes(listing.conditionNotes ?? "");
    setMeasurements(listing.measurements ?? "");
    setInclusions((listing.inclusions ?? []).join(", "));
    setEditingDetails(true);
  }

  function saveDetails() {
    setDetailsError(null);
    setDetailsSaved(false);
    const parsedInclusions = inclusions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    startDetailsTransition(async () => {
      const res = await updateListingDetailsAction(listing.id, {
        conditionNotes,
        measurements,
        inclusions: parsedInclusions,
      });
      if (!res.ok) setDetailsError(res.error);
      else {
        setEditingDetails(false);
        setDetailsSaved(true);
        router.refresh();
      }
    });
  }

  function savePrice() {
    setError(null);
    const rands = Number(price);
    startTransition(async () => {
      const res = await updateListingPriceAction(listing.id, rands);
      if (!res.ok) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function toggleStatus(next: "active" | "delisted") {
    setError(null);
    startTransition(async () => {
      const res = await setListingStatusAction(listing.id, next);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const canManage = listing.status !== "sold";

  return (
    <article className="surface-card flex flex-col gap-5 p-5 sm:flex-row">
      <div className="relative h-28 w-24 flex-shrink-0 overflow-hidden rounded-[3px] bg-deep">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={`${listing.brand} ${listing.title}`}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-dim">
            <CertificateIcon width={22} height={22} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold">
            {listing.brand}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${STATUS_CLASS[listing.status]}`}
          >
            {listing.status}
          </span>
        </div>
        <Link
          href={`/listing/${listing.id}`}
          className="font-serif text-xl hover:text-gold"
        >
          {listing.title}
        </Link>
        <div className="mt-1 text-[12px] text-ink-dim">
          Commission locked at {formatBps(listing.feeRateBps)}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {editing ? (
            <div className="flex items-center gap-2">
              <span className="text-ink-dim">R</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-32 rounded-[3px] border border-border bg-bg px-3 py-1.5 text-sm outline-none focus:border-gold"
              />
              <button
                type="button"
                onClick={savePrice}
                disabled={pending}
                className="btn btn-primary btn-sm"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setPrice(String(Math.round(listing.priceCents / 100)));
                  setError(null);
                }}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="font-serif text-xl">
                {formatZar(listing.priceCents)}
              </span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="btn btn-outline btn-sm"
                >
                  Edit price
                </button>
              )}
              {canManage && !editingDetails && (
                <button
                  type="button"
                  onClick={openDetails}
                  className="btn btn-ghost btn-sm"
                >
                  Edit details
                </button>
              )}
              {listing.status === "active" && (
                <button
                  type="button"
                  onClick={() => toggleStatus("delisted")}
                  disabled={pending}
                  className="btn btn-ghost btn-sm"
                >
                  Delist
                </button>
              )}
              {listing.status === "delisted" && (
                <button
                  type="button"
                  onClick={() => toggleStatus("active")}
                  disabled={pending}
                  className="btn btn-outline btn-sm"
                >
                  Relist
                </button>
              )}
            </>
          )}
        </div>
        {error && <p className="mt-2 text-[12px] text-[#e85d5d]">{error}</p>}

        {editingDetails ? (
          <div className="mt-4 space-y-4 border-t border-border-soft pt-4">
            <label className="block">
              <span className="field-label">Condition notes</span>
              <textarea
                className="field-input"
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Any honest detail on wear, patina or service history…"
                aria-invalid={detailsError ? true : undefined}
              />
            </label>
            <label className="block">
              <span className="field-label">Measurements</span>
              <input
                className="field-input"
                value={measurements}
                onChange={(e) => setMeasurements(e.target.value)}
                placeholder="e.g. 38mm case · 20mm lug · 18cm strap"
                aria-invalid={detailsError ? true : undefined}
              />
            </label>
            <label className="block">
              <span className="field-label">Comes with</span>
              <input
                className="field-input"
                value={inclusions}
                onChange={(e) => setInclusions(e.target.value)}
                placeholder="Box, papers, spare strap"
                aria-invalid={detailsError ? true : undefined}
              />
              <span className="mt-1 block text-[11px] text-ink-dim">
                Separate each item with a comma.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveDetails}
                disabled={detailsPending}
                className="btn btn-primary btn-sm"
              >
                {detailsPending ? "Saving…" : "Save details"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingDetails(false);
                  setDetailsError(null);
                }}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              {detailsError && (
                <span className="text-[12px] text-[#e85d5d]">{detailsError}</span>
              )}
            </div>
          </div>
        ) : (
          (listing.conditionNotes ||
            listing.measurements ||
            (listing.inclusions && listing.inclusions.length > 0) ||
            detailsSaved) && (
            <dl className="mt-4 space-y-1.5 border-t border-border-soft pt-4 text-[12px]">
              {detailsSaved && (
                <p className="mb-2 text-[12px] text-emerald-700">Details saved.</p>
              )}
              {listing.conditionNotes && (
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="text-ink-dim sm:w-32 sm:flex-shrink-0">
                    Condition notes
                  </dt>
                  <dd className="text-ink">{listing.conditionNotes}</dd>
                </div>
              )}
              {listing.measurements && (
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="text-ink-dim sm:w-32 sm:flex-shrink-0">
                    Measurements
                  </dt>
                  <dd className="text-ink">{listing.measurements}</dd>
                </div>
              )}
              {listing.inclusions && listing.inclusions.length > 0 && (
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="text-ink-dim sm:w-32 sm:flex-shrink-0">Comes with</dt>
                  <dd className="text-ink">{listing.inclusions.join(", ")}</dd>
                </div>
              )}
            </dl>
          )
        )}
      </div>
    </article>
  );
}

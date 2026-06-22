"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  delistListingAction,
  relistListingAction,
  setListingFeaturedAction,
  setListingPriceAction,
  deleteListingAction,
  type AdminListingActionResult,
} from "@/lib/admin/listings";
import { randsToCents } from "@/lib/money";
import type { ListingStatus } from "@/lib/supabase/database.types";

export function ListingActions({
  id,
  status,
  featured,
  priceCents,
}: {
  id: string;
  status: ListingStatus;
  featured: boolean;
  priceCents: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rands, setRands] = useState(String(Math.round(priceCents / 100)));

  function run(fn: () => Promise<AdminListingActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        setEditing(false);
        setConfirmDelete(false);
        router.refresh();
      }
    });
  }

  const isSold = status === "sold";

  return (
    <div className="flex flex-shrink-0 flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Price */}
        {editing ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[12px] text-ink-dim">R</span>
            <input
              type="number"
              inputMode="numeric"
              value={rands}
              onChange={(e) => setRands(e.target.value)}
              className="field-input w-28 py-1.5 text-[13px]"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setListingPriceAction(id, randsToCents(Number(rands))))}
              className="btn btn-primary btn-sm"
            >
              Save
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setEditing(false)}
              className="btn btn-outline btn-sm"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(true)}
            className="btn btn-outline btn-sm"
          >
            Edit price
          </button>
        )}

        {/* Feature / unfeature — only active pieces surface publicly, so
            featuring is offered for active stock; unfeaturing always works
            (cleanup after a delist/sale). */}
        {featured ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setListingFeaturedAction(id, false))}
            className="btn btn-outline btn-sm"
          >
            Unfeature
          </button>
        ) : status === "active" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setListingFeaturedAction(id, true))}
            className="btn btn-outline btn-sm"
          >
            Feature
          </button>
        ) : null}

        {/* Delist / relist — locked once sold */}
        {isSold ? (
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-dim">
            Sold — locked
          </span>
        ) : status === "delisted" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => relistListingAction(id))}
            className="btn btn-primary btn-sm"
          >
            Relist
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => delistListingAction(id))}
            className="btn btn-outline btn-sm"
          >
            Delist
          </button>
        )}

        {/* Delete */}
        {confirmDelete ? (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteListingAction(id))}
              className="btn btn-sm bg-[#c0392b] text-white"
            >
              {pending ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmDelete(false)}
              className="btn btn-outline btn-sm"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            className="btn btn-ghost btn-sm text-[#c05858] hover:text-[#a04545]"
          >
            Delete
          </button>
        )}
      </div>
      {error && <span className="text-[12px] text-[#e85d5d]">{error}</span>}
    </div>
  );
}

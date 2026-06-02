"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateListingPriceAction,
  setListingStatusAction,
} from "@/lib/seller/actions";
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
      </div>
    </article>
  );
}

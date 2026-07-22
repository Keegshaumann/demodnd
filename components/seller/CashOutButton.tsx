"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestCashOutAction } from "@/lib/cash-out/actions";

/**
 * "Cash out" — a seller asks D&D to make them an offer to buy this piece
 * outright (instant liquidity) instead of waiting for a marketplace buyer.
 * One-click: fires the request, D&D is emailed and it lands in the admin queue.
 */
export function CashOutButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await requestCashOutAction({ listingId });
      if (!res.ok) setError(res.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  }

  if (done) {
    return (
      <span className="text-[12px] text-emerald-700">
        Cash offer requested — D&amp;D will be in touch.
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        title="Ask D&D to make you an offer to buy this piece outright"
        className="btn btn-outline btn-sm"
      >
        {pending ? "Requesting…" : "Cash out"}
      </button>
      {error && <span className="text-[12px] text-[#e85d5d]">{error}</span>}
    </span>
  );
}

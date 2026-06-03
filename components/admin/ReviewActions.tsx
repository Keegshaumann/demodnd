"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteReviewAction,
  type AdminReviewActionResult,
} from "@/lib/admin/reviews";

export function ReviewActions({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  function remove() {
    setError(null);
    startTransition(async () => {
      const res: AdminReviewActionResult = await deleteReviewAction(reviewId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-shrink-0 flex-col items-end gap-1">
      {confirm ? (
        <span className="inline-flex items-center gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="btn btn-sm bg-[#c0392b] text-white"
          >
            {pending ? "Removing…" : "Confirm remove"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirm(false)}
            className="btn btn-outline btn-sm"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirm(true)}
          className="btn btn-ghost btn-sm text-[#c05858] hover:text-[#a04545]"
        >
          Remove
        </button>
      )}
      {error && <span className="text-[12px] text-[#e85d5d]">{error}</span>}
    </div>
  );
}

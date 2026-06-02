"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmReceiptAction } from "@/lib/orders/actions";
import { CheckIcon } from "@/components/ui/icons";

export function ConfirmReceiptButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmReceiptAction(orderId);
      if (!res.ok) {
        setError(res.error);
        setConfirming(false);
      } else {
        router.refresh();
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn btn-primary btn-block"
      >
        <CheckIcon width={16} height={16} /> Confirm receipt
      </button>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[13px] text-ink-muted">
        Confirm only once your piece has arrived and you&apos;re satisfied. This
        closes the order.
      </p>
      {error && <p className="mb-3 text-[13px] text-[#e85d5d]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="btn btn-primary"
        >
          {pending ? "Confirming…" : "Yes, I've received it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="btn btn-outline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

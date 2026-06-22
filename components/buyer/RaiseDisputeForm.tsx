"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { raiseDisputeAction } from "@/lib/disputes/actions";

export function RaiseDisputeForm({
  orderId,
  deadlineLabel,
}: {
  orderId: string;
  deadlineLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await raiseDisputeAction({ orderId, reason });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-sm btn-block"
      >
        Raise a dispute
      </button>
    );
  }

  return (
    <div className="w-full">
      <p className="mb-3 text-[13px] text-ink-muted">
        Tell us what&apos;s wrong with your order. Disputes can be raised within
        48 hours of delivery — until {deadlineLabel}.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        placeholder="Describe the issue — condition, authenticity concern, damage in transit…"
        className="field-input w-full"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="btn btn-primary btn-sm"
        >
          {pending ? "Submitting…" : "Submit dispute"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="btn btn-outline btn-sm"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-[#e85d5d]">{error}</p>}
    </div>
  );
}

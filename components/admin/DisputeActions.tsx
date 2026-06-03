"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resolveDisputeAction,
  type AdminDisputeActionResult,
} from "@/lib/admin/disputes";

export function DisputeActions({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  function resolve() {
    setError(null);
    startTransition(async () => {
      const res: AdminDisputeActionResult = await resolveDisputeAction(
        disputeId,
        note,
      );
      if (!res.ok) setError(res.error);
      else {
        setOpen(false);
        setNote("");
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary btn-sm"
      >
        Resolve
      </button>
    );
  }

  return (
    <div className="w-full">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Resolution decision / notes (recorded on the dispute)…"
        className="field-input w-full"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={resolve}
          className="btn btn-primary btn-sm"
        >
          {pending ? "Resolving…" : "Confirm resolve"}
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

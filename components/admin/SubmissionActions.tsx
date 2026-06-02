"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveSubmissionAction,
  requestMoreInfoAction,
  declineSubmissionAction,
  type ActionResult,
} from "@/lib/admin/submissions";
import type { SubmissionStatus } from "@/lib/supabase/database.types";

export function SubmissionActions({
  id,
  status,
}: {
  id: string;
  status: SubmissionStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<null | "info" | "decline">(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
      } else {
        setPanel(null);
        setNotes("");
        router.refresh();
      }
    });
  }

  if (status === "approved" || status === "declined") {
    return (
      <span className="text-[11px] uppercase tracking-[0.16em] text-ink-dim">
        {status === "approved" ? "Approved" : "Declined"}
      </span>
    );
  }

  if (panel) {
    return (
      <div className="w-full">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={
            panel === "info"
              ? "What additional information or photos are needed?"
              : "Reason for declining (sent to the seller)…"
          }
          className="field-input mb-2 text-[13px]"
        />
        {error && <p className="mb-2 text-[12px] text-[#e85d5d]">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                panel === "info"
                  ? requestMoreInfoAction(id, notes)
                  : declineSubmissionAction(id, notes),
              )
            }
            className="btn btn-primary btn-sm"
          >
            {pending ? "Sending…" : panel === "info" ? "Send request" : "Decline"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setPanel(null);
              setError(null);
            }}
            className="btn btn-outline btn-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => approveSubmissionAction(id))}
        className="btn btn-primary btn-sm"
      >
        {pending ? "Working…" : "Approve"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setPanel("info")}
        className="btn btn-outline btn-sm"
      >
        Request info
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setPanel("decline")}
        className="btn btn-ghost btn-sm text-[#c05858] hover:text-[#a04545]"
      >
        Decline
      </button>
      {error && <span className="text-[12px] text-[#e85d5d]">{error}</span>}
    </div>
  );
}

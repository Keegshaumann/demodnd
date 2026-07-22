"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCashOutStatusAction } from "@/lib/admin/cash-outs";
import type { CashOutStatus } from "@/lib/supabase/database.types";

/** Admin controls to advance a cash-out request: open → contacted → closed. */
export function CashOutActions({
  id,
  status,
}: {
  id: string;
  status: CashOutStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set(next: "contacted" | "closed") {
    setError(null);
    startTransition(async () => {
      const res = await setCashOutStatusAction(id, next);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "open" && (
        <button
          type="button"
          onClick={() => set("contacted")}
          disabled={pending}
          className="btn btn-outline btn-sm"
        >
          Mark contacted
        </button>
      )}
      {status !== "closed" && (
        <button
          type="button"
          onClick={() => set("closed")}
          disabled={pending}
          className="btn btn-ghost btn-sm"
        >
          Close
        </button>
      )}
      {error && <span className="text-[12px] text-[#e85d5d]">{error}</span>}
    </div>
  );
}

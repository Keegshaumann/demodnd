"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markOrderDeliveredAction,
  flagOrderDisputedAction,
  recordOrderRefundedAction,
  type AdminOrderActionResult,
} from "@/lib/admin/order-actions";
import type { OrderStatus } from "@/lib/supabase/database.types";

export function OrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);

  function run(fn: () => Promise<AdminOrderActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        setConfirmRefund(false);
        router.refresh();
      }
    });
  }

  const canDeliver = status === "paid";
  const canDispute = status === "paid" || status === "delivered";
  const canRefund =
    status === "paid" || status === "delivered" || status === "disputed";

  if (!canDeliver && !canDispute && !canRefund) {
    return (
      <p className="text-[13px] text-ink-dim">
        No actions available for a {status} order.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canDeliver && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => markOrderDeliveredAction(orderId))}
            className="btn btn-primary btn-sm"
          >
            Mark delivered
          </button>
        )}
        {canDispute && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => flagOrderDisputedAction(orderId))}
            className="btn btn-outline btn-sm"
          >
            Flag disputed
          </button>
        )}
        {canRefund &&
          (confirmRefund ? (
            <span className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => recordOrderRefundedAction(orderId))}
                className="btn btn-sm bg-[#c0392b] text-white"
              >
                {pending ? "Saving…" : "Confirm refund"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmRefund(false)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmRefund(true)}
              className="btn btn-ghost btn-sm text-[#c05858] hover:text-[#a04545]"
            >
              Record refund
            </button>
          ))}
      </div>
      <p className="mt-2 text-[11.5px] text-ink-dim">
        Recording a refund sets the order status only — process the actual refund
        in PayFast.
      </p>
      {error && <p className="mt-1.5 text-[12px] text-[#e85d5d]">{error}</p>}
    </div>
  );
}

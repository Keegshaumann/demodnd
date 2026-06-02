"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setSellerVerifiedAction,
  setUserStatusAction,
  deleteUserAction,
  type AdminUserActionResult,
  type AdminUserRow,
} from "@/lib/admin/users";
import { CheckIcon, CheckCircleIcon } from "@/components/ui/icons";

export function UserActions({ user }: { user: AdminUserRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(fn: () => Promise<AdminUserActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        setConfirmDelete(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Verification */}
        {user.verified ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setSellerVerifiedAction(user.id, false))}
            className="btn btn-outline btn-sm"
          >
            Un-verify
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setSellerVerifiedAction(user.id, true))}
            className="btn btn-primary btn-sm"
          >
            <CheckIcon width={14} height={14} /> Verify ID
          </button>
        )}

        {/* Status */}
        {user.status === "active" ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setUserStatusAction(user.id, "suspended"))}
              className="btn btn-outline btn-sm"
            >
              Suspend
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setUserStatusAction(user.id, "banned"))}
              className="btn btn-ghost btn-sm text-[#c05858] hover:text-[#a04545]"
            >
              Ban
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setUserStatusAction(user.id, "active"))}
            className="btn btn-outline btn-sm"
          >
            <CheckCircleIcon width={14} height={14} /> Reactivate
          </button>
        )}

        {/* Delete */}
        {confirmDelete ? (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteUserAction(user.id))}
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

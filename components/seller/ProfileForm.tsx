"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateSellerProfileAction,
  type SellerProfileInput,
} from "@/lib/seller/actions";

export function ProfileForm({ initial }: { initial: SellerProfileInput }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<SellerProfileInput>(initial);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  function set<K extends keyof SellerProfileInput>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const res = await updateSellerProfileAction(values);
      if (res.ok) {
        setStatus({ ok: true, msg: "Profile saved." });
        router.refresh();
      } else {
        setStatus({ ok: false, msg: res.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="surface-card p-6">
        <h2 className="mb-1 font-serif text-xl">Public profile</h2>
        <p className="mb-5 text-[13px] text-ink-muted">
          Shown on your public seller page. Your real name is never displayed to
          buyers.
        </p>
        <div className="space-y-4">
          <Field label="Display name">
            <input
              className="field-input"
              value={values.displayName ?? ""}
              onChange={(e) => set("displayName", e.target.value)}
              placeholder="e.g. The Vault Cape Town"
            />
          </Field>
          <Field label="Bio">
            <textarea
              className="field-input"
              value={values.bio ?? ""}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="A short note about your collection…"
            />
          </Field>
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="mb-1 font-serif text-xl">Banking details</h2>
        <p className="mb-5 text-[13px] text-ink-muted">
          Private — visible only to D&amp;D for processing your EFT payouts. Never
          shown publicly.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account holder">
            <input
              className="field-input"
              value={values.bankAccountHolder ?? ""}
              onChange={(e) => set("bankAccountHolder", e.target.value)}
            />
          </Field>
          <Field label="Bank name">
            <input
              className="field-input"
              value={values.bankName ?? ""}
              onChange={(e) => set("bankName", e.target.value)}
            />
          </Field>
          <Field label="Account number">
            <input
              className="field-input"
              value={values.bankAccountNumber ?? ""}
              onChange={(e) => set("bankAccountNumber", e.target.value)}
            />
          </Field>
          <Field label="Branch code">
            <input
              className="field-input"
              value={values.bankBranchCode ?? ""}
              onChange={(e) => set("bankBranchCode", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {status && (
          <span
            className={`text-[13px] ${status.ok ? "text-emerald-700" : "text-[#e85d5d]"}`}
          >
            {status.msg}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  // Nest the control inside the label for an implicit programmatic association
  // (clicking the label focuses the field; screen readers announce its name).
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

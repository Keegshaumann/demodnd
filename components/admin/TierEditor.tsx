"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTierAction } from "@/lib/admin/tiers";
import type { SubscriptionTier } from "@/lib/supabase/database.types";

export function TierEditor({ tier }: { tier: SubscriptionTier }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [monthly, setMonthly] = useState(String(tier.monthly_fee_cents / 100));
  const [perItem, setPerItem] = useState(String(tier.per_item_fee_cents / 100));
  const [unlimited, setUnlimited] = useState(tier.max_listings === null);
  const [maxListings, setMaxListings] = useState(
    tier.max_listings === null ? "" : String(tier.max_listings),
  );
  const [feePct, setFeePct] = useState(String(tier.transaction_fee_bps / 100));
  const [authIncluded, setAuthIncluded] = useState(tier.auth_included ?? "");
  const [active, setActive] = useState(tier.active);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const res = await updateTierAction(tier.id, {
        monthlyFeeRands: Number(monthly) || 0,
        perItemFeeRands: Number(perItem) || 0,
        maxListings: unlimited ? null : Number(maxListings) || 0,
        transactionFeePct: Number(feePct) || 0,
        authIncluded,
        active,
      });
      if (res.ok) {
        setStatus({ ok: true, msg: "Saved." });
        router.refresh();
      } else {
        setStatus({ ok: false, msg: res.error });
      }
    });
  }

  return (
    <form onSubmit={save} className="surface-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-2xl">{tier.name}</h3>
        <label className="flex items-center gap-2 text-[12px] text-ink-muted">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Monthly fee (R)">
          <input
            type="number"
            className="field-input"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            min={0}
          />
        </Field>
        <Field label="Transaction fee (%)">
          <input
            type="number"
            step="0.1"
            className="field-input"
            value={feePct}
            onChange={(e) => setFeePct(e.target.value)}
            min={0}
            max={100}
          />
        </Field>
        <Field label="Per-item fee (R)">
          <input
            type="number"
            className="field-input"
            value={perItem}
            onChange={(e) => setPerItem(e.target.value)}
            min={0}
          />
        </Field>
        <Field label="Max active listings">
          <div className="flex items-center gap-3">
            <input
              type="number"
              className="field-input"
              value={maxListings}
              onChange={(e) => setMaxListings(e.target.value)}
              disabled={unlimited}
              min={0}
              placeholder={unlimited ? "Unlimited" : ""}
            />
            <label className="flex flex-shrink-0 items-center gap-1.5 text-[12px] text-ink-muted">
              <input
                type="checkbox"
                checked={unlimited}
                onChange={(e) => setUnlimited(e.target.checked)}
              />
              ∞
            </label>
          </div>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Authentication included">
            <input
              className="field-input"
              value={authIncluded}
              onChange={(e) => setAuthIncluded(e.target.value)}
              placeholder="e.g. Unlimited photo + 2 courier / month"
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "Saving…" : "Save plan"}
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
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

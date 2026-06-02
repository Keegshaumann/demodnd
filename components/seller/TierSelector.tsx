"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectTierAction } from "@/lib/seller/actions";
import { formatZar, formatBps } from "@/lib/money";
import { CheckIcon } from "@/components/ui/icons";
import type { SubscriptionTier } from "@/lib/supabase/database.types";

export function TierSelector({
  tiers,
  currentTierId,
}: {
  tiers: SubscriptionTier[];
  currentTierId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function select(tierId: string) {
    setError(null);
    setBusyId(tierId);
    startTransition(async () => {
      const res = await selectTierAction(tierId);
      if (!res.ok) setError(res.error);
      else router.refresh();
      setBusyId(null);
    });
  }

  return (
    <div>
      {error && <p className="mb-4 text-[13px] text-[#e85d5d]">{error}</p>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => {
          const current = tier.id === currentTierId;
          return (
            <div
              key={tier.id}
              className={`surface-card flex flex-col p-6 ${current ? "border-gold" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-serif text-2xl">{tier.name}</h3>
                {current && (
                  <span className="rounded-full border border-gold px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-gold">
                    Current
                  </span>
                )}
              </div>
              <div className="mb-4">
                <span className="font-serif text-[28px]">
                  {tier.monthly_fee_cents === 0
                    ? "Free"
                    : formatZar(tier.monthly_fee_cents)}
                </span>
                {tier.monthly_fee_cents > 0 && (
                  <span className="text-[12px] text-ink-dim"> / month</span>
                )}
              </div>
              <ul className="mb-6 flex-1 space-y-2.5 text-[13px] text-ink-muted">
                <Feature>
                  {tier.max_listings === null
                    ? "Unlimited active listings"
                    : `Up to ${tier.max_listings} active listing${tier.max_listings === 1 ? "" : "s"}`}
                </Feature>
                <Feature>{formatBps(tier.transaction_fee_bps)} transaction fee</Feature>
                {tier.auth_included && <Feature>{tier.auth_included}</Feature>}
              </ul>
              <button
                type="button"
                disabled={current || (pending && busyId === tier.id)}
                onClick={() => select(tier.id)}
                className={`btn btn-block ${current ? "btn-outline" : "btn-primary"}`}
              >
                {current
                  ? "Your plan"
                  : pending && busyId === tier.id
                    ? "Switching…"
                    : "Choose plan"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckIcon width={14} height={14} className="mt-0.5 flex-shrink-0 text-gold" />
      <span>{children}</span>
    </li>
  );
}

import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getActiveTiers, getSellerSubscription } from "@/lib/seller/dashboard";
import { TierSelector } from "@/components/seller/TierSelector";
import { formatBps } from "@/lib/money";

export const metadata: Metadata = { title: "Subscription" };

export default async function SellerSubscriptionPage() {
  const user = await requireRole("seller");
  const [tiers, subscription] = await Promise.all([
    getActiveTiers(),
    getSellerSubscription(user.id),
  ]);

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Membership</p>
        <h1 className="font-serif text-[34px]">Your plan</h1>
        <p className="mt-2 max-w-[640px] text-sm text-ink-muted">
          Your plan sets how many pieces you can list at once and the commission
          on each sale. The fee is locked onto each listing when it goes live —
          changing plans never affects pieces already listed.
        </p>
      </header>

      {subscription.tier ? (
        <div className="surface-card mb-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-dim">
              Current plan
            </div>
            <div className="font-serif text-2xl">{subscription.tier.name}</div>
            <div className="text-[13px] text-ink-muted">
              {formatBps(subscription.tier.transaction_fee_bps)} commission ·{" "}
              {subscription.tier.max_listings === null
                ? "unlimited listings"
                : `up to ${subscription.tier.max_listings} listings`}
            </div>
          </div>
          {subscription.currentPeriodEnd && (
            <div className="text-right text-[12px] text-ink-dim">
              Renews{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="surface-card mb-8 p-6 text-sm text-ink-muted">
          You&apos;re on the <strong className="text-ink">Free</strong> plan by
          default. Choose a plan below to list more pieces at a lower commission.
        </div>
      )}

      <TierSelector tiers={tiers} currentTierId={subscription.tier?.id ?? null} />
    </div>
  );
}

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { TierEditor } from "@/components/admin/TierEditor";

export const metadata: Metadata = { title: "Subscription Tiers" };

export default async function AdminTiersPage() {
  const db = createAdminClient();
  const { data: tiers } = await db
    .from("subscription_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Configuration</p>
        <h1 className="font-serif text-[34px]">Subscription tiers</h1>
        <p className="mt-2 max-w-[640px] text-sm text-ink-muted">
          Set the monthly fee, commission and listing limits for each plan.
          Changes apply to new listings only — the commission on existing
          listings is locked at the rate when they went live.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {(tiers ?? []).map((tier) => (
          <TierEditor key={tier.id} tier={tier} />
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { RewardsTable } from "@/components/seller/RewardsTable";

export const metadata: Metadata = { title: "Rewards" };

export default async function SellerEarningsPage() {
  await requireRole("seller");

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Rewards</p>
        <h1 className="font-serif text-[34px]">Earn more as you sell</h1>
        <p className="mt-2 max-w-[640px] text-sm text-ink-muted">
          The more you consign, the more you earn. Climb the status ladder to
          unlock a higher loyalty bonus on every sale, plus white-glove perks
          like complimentary pickup, valuation appointments and a dedicated
          concierge. Tiers are reviewed against your net sales each year.
        </p>
      </header>

      <RewardsTable />

      <p className="mt-5 max-w-[640px] text-[12px] text-ink-dim">
        Tier thresholds and loyalty bonuses shown are indicative and may change.
        Your current status and progress will appear here as your sales build.
      </p>
    </div>
  );
}

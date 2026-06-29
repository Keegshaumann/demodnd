import { CheckIcon, MinusIcon } from "@/components/ui/icons";

/**
 * Seller rewards / loyalty ladder — a RealReal-style tier comparison table.
 *
 * Static placeholder data for now ("rework later"): four status tiers as
 * columns, a net-sales band per tier, a loyalty-bonus % row, and a perks
 * checklist with a checkmark per tier that unlocks it. Pure presentational
 * component — no data fetching, monochrome editorial styling.
 */

type Tier = {
  /** Stable key for React lists. */
  key: string;
  /** Tier name shown in the column header. */
  name: string;
  /** Net-sales band that qualifies a seller for the tier. */
  band: string;
  /** Loyalty bonus applied on top of standard payouts. */
  loyaltyBonus: string;
  /** Whether this is the entry tier (rendered without the dark accent). */
  entry?: boolean;
};

type Perk = {
  /** Perk label. */
  label: string;
  /** One checkmark per tier (index-aligned with TIERS) — true = included. */
  included: [boolean, boolean, boolean, boolean];
};

const TIERS: Tier[] = [
  { key: "insider", name: "Insider", band: "R0 – R25k", loyaltyBonus: "—", entry: true },
  { key: "select", name: "Select", band: "R25k – R75k", loyaltyBonus: "+2%" },
  { key: "premier", name: "Premier", band: "R75k – R200k", loyaltyBonus: "+4%" },
  { key: "icon", name: "Icon", band: "R200k+", loyaltyBonus: "+6%" },
];

const PERKS: Perk[] = [
  { label: "Consignment payouts", included: [true, true, true, true] },
  { label: "Free authentication & Entrupy verification", included: [true, true, true, true] },
  { label: "Loyalty bonus on net sales", included: [false, true, true, true] },
  { label: "Priority listing review", included: [false, true, true, true] },
  { label: "Complimentary collection & pickup", included: [false, false, true, true] },
  { label: "In-person valuation appointments", included: [false, false, true, true] },
  { label: "Early access to seasonal campaigns", included: [false, false, true, true] },
  { label: "Dedicated concierge specialist", included: [false, false, false, true] },
  { label: "White-glove consignment service", included: [false, false, false, true] },
];

export function RewardsTable() {
  return (
    <div className="surface-card overflow-x-auto">
      {/* min-width keeps the four columns intact; the wrapper scrolls on mobile. */}
      <table className="w-full min-w-[760px] border-collapse text-left">
        <caption className="sr-only">
          Seller rewards tiers and the perks unlocked at each level.
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="w-[34%] px-6 py-6 align-bottom text-[11px] font-medium uppercase tracking-[0.18em] text-ink-dim"
            >
              Status tier
            </th>
            {TIERS.map((tier) => (
              <th
                key={tier.key}
                scope="col"
                className={`px-5 py-6 text-center align-bottom ${
                  tier.entry ? "" : "bg-deep/60"
                }`}
              >
                <div className="font-serif text-[26px] leading-none text-gold">
                  {tier.name}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-ink-dim">
                  {tier.band}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border-soft">
            <th
              scope="row"
              className="px-6 py-5 text-[13px] font-medium text-ink"
            >
              Net annual sales
              <span className="mt-0.5 block text-[12px] font-normal text-ink-muted">
                The band you qualify into each year.
              </span>
            </th>
            {TIERS.map((tier) => (
              <td
                key={tier.key}
                className={`px-5 py-5 text-center text-[13px] text-ink-muted ${
                  tier.entry ? "" : "bg-deep/60"
                }`}
              >
                {tier.band}
              </td>
            ))}
          </tr>

          <tr className="border-b border-border">
            <th
              scope="row"
              className="px-6 py-5 text-[13px] font-medium text-ink"
            >
              Loyalty bonus
              <span className="mt-0.5 block text-[12px] font-normal text-ink-muted">
                Added on top of your standard payout.
              </span>
            </th>
            {TIERS.map((tier) => (
              <td
                key={tier.key}
                className={`px-5 py-5 text-center ${
                  tier.entry ? "" : "bg-deep/60"
                }`}
              >
                <span className="font-serif text-[22px] text-gold">
                  {tier.loyaltyBonus}
                </span>
              </td>
            ))}
          </tr>

          <tr>
            <th
              scope="row"
              colSpan={5}
              className="px-6 pt-7 pb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-dim"
            >
              Membership perks
            </th>
          </tr>

          {PERKS.map((perk) => (
            <tr key={perk.label} className="border-b border-border-soft">
              <th
                scope="row"
                className="px-6 py-4 text-[13px] font-normal text-ink"
              >
                {perk.label}
              </th>
              {TIERS.map((tier, i) => {
                const on = perk.included[i];
                return (
                  <td
                    key={tier.key}
                    className={`px-5 py-4 text-center ${
                      tier.entry ? "" : "bg-deep/60"
                    }`}
                  >
                    {on ? (
                      <CheckIcon
                        width={16}
                        height={16}
                        className="mx-auto text-gold"
                      />
                    ) : (
                      <MinusIcon
                        width={16}
                        height={16}
                        className="mx-auto text-ink-dim/40"
                      />
                    )}
                    <span className="sr-only">
                      {on ? "Included" : "Not included"} in {tier.name}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

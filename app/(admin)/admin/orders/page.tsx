import type { Metadata } from "next";
import { getSalesLedger, type LedgerRow } from "@/lib/admin/orders";
import { formatZar } from "@/lib/money";
import type { OrderStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Sales Ledger" };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "border-amber-300 text-amber-700",
  paid: "border-blue-300 text-blue-700",
  delivered: "border-emerald-300 text-emerald-700",
  refunded: "border-rose-300 text-rose-700",
  disputed: "border-rose-300 text-rose-700",
};

export default async function SalesLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = (first(params.status) ?? "all") as OrderStatus | "all";
  const dateFrom = first(params.from) ?? "";
  const dateTo = first(params.to) ?? "";
  const seller = first(params.seller) ?? "";

  const { rows, totals } = await getSalesLedger({
    status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    seller: seller || undefined,
  });

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Finance</p>
        <h1 className="font-serif text-[34px]">Sales ledger</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every sale with commission earned and the seller payout due. Banking
          details are shown for processing offline EFT payouts.
        </p>
      </header>

      {/* Totals */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Gross merchandise" value={formatZar(totals.grossCents)} />
        <Stat label="Commission earned" value={formatZar(totals.commissionCents)} />
        <Stat label="Seller payouts due" value={formatZar(totals.payoutCents)} />
        <Stat label="Orders" value={String(totals.count)} />
      </div>

      {/* Filters */}
      <form
        method="get"
        className="surface-card mb-8 flex flex-wrap items-end gap-4 p-5"
      >
        <Filter label="Status">
          <select name="status" defaultValue={status} className="field-input">
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="delivered">Delivered</option>
            <option value="refunded">Refunded</option>
            <option value="disputed">Disputed</option>
          </select>
        </Filter>
        <Filter label="From">
          <input type="date" name="from" defaultValue={dateFrom} className="field-input" />
        </Filter>
        <Filter label="To">
          <input type="date" name="to" defaultValue={dateTo} className="field-input" />
        </Filter>
        <Filter label="Seller">
          <input
            name="seller"
            defaultValue={seller}
            placeholder="name or email"
            className="field-input"
          />
        </Filter>
        <button type="submit" className="btn btn-primary btn-sm">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          No orders match these filters.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <LedgerCard key={r.id} row={r} statusClass={STATUS_CLASS[r.status]} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div className="mt-1.5 font-serif text-2xl text-ink">{value}</div>
    </div>
  );
}

function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-[150px]">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function LedgerCard({
  row,
  statusClass,
}: {
  row: LedgerRow;
  statusClass: string;
}) {
  const date = new Date(row.createdAt).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <article className="surface-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-ink-dim">
            #{row.id.slice(0, 8).toUpperCase()}
          </span>
          <span
            className={`rounded-full border px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${statusClass}`}
          >
            {row.status}
          </span>
        </div>
        <span className="text-[12px] text-ink-dim">{date}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr_1.2fr]">
        {/* Item + buyer */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
            {row.itemBrand}
          </div>
          <div className="font-serif text-lg">{row.itemTitle}</div>
          <div className="mt-1 text-[12.5px] text-ink-muted">
            Buyer: {row.buyerEmail}
          </div>
        </div>

        {/* Amounts */}
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-ink-dim">Gross</dt>
            <dd className="text-ink">{formatZar(row.grossCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-dim">Commission</dt>
            <dd className="text-ink">{formatZar(row.commissionCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-border-soft pt-1.5 font-medium">
            <dt>Payout due</dt>
            <dd className="text-ink">{formatZar(row.payoutCents)}</dd>
          </div>
        </dl>

        {/* Seller payout details */}
        <div className="rounded-[3px] border border-border-soft bg-bg p-4">
          <div className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-ink-dim">
            Pay to (EFT)
          </div>
          <div className="text-[13px] font-medium text-ink">{row.sellerName}</div>
          <div className="text-[12px] text-ink-muted">{row.sellerEmail}</div>
          <dl className="mt-2 space-y-0.5 text-[12px] text-ink-muted">
            <BankLine label="Bank" value={row.bank.name} />
            <BankLine label="Account" value={row.bank.accountNumber} />
            <BankLine label="Branch" value={row.bank.branchCode} />
            <BankLine label="Holder" value={row.bank.accountHolder} />
          </dl>
          {!row.bank.accountNumber && (
            <p className="mt-2 text-[11.5px] text-amber-700">
              No banking details on file — request from seller.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function BankLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-16 flex-shrink-0 text-ink-dim">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

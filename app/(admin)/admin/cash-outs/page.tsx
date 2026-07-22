import type { Metadata } from "next";
import Link from "next/link";
import { getCashOutRequests, type AdminCashOutRow } from "@/lib/admin/cash-outs";
import { CashOutActions } from "@/components/admin/CashOutActions";
import { formatZar } from "@/lib/money";

export const metadata: Metadata = { title: "Cash Outs" };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCashOutsPage() {
  const { open, handled } = await getCashOutRequests();

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Acquisitions</p>
        <h1 className="font-serif text-[34px]">Cash-out requests</h1>
        <p className="mt-2 max-w-[640px] text-sm text-ink-muted">
          Sellers who want D&amp;D to buy a piece outright for cash. Reach out to
          make an offer, then mark the request contacted. Nothing here moves money
          — it&apos;s a lead queue.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="eyebrow mb-3">Open ({open.length})</h2>
        {open.length === 0 ? (
          <div className="surface-card p-16 text-center text-ink-muted">
            No open cash-out requests.
          </div>
        ) : (
          <div className="space-y-4">
            {open.map((r) => (
              <CashOutCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-3">Handled ({handled.length})</h2>
        {handled.length === 0 ? (
          <div className="surface-card p-16 text-center text-ink-muted">
            No handled requests yet.
          </div>
        ) : (
          <div className="space-y-4">
            {handled.map((r) => (
              <CashOutCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CashOutCard({ request: r }: { request: AdminCashOutRow }) {
  const badge =
    r.status === "open"
      ? "border-amber-300 text-amber-700"
      : r.status === "contacted"
        ? "border-blue-300 text-blue-700"
        : "border-emerald-300 text-emerald-700";
  return (
    <article className="surface-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/listing/${r.listingId}`}
            className="font-serif text-lg hover:text-gold"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold">
              {r.itemBrand}
            </span>{" "}
            {r.itemTitle}
          </Link>
          <span
            className={`rounded-full border px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${badge}`}
          >
            {r.status}
          </span>
        </div>
        <span className="text-[12px] text-ink-dim">{fmtDate(r.createdAt)}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-1 text-[12.5px] text-ink-muted">
          <div>
            List price:{" "}
            <span className="text-ink">{formatZar(r.listPriceCents)}</span>
          </div>
          {r.listingStatus && (
            <div>
              Listing status:{" "}
              <span className="text-ink">{r.listingStatus}</span>
            </div>
          )}
          <div>
            Seller:{" "}
            <a href={`mailto:${r.sellerEmail}`} className="text-gold hover:underline">
              {r.sellerName ? `${r.sellerName} · ` : ""}
              {r.sellerEmail}
            </a>
          </div>
          {r.handledAt && (
            <div className="text-ink-dim">Handled {fmtDate(r.handledAt)}</div>
          )}
        </div>

        <div className="flex items-start md:justify-end">
          <CashOutActions id={r.id} status={r.status} />
        </div>
      </div>
    </article>
  );
}

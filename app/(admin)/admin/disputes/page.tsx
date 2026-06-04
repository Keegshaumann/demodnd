import type { Metadata } from "next";
import Link from "next/link";
import { getDisputes, type AdminDisputeRow } from "@/lib/admin/disputes";
import { DisputeActions } from "@/components/admin/DisputeActions";
import { formatZar } from "@/lib/money";

export const metadata: Metadata = { title: "Disputes" };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminDisputesPage() {
  const { open, resolved } = await getDisputes();

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Support</p>
        <h1 className="font-serif text-[34px]">Disputes</h1>
        <p className="mt-2 max-w-[640px] text-sm text-ink-muted">
          Review disputes raised by buyers and sellers and record a resolution.
          Resolving logs the decision only — any refund is processed separately
          via PayFast.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="eyebrow mb-3">Open ({open.length})</h2>
        {open.length === 0 ? (
          <div className="surface-card p-16 text-center text-ink-muted">
            No open disputes.
          </div>
        ) : (
          <div className="space-y-4">
            {open.map((d) => (
              <DisputeCard key={d.id} dispute={d} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-3">Resolved ({resolved.length})</h2>
        {resolved.length === 0 ? (
          <div className="surface-card p-16 text-center text-ink-muted">
            No resolved disputes yet.
          </div>
        ) : (
          <div className="space-y-4">
            {resolved.map((d) => (
              <DisputeCard key={d.id} dispute={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DisputeCard({ dispute: d }: { dispute: AdminDisputeRow }) {
  const isOpen = d.status === "open";
  return (
    <article className="surface-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/orders/${d.orderId}`}
            className="font-mono text-[12px] text-ink-dim hover:text-gold"
          >
            #{d.orderId.slice(0, 8).toUpperCase()}
          </Link>
          <span
            className={`rounded-full border px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${
              isOpen
                ? "border-amber-300 text-amber-700"
                : "border-emerald-300 text-emerald-700"
            }`}
          >
            {d.status}
          </span>
        </div>
        <span className="text-[12px] text-ink-dim">{fmtDate(d.raisedAt)}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_1.4fr]">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
            {d.itemBrand}
          </div>
          <div className="font-serif text-lg">{d.itemTitle}</div>
          <div className="mt-1 text-[12.5px] text-ink-muted">
            Buyer: {d.buyerEmail}
          </div>
          <div className="text-[12.5px] text-ink-muted">
            Order total: {formatZar(d.grossCents)}
          </div>
          <div className="mt-1 text-[12px] text-ink-dim">
            Raised by {d.raisedByEmail} ({d.raisedByRole})
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-ink-dim">
            Reason
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">
            {d.reason}
          </p>

          {d.resolution && (
            <div className="mt-3 rounded-[3px] border border-border-soft bg-bg p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink-dim">
                Resolution
              </div>
              <p className="mt-1 text-[13px] text-ink">{d.resolution}</p>
              {d.resolvedAt && (
                <p className="mt-1 text-[11px] text-ink-dim">
                  Resolved {fmtDate(d.resolvedAt)}
                </p>
              )}
            </div>
          )}

          {isOpen && (
            <div className="mt-3">
              <DisputeActions disputeId={d.id} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

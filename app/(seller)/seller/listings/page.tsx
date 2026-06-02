import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { getSellerListings, getSellerSubmissions } from "@/lib/seller/dashboard";
import { formatZar } from "@/lib/money";
import { AUTH_METHOD_LABELS } from "@/lib/marketplace/constants";
import { ListingManager } from "@/components/seller/ListingManager";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { SubmissionStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "My Listings" };

const SUB_STATUS: Record<SubmissionStatus, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "border-amber-300 text-amber-700" },
  more_info: { label: "More info needed", cls: "border-blue-300 text-blue-700" },
  approved: { label: "Approved", cls: "border-emerald-300 text-emerald-700" },
  declined: { label: "Declined", cls: "border-rose-300 text-rose-700" },
};

export default async function SellerListingsPage() {
  const user = await requireRole("seller");
  const [listings, submissions] = await Promise.all([
    getSellerListings(user.id),
    getSellerSubmissions(user.id),
  ]);

  // Submissions that haven't become listings yet (pending/more_info/declined).
  const openSubmissions = submissions.filter((s) => s.status !== "approved");

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Inventory</p>
          <h1 className="font-serif text-[34px]">Listings &amp; submissions</h1>
        </div>
        <Link href="/sell" className="btn btn-primary">
          List a piece <ArrowRightIcon width={16} height={16} />
        </Link>
      </header>

      {/* Submissions in progress */}
      {openSubmissions.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-xl">In review</h2>
          <div className="space-y-3">
            {openSubmissions.map((s) => (
              <div
                key={s.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gold">
                    {s.brand}
                  </span>
                  <div className="font-serif text-lg">{s.title}</div>
                  <div className="text-[12px] text-ink-dim">
                    {AUTH_METHOD_LABELS[s.method]} · {formatZar(s.asking_price_cents)}
                  </div>
                  {s.status === "more_info" && s.admin_notes && (
                    <div className="mt-2 rounded-[3px] border border-border-soft bg-bg px-3 py-2 text-[12.5px] text-ink-muted">
                      <span className="font-medium text-ink">D&amp;D:</span>{" "}
                      {s.admin_notes}
                    </div>
                  )}
                </div>
                <span
                  className={`rounded-full border px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${SUB_STATUS[s.status].cls}`}
                >
                  {SUB_STATUS[s.status].label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Listings */}
      <section>
        <h2 className="mb-4 font-serif text-xl">Your listings</h2>
        {listings.length === 0 ? (
          <div className="surface-card p-16 text-center text-ink-muted">
            You have no listings yet.{" "}
            <Link href="/sell" className="text-gold hover:underline">
              Submit your first piece
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((l) => (
              <ListingManager key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

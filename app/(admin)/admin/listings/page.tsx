import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAdminListings } from "@/lib/admin/listings";
import { ListingActions } from "@/components/admin/ListingActions";
import { formatZar } from "@/lib/money";
import { categoryLabel } from "@/lib/marketplace/constants";
import { CertificateIcon } from "@/components/ui/icons";
import type { ListingStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Listings" };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const STATUS_CLASS: Record<ListingStatus, string> = {
  pending: "border-amber-300 text-amber-700",
  active: "border-emerald-300 text-emerald-700",
  sold: "border-blue-300 text-blue-700",
  delisted: "border-rose-300 text-rose-700",
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const status = (first(params.status) ?? "all") as ListingStatus | "all";
  const listings = await getAdminListings({ q: q || undefined, status });

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Catalogue</p>
        <h1 className="font-serif text-[34px]">Listings</h1>
        <p className="mt-2 max-w-[640px] text-sm text-ink-muted">
          Oversight of every seller&apos;s listings. Delist or remove a
          problematic piece, or correct a price. Sold pieces are locked.
        </p>
      </header>

      <form
        method="get"
        className="surface-card mb-8 flex flex-wrap items-end gap-3 p-5"
      >
        <div className="min-w-[200px] flex-1">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="title, brand or model"
            className="field-input"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="field-input"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="delisted">Delisted</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          Filter
        </button>
      </form>

      {listings.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          No listings match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <article
              key={l.id}
              className="surface-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-[3px] bg-deep">
                  {l.imageUrl ? (
                    <Image
                      src={l.imageUrl}
                      alt={l.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-dim">
                      <CertificateIcon width={18} height={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-gold">
                      {l.brand}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${STATUS_CLASS[l.status]}`}
                    >
                      {l.status}
                    </span>
                    {l.featured && (
                      <span className="rounded-full border border-gold px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
                        Featured
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/listing/${l.id}`}
                    className="font-serif text-lg hover:text-gold"
                  >
                    {l.title}
                  </Link>
                  <div className="mt-0.5 text-[12.5px] text-ink-muted">
                    {categoryLabel(l.category)} · {formatZar(l.priceCents)} ·{" "}
                    {l.sellerName}
                  </div>
                </div>
              </div>
              <ListingActions
                id={l.id}
                status={l.status}
                featured={l.featured}
                priceCents={l.priceCents}
                retailPriceCents={l.retailPriceCents}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

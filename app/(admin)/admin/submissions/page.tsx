import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { formatZar } from "@/lib/money";
import { AUTH_METHOD_LABELS, categoryLabel } from "@/lib/marketplace/constants";
import { SubmissionActions } from "@/components/admin/SubmissionActions";
import type {
  AuthSubmission,
  SubmissionStatus,
  AuthMethod,
} from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Auth Queue" };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "more_info", label: "More info" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AuthQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = first(params.status) ?? "pending";
  const method = first(params.method) ?? "";
  const brand = first(params.brand) ?? "";
  const dateFrom = first(params.date) ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("auth_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status as SubmissionStatus);
  if (method) query = query.eq("method", method as AuthMethod);
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (dateFrom) query = query.gte("submitted_at", dateFrom);

  const { data: submissions } = await query;
  const rows: AuthSubmission[] = submissions ?? [];

  // Seller contact info for display.
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const emailById = new Map<string, string>();
  if (sellerIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name")
      .in("id", sellerIds);
    (users ?? []).forEach((u) =>
      emailById.set(u.id, u.full_name ? `${u.full_name} · ${u.email}` : u.email),
    );
  }

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Authentication</p>
        <h1 className="font-serif text-[34px]">Auth queue</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Review submitted pieces. Approving creates a live listing; the other
          actions email the seller.
        </p>
      </header>

      {/* Filters */}
      <form
        method="get"
        className="surface-card mb-8 flex flex-wrap items-end gap-4 p-5"
      >
        <FilterField label="Status">
          <select name="status" defaultValue={status} className="field-input">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Method">
          <select name="method" defaultValue={method} className="field-input">
            <option value="">All methods</option>
            <option value="photo">Photo Review</option>
            <option value="courier">Courier to D&D</option>
            <option value="dropoff">Drop-off at Depot</option>
          </select>
        </FilterField>
        <FilterField label="Brand">
          <input
            name="brand"
            defaultValue={brand}
            placeholder="e.g. Hermès"
            className="field-input"
          />
        </FilterField>
        <FilterField label="Submitted since">
          <input
            type="date"
            name="date"
            defaultValue={dateFrom}
            className="field-input"
          />
        </FilterField>
        <button type="submit" className="btn btn-primary btn-sm">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          No submissions match these filters.
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((s) => (
            <SubmissionCard
              key={s.id}
              submission={s}
              seller={emailById.get(s.seller_id) ?? s.seller_id}
              photoUrls={s.photo_paths.map(
                (p) =>
                  supabase.storage.from("item-photos").getPublicUrl(p).data
                    .publicUrl,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterField({
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

function StatusPill({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, string> = {
    pending: "border-amber-300 text-amber-700",
    more_info: "border-blue-300 text-blue-700",
    approved: "border-emerald-300 text-emerald-700",
    declined: "border-rose-300 text-rose-700",
  };
  const label: Record<SubmissionStatus, string> = {
    pending: "Pending",
    more_info: "More info",
    approved: "Approved",
    declined: "Declined",
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

function SubmissionCard({
  submission: s,
  seller,
  photoUrls,
}: {
  submission: AuthSubmission;
  seller: string;
  photoUrls: string[];
}) {
  return (
    <article className="surface-card p-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Photos */}
        <div className="grid w-full flex-shrink-0 grid-cols-4 gap-2 lg:w-[320px]">
          {photoUrls.slice(0, 8).map((url, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-[3px] border border-border-soft bg-deep"
            >
              <Image
                src={url}
                alt={`${s.brand} ${s.title} photo ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          ))}
          {photoUrls.length === 0 && (
            <div className="col-span-4 flex aspect-[4/1] items-center justify-center rounded-[3px] border border-border-soft text-[12px] text-ink-dim">
              No photos
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-gold">
              {s.brand}
            </span>
            <StatusPill status={s.status} />
            <span className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              {AUTH_METHOD_LABELS[s.method]}
            </span>
          </div>
          <h3 className="font-serif text-2xl">{s.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-muted">
            <span>{categoryLabel(s.category)}</span>
            <span>{s.condition}</span>
            {s.year && <span>{s.year}</span>}
            <span className="font-medium text-ink">
              {formatZar(s.asking_price_cents)}
            </span>
          </div>
          {s.description && (
            <p className="mt-3 line-clamp-3 text-[13.5px] text-ink-muted">
              {s.description}
            </p>
          )}
          <div className="mt-3 text-[12px] text-ink-dim">
            {seller} · submitted{" "}
            {new Date(s.submitted_at).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
          {s.admin_notes && (
            <div className="mt-3 rounded-[3px] border border-border-soft bg-bg px-3 py-2 text-[12.5px] text-ink-muted">
              <span className="font-medium text-ink">Last note:</span>{" "}
              {s.admin_notes}
            </div>
          )}

          <div className="mt-5 border-t border-border-soft pt-4">
            <SubmissionActions id={s.id} status={s.status} />
          </div>
        </div>
      </div>
    </article>
  );
}

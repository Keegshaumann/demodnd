import type { Metadata } from "next";
import { getReviews } from "@/lib/admin/reviews";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { StarFilledIcon, StarIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Reviews" };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const seller = first(params.seller) ?? "";
  const reviews = await getReviews({ seller: seller || undefined });

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Moderation</p>
        <h1 className="font-serif text-[34px]">Reviews</h1>
        <p className="mt-2 max-w-[640px] text-sm text-ink-muted">
          The most recent buyer reviews. Remove any that violate the marketplace
          guidelines.
        </p>
      </header>

      <form method="get" className="surface-card mb-8 flex items-end gap-3 p-5">
        <div className="flex-1">
          <label className="field-label" htmlFor="seller">
            Filter by seller
          </label>
          <input
            id="seller"
            name="seller"
            defaultValue={seller}
            placeholder="seller name or email"
            className="field-input"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          Filter
        </button>
      </form>

      {reviews.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          {seller ? "No reviews match that seller." : "No reviews yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-[12px] text-ink-dim">
                    {new Date(r.createdAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                  {r.body ? (
                    `“${r.body}”`
                  ) : (
                    <span className="italic text-ink-dim">No written review.</span>
                  )}
                </p>
                <div className="mt-1.5 text-[12px] text-ink-dim">
                  Seller: {r.sellerName} · {r.sellerEmail}
                </div>
              </div>
              <ReviewActions reviewId={r.id} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-gold"
      role="img"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rating ? (
          <StarFilledIcon key={n} width={14} height={14} aria-hidden />
        ) : (
          <StarIcon key={n} width={14} height={14} aria-hidden />
        ),
      )}
    </span>
  );
}

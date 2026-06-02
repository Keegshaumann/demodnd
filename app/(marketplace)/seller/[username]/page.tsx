import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSellerReputation,
  getSellerReviews,
} from "@/lib/marketplace/seller-reputation";
import { getActiveListings } from "@/lib/marketplace/listings";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { AUTH_METHOD_LABELS } from "@/lib/marketplace/constants";
import {
  StarIcon,
  StarFilledIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";

async function lookupSeller(username: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seller_public_profiles")
    .select("user_id, username, display_name, bio")
    .eq("username", username)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const seller = await lookupSeller(username);
  const name = seller?.display_name ?? seller?.username ?? "Seller";
  return { title: `${name} — Seller` };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
      className="inline-flex items-center gap-0.5 text-gold"
    >
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rounded ? (
          <StarFilledIcon key={n} width={15} height={15} aria-hidden />
        ) : (
          <StarIcon key={n} width={15} height={15} aria-hidden />
        ),
      )}
    </span>
  );
}

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const seller = await lookupSeller(username);
  if (!seller?.user_id) notFound();

  const [rep, listings, reviews] = await Promise.all([
    getSellerReputation(seller.user_id),
    getActiveListings({ sellerId: seller.user_id, sort: "featured" }),
    getSellerReviews(seller.user_id),
  ]);

  const name = rep?.displayName ?? seller.display_name ?? seller.username ?? "D&D Seller";
  const memberSince = rep?.memberSince
    ? new Date(rep.memberSince).toLocaleDateString("en-ZA", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      {/* Hero */}
      <header className="border-b border-border-soft bg-surface">
        <div className="dnd-container py-12">
          <nav className="mb-6 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/browse" className="hover:text-ink">
              Shop
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">Seller</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border border-border bg-bg font-serif text-2xl text-ink">
              {initials(name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-[34px]">{name}</h1>
                <CheckCircleIcon
                  width={18}
                  height={18}
                  className="text-gold"
                  aria-label="Verified seller"
                />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Stars rating={rep?.rating ?? 0} />
                  {rep && rep.reviewsCount > 0 ? (
                    <span>
                      {rep.rating.toFixed(2)} ({rep.reviewsCount} reviews)
                    </span>
                  ) : (
                    <span>New seller</span>
                  )}
                </span>
                {memberSince && <span>· Member since {memberSince}</span>}
                {rep?.primaryAuthMethod && (
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-dim">
                    {AUTH_METHOD_LABELS[rep.primaryAuthMethod]}
                  </span>
                )}
              </div>
              {rep?.bio && (
                <p className="mt-3 max-w-[600px] text-[14px] leading-relaxed text-ink-muted">
                  {rep.bio}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-3 gap-6 sm:gap-8">
              <Stat value={rep?.itemsListed ?? 0} label="Listed" />
              <Stat value={rep?.completedTransactions ?? 0} label="Sold" />
              <Stat
                value={rep && rep.reviewsCount > 0 ? rep.rating.toFixed(1) : "—"}
                label="Rating"
              />
            </dl>
          </div>
        </div>
      </header>

      <div className="dnd-container py-14">
        {/* Active listings */}
        <section className="mb-16">
          <h2 className="mb-8 font-serif text-2xl">
            {listings.length > 0
              ? `Pieces by ${name}`
              : "No pieces currently listed"}
          </h2>
          {listings.length > 0 && (
            <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section>
            <h2 className="mb-6 font-serif text-2xl">Buyer reviews</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {reviews.map((r, i) => (
                <div key={i} className="surface-card p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <Stars rating={r.rating} />
                    <span className="text-[12px] text-ink-dim">
                      {new Date(r.createdAt).toLocaleDateString("en-ZA", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {r.body && (
                    <p className="text-[14px] leading-relaxed text-ink-muted">
                      “{r.body}”
                    </p>
                  )}
                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-ink-dim">
                    Verified buyer
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-serif text-3xl text-silver">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
    </div>
  );
}

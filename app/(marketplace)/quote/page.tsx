import type { Metadata } from "next";
import Link from "next/link";
import { QuoteForm } from "@/components/marketplace/QuoteForm";
import { ChevronRightIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "What's it worth?",
  description:
    "Get a free, instant estimate of your luxury piece's resale value — then sell it through D&D Luxury, fully authenticated and insured.",
};

export default function QuotePage() {
  return (
    <section style={{ padding: "64px 0 88px" }}>
      <div className="dnd-container grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">Valuation</span>
          </nav>
          <div className="eyebrow mb-4">Instant valuation</div>
          <h1 className="text-balance" style={{ fontSize: "clamp(34px,4.5vw,56px)", lineHeight: 1.08 }}>
            What&apos;s your piece <em>worth?</em>
          </h1>
          <p className="mt-6 max-w-[460px] text-[16px] leading-relaxed text-ink-muted">
            Tell us what you have and get a free estimate of its resale value in
            seconds — informed by the market and what comparable pieces fetch on
            D&amp;D. No account needed. When you&apos;re ready, list it and we
            handle authentication, insurance and the sale.
          </p>
        </div>
        <QuoteForm />
      </div>
    </section>
  );
}

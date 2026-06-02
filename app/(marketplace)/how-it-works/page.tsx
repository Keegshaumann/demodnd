import type { Metadata } from "next";
import Link from "next/link";
import { FlowTabs } from "@/components/marketplace/FlowTabs";
import { FaqAccordion, type FaqItem } from "@/components/marketplace/FaqAccordion";
import { ChevronRightIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How buying and selling authenticated luxury works on D&D Luxury — end to end.",
};

const FAQ: FaqItem[] = [
  {
    q: "How do you authenticate items?",
    a: "Every piece is examined by a specialist — in person or via high-resolution photos — before listing. We verify hardware, serials, stitching, weight and provenance. Anything we cannot authenticate is declined, no exceptions.",
  },
  {
    q: "What does it cost to sell?",
    a: "Choose a plan from Free to Elite. Commission ranges from 12% down to 3% depending on your tier, and authentication is always free. Your rate is locked in when each piece goes live — changing plans never affects pieces already listed.",
  },
  {
    q: "How and when do I get paid?",
    a: "D&D is the merchant of record: we collect the buyer's payment and settle your net amount — the sale price less commission — via EFT to your registered banking details once the sale is confirmed.",
  },
  {
    q: "Where do you deliver?",
    a: "Cape Town, Johannesburg, Durban and Pretoria by white-glove courier as standard. Other cities by appointment — please contact our concierge team.",
  },
  {
    q: "Do I need an account to buy?",
    a: "Yes. Purchasing requires a verified account — it keeps the marketplace trusted on both sides and takes only a couple of minutes to set up.",
  },
  {
    q: "How long does authentication take?",
    a: "Up to three working days from submission to a decision: approve, request more information, or decline.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <header className="border-b border-border-soft" style={{ padding: "72px 0 56px" }}>
        <div className="dnd-container">
          <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">How It Works</span>
          </nav>
          <div className="eyebrow mb-4">A members&apos; protocol</div>
          <h1 style={{ fontSize: "clamp(34px,5vw,64px)", lineHeight: 1.05 }}>
            The quiet exchange,
            <br />
            end to end.
          </h1>
          <p className="mt-5 max-w-[600px] text-[15px] text-ink-muted">
            Whether you&apos;re buying outright or selling a piece, every
            transaction follows the same considered choreography — authenticated,
            insured, handled with discretion.
          </p>
        </div>
      </header>

      <section style={{ padding: "72px 0 96px" }}>
        <div className="dnd-container">
          <FlowTabs />
        </div>
      </section>

      <section className="border-t border-border-soft bg-surface" style={{ padding: "80px 0" }}>
        <div className="dnd-container">
          <div className="mb-14 text-center">
            <div className="eyebrow mb-3">Considered questions</div>
            <h2 className="font-serif text-[34px]">Frequently asked.</h2>
          </div>
          <FaqAccordion items={FAQ} />
        </div>
      </section>

      <section style={{ padding: "80px 0 96px" }}>
        <div className="dnd-container text-center">
          <div className="eyebrow mb-3">Begin</div>
          <h2 className="mb-5 font-serif" style={{ fontSize: "clamp(30px,4vw,48px)" }}>
            Two minutes. One quiet form.
          </h2>
          <p className="mx-auto mb-9 max-w-[560px] text-[15px] text-ink-muted">
            Buy your first piece, list something rare, or speak to our concierge.
            Every conversation begins here.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/browse" className="btn btn-primary">
              Shop the collection
            </Link>
            <Link href="/sell" className="btn btn-outline">
              Sell with us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

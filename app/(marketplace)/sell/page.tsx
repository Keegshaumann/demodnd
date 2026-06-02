import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guards";
import { SubmissionWizard } from "@/components/auth-portal/SubmissionWizard";
import {
  ShieldIcon,
  CertificateIcon,
  LockIcon,
  StarIcon,
  EyeIcon,
  ChevronRightIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Sell a Piece",
  description:
    "Submit a luxury item to D&D Luxury for authentication and sale.",
};

const BENEFITS = [
  {
    icon: ShieldIcon,
    text: "Insured up to R500,000 per item — every transaction, every transit.",
  },
  {
    icon: CertificateIcon,
    text: "In-person or photo authentication and condition grading at no cost.",
  },
  { icon: LockIcon, text: "Every buyer is verified — ID, address and references." },
  {
    icon: StarIcon,
    text: "D&D handles the sale and settles your share via EFT once delivery is confirmed.",
  },
  {
    icon: EyeIcon,
    text: "Discretion as standard — your name is never shown publicly.",
  },
];

export default async function SellPage() {
  const user = await getCurrentUser();
  const canList = user && (user.role === "seller" || user.role === "admin");

  return (
    <>
      <header className="border-b border-border-soft" style={{ padding: "72px 0 56px" }}>
        <div className="dnd-container">
          <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">Sell</span>
          </nav>
          <div className="eyebrow mb-4">For sellers</div>
          <h1 style={{ fontSize: "clamp(34px,4.5vw,56px)" }}>
            Submit a piece for authentication.
          </h1>
          <p className="mt-4 max-w-[620px] text-[15px] text-ink-muted">
            Tell us about your item, upload photos, and choose how you&apos;d
            like it authenticated. Our team responds within three working days
            with an outcome.
          </p>
        </div>
      </header>

      <div className="dnd-container">
        <div className="grid grid-cols-1 items-start gap-12 py-16 lg:grid-cols-[1.5fr_1fr] lg:gap-[72px]">
          <div>
            {canList ? (
              <SubmissionWizard userId={user.id} />
            ) : (
              <SignInPrompt isBuyer={user?.role === "buyer"} />
            )}
          </div>

          <aside className="lg:sticky lg:top-28">
            <h3 className="mb-3 font-serif text-2xl">Why list with D&amp;D Luxury</h3>
            <p className="mb-7 text-[14px] leading-relaxed text-ink-muted">
              We treat each item as our own — kept impeccable, insured
              throughout, returned to its owner without compromise.
            </p>
            <ul className="space-y-4">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3.5">
                  <Icon
                    width={18}
                    height={18}
                    className="mt-0.5 flex-shrink-0 text-gold"
                  />
                  <span className="text-[14px] leading-relaxed text-ink-muted">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}

function SignInPrompt({ isBuyer }: { isBuyer: boolean }) {
  return (
    <div className="surface-card p-10 text-center sm:p-12">
      <h3 className="mb-3 font-serif text-[26px]">
        {isBuyer ? "Seller account required" : "Sign in to list a piece"}
      </h3>
      <p className="mx-auto mb-7 max-w-[440px] text-[15px] text-ink-muted">
        {isBuyer
          ? "You're signed in with a buyer account. To submit pieces for authentication and sale, you'll need a seller account — please contact D&D Luxury to upgrade."
          : "Listing a piece requires a seller account. Sign in, or create one in moments and choose “Sell”."}
      </p>
      {isBuyer ? (
        <Link href="/concierge" className="btn btn-primary">
          Contact D&amp;D <ArrowRightIcon width={16} height={16} />
        </Link>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/signin?redirect=/sell" className="btn btn-primary">
            Sign in <ArrowRightIcon width={16} height={16} />
          </Link>
          <Link href="/signin?redirect=/sell" className="btn btn-outline">
            Create a seller account
          </Link>
        </div>
      )}
    </div>
  );
}

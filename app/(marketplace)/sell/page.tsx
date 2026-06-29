import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { SubmissionWizard } from "@/components/auth-portal/SubmissionWizard";
import { ClockIcon } from "@/components/ui/icons";
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
    text: "Watches & jewellery double-authenticated in-house; everything else verified via Entrupy — plus condition grading, at no cost.",
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

  // Sellers must be ID-verified by D&D before they can list. Admins bypass.
  let verified = false;
  if (user && user.role === "seller") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("seller_profiles")
      .select("verified")
      .eq("user_id", user.id)
      .maybeSingle();
    verified = data?.verified ?? false;
  }
  const isAdmin = user?.role === "admin";
  const canList = isAdmin || (user?.role === "seller" && verified);
  const isUnverifiedSeller = user?.role === "seller" && !verified;

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
            like to get it to us — watches and jewellery are double-authenticated
            in-house by our specialists; bags, shoes, accessories and apparel are
            verified online via Entrupy. Our team responds within three working
            days with an outcome.
          </p>
        </div>
      </header>

      <div className="dnd-container">
        <div className="grid grid-cols-1 items-start gap-12 py-16 lg:grid-cols-[1.5fr_1fr] lg:gap-[72px]">
          <div>
            {canList ? (
              <SubmissionWizard userId={user.id} />
            ) : isUnverifiedSeller ? (
              <PendingVerification />
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

function PendingVerification() {
  return (
    <div className="surface-card p-10 text-center sm:p-12">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/20 text-gold">
        <ClockIcon width={30} height={30} />
      </div>
      <h3 className="mb-3 font-serif text-[26px]">Verification in progress</h3>
      <p className="mx-auto mb-6 max-w-[460px] text-[15px] text-ink-muted">
        Before you can list, D&amp;D Luxury verifies every seller&apos;s identity —
        a quick ID check that keeps the marketplace trusted on both sides. Our
        team is reviewing your account and will be in touch shortly.
      </p>
      <p className="mx-auto max-w-[460px] text-[13px] text-ink-dim">
        Need to send your documents or have a question?{" "}
        <Link href="/concierge" className="text-gold underline">
          Contact our concierge
        </Link>
        .
      </p>
    </div>
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

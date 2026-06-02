import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms governing use of the D&D Luxury marketplace.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" crumb="Terms" lastUpdated="June 2026">
      <h2>1. About these terms</h2>
      <p>
        These Terms &amp; Conditions govern your use of the D&amp;D Luxury
        marketplace operated by <strong>D&amp;D Luxury (Pty) Ltd</strong> (&ldquo;D&amp;D
        Luxury&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the
        platform you agree to these terms. If you do not agree, please do not use
        the platform.
      </p>

      <h2>2. Eligibility &amp; accounts</h2>
      <p>
        You must be at least 18 years old and able to enter into a binding
        contract. You are responsible for keeping your account credentials secure
        and for all activity under your account. Sellers must complete identity
        verification before listing items.
      </p>

      <h2>3. Authentication &amp; listings</h2>
      <p>
        Every item is independently authenticated and condition-graded by D&amp;D
        Luxury before it is listed. We may approve, request further information
        about, or decline any submission at our discretion. Listing descriptions
        reflect our assessment at the time of authentication.
      </p>

      <h2>4. Buying</h2>
      <ul>
        <li>All prices are shown in South African Rand (ZAR).</li>
        <li>
          Payment is processed securely by Stripe. D&amp;D Luxury is the merchant
          of record for every sale.
        </li>
        <li>
          Delivery is arranged by D&amp;D Luxury and insured in transit. Title and
          risk pass on delivery.
        </li>
        <li>
          A 14-day return applies where an item materially differs from its
          authenticated description.
        </li>
      </ul>

      <h2>5. Selling</h2>
      <ul>
        <li>
          You warrant that you are the rightful owner of any item you submit and
          that it is authentic and lawfully held.
        </li>
        <li>
          D&amp;D Luxury collects the buyer&apos;s payment and pays you your share —
          the sale price less the commission for your subscription tier — by EFT
          to your registered banking details.
        </li>
        <li>
          The commission rate is fixed at the time each item is listed and does
          not change if you later change tiers.
        </li>
      </ul>

      <h2>6. Prohibited conduct</h2>
      <p>
        You may not submit counterfeit, stolen, or misrepresented goods; attempt
        to transact off-platform to avoid fees; or use the platform unlawfully or
        to abuse other members. We may suspend or terminate accounts that breach
        these terms.
      </p>

      <h2>7. Disputes &amp; refunds</h2>
      <p>
        Disputes are handled by D&amp;D Luxury directly. Where a refund is
        warranted it is processed via Stripe, and the corresponding seller payout
        may be withheld. Please contact our concierge to raise an issue.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the extent permitted by law, D&amp;D Luxury&apos;s liability arising from
        your use of the platform is limited to the value of the relevant
        transaction. We do not exclude liability that cannot lawfully be excluded.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        The platform, its branding and content are owned by D&amp;D Luxury and may
        not be copied or reused without permission.
      </p>

      <h2>10. Changes &amp; governing law</h2>
      <p>
        We may update these terms from time to time; continued use constitutes
        acceptance. These terms are governed by the laws of the Republic of South
        Africa.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms? Reach our team via the{" "}
        <a href="/concierge">concierge page</a>.
      </p>
    </LegalShell>
  );
}

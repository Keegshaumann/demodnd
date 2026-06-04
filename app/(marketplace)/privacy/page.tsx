import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How D&D Luxury collects, uses and protects your personal information under POPIA.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" crumb="Privacy" lastUpdated="June 2026">
      <p>
        This policy explains how <strong>D&amp;D Luxury (Pty) Ltd</strong> collects,
        uses, shares and protects your personal information, in line with South
        Africa&apos;s <strong>Protection of Personal Information Act (POPIA)</strong>. For
        the purposes of POPIA, D&amp;D Luxury is the <em>Responsible Party</em>.
      </p>

      <h2>1. Information Officer</h2>
      <p>
        Our Information Officer can be contacted via the{" "}
        <a href="/concierge">concierge page</a>. (Add the registered Information
        Officer&apos;s name and direct contact details before launch.)
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> name, email, phone, password (hashed by our
          auth provider).
        </li>
        <li>
          <strong>Verification (sellers):</strong> identity documents and related
          details used to confirm who you are.
        </li>
        <li>
          <strong>Banking (sellers):</strong> account holder, bank, account
          number and branch code, used only to pay you.
        </li>
        <li>
          <strong>Transactions:</strong> orders, amounts, delivery details. Card
          data is handled by PayFast (PCI-DSS Level 1) — we never see or store
          card numbers.
        </li>
        <li>
          <strong>Usage:</strong> basic technical and interaction data needed to
          run and secure the platform.
        </li>
      </ul>

      <h2>3. Why we process it</h2>
      <p>
        To create and manage your account; authenticate items; process payments
        and arrange delivery; pay sellers; prevent fraud and abuse; comply with
        legal obligations; and communicate with you about your activity.
      </p>

      <h2>4. Who we share it with</h2>
      <p>
        We use trusted Operators (processors) to run the service, including{" "}
        <strong>Supabase</strong> (database, authentication, storage),{" "}
        <strong>PayFast</strong> (payments) and <strong>Resend</strong> (email).
        Some of these process data outside South Africa; where they do, we rely on
        appropriate safeguards as required by POPIA. We do not sell your personal
        information.
      </p>

      <h2>5. Security</h2>
      <p>
        We protect your information with access controls, row-level security,
        encryption in transit, and the principle of least privilege. Banking and
        verification details are accessible only to authorised D&amp;D personnel and
        are never shown to other members.
      </p>

      <h2>6. Retention</h2>
      <p>
        We keep personal information only as long as needed for the purposes above
        or as required by law (for example, financial record-keeping), after which
        it is deleted or de-identified.
      </p>

      <h2>7. Your rights under POPIA</h2>
      <ul>
        <li>Access the personal information we hold about you.</li>
        <li>Request correction or deletion of inaccurate or unnecessary data.</li>
        <li>Object to certain processing.</li>
        <li>
          Lodge a complaint with the Information Regulator (South Africa).
        </li>
      </ul>
      <p>
        To exercise any of these, contact us via the{" "}
        <a href="/concierge">concierge page</a>.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use a small number of essential cookies to keep you signed in and to
        run the platform securely. We do not use advertising trackers. You can
        manage cookies in your browser settings.
      </p>

      <h2>9. Children</h2>
      <p>
        The platform is intended for adults (18+). We do not knowingly collect
        information from children.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy from time to time and will post the revised
        version here with a new &ldquo;last updated&rdquo; date.
      </p>

      <h2>11. Information Regulator</h2>
      <p>
        You may contact the Information Regulator (South Africa) at{" "}
        <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">
          inforegulator.org.za
        </a>
        .
      </p>
    </LegalShell>
  );
}

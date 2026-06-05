"use client";

import { useState } from "react";
import {
  startPayfastCheckoutAction,
  type CheckoutStartInput,
} from "@/lib/checkout/actions";
import { SA_PROVINCES } from "@/lib/marketplace/constants";
import { formatZar } from "@/lib/money";
import { ArrowRightIcon, CertificateIcon } from "@/components/ui/icons";

/**
 * Checkout payment panel. Collects the buyer's delivery address (PayFast's
 * hosted flow doesn't), persists it via a server action keyed by m_payment_id,
 * then auto-submits the returned signed fields to PayFast as a top-level POST.
 */
export function CheckoutForm({
  listingId,
  priceCents,
  sandbox,
}: {
  listingId: string;
  priceCents: number;
  sandbox: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    const input: CheckoutStartInput = {
      listingId,
      recipient: String(fd.get("recipient") ?? ""),
      line1: String(fd.get("line1") ?? ""),
      line2: String(fd.get("line2") ?? ""),
      suburb: String(fd.get("suburb") ?? ""),
      city: String(fd.get("city") ?? ""),
      province: String(fd.get("province") ?? "") as CheckoutStartInput["province"],
      postalCode: String(fd.get("postalCode") ?? ""),
      phone: String(fd.get("phone") ?? ""),
    };

    setPending(true);
    try {
      const result = await startPayfastCheckoutAction(input);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      // Hand off to PayFast: build a hidden form with the signed fields and POST
      // it (top-level navigation — allowed by the CSP form-action allowlist).
      const form = document.createElement("form");
      form.method = "POST";
      form.action = result.processUrl;
      for (const f of result.fields) {
        const field = document.createElement("input");
        field.type = "hidden";
        field.name = f.name;
        field.value = f.value;
        form.appendChild(field);
      }
      document.body.appendChild(form);
      form.submit();
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="caption mb-4 text-gold">Delivery address</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Recipient full name" name="recipient" autoComplete="name" />
        <Field className="sm:col-span-2" label="Contact number" name="phone" type="tel" autoComplete="tel" placeholder="e.g. 082 123 4567" />
        <Field className="sm:col-span-2" label="Street address" name="line1" autoComplete="address-line1" />
        <Field className="sm:col-span-2" label="Apartment, suite, etc. (optional)" name="line2" autoComplete="address-line2" required={false} />
        <Field label="Suburb" name="suburb" autoComplete="address-level3" />
        <Field label="City / town" name="city" autoComplete="address-level2" />
        <div>
          <label htmlFor="province" className="field-label">
            Province
          </label>
          <select id="province" name="province" required defaultValue="" className="field-input">
            <option value="" disabled>
              Select province
            </option>
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Field label="Postal code" name="postalCode" inputMode="numeric" autoComplete="postal-code" placeholder="0000" />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[3px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary btn-lg btn-block mt-7">
        {pending ? "Redirecting to PayFast…" : `Pay ${formatZar(priceCents)} with PayFast`}
        {!pending && <ArrowRightIcon width={16} height={16} />}
      </button>

      {sandbox && (
        <p className="mt-4 rounded-[3px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-800">
          <strong>Sandbox mode.</strong> No real payment is taken. Use PayFast&apos;s
          test card to complete a dry-run.
        </p>
      )}

      <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-dim">
        <CertificateIcon width={14} height={14} /> PCI-DSS Level 1, secured by PayFast.
        Your card details are entered on PayFast and never touch our servers.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  className = "",
  required = true,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  className?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="field-input"
        {...rest}
      />
    </div>
  );
}

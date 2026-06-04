import "server-only";
import { env } from "@/lib/env";

const SANDBOX = env.PAYFAST_MODE !== "live";

/**
 * PayFast endpoints + credentials. Sandbox by default (works with PayFast's
 * shared test credentials before onboarding); set PAYFAST_MODE=live for prod.
 */
export const payfast = {
  mode: SANDBOX ? ("sandbox" as const) : ("live" as const),
  merchantId: env.PAYFAST_MERCHANT_ID,
  merchantKey: env.PAYFAST_MERCHANT_KEY,
  passphrase: env.PAYFAST_PASSPHRASE,
  /** Where the checkout form POSTs the buyer to. */
  processUrl: SANDBOX
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process",
  /** Server-to-server ITN data-validation postback endpoint. */
  validateUrl: SANDBOX
    ? "https://sandbox.payfast.co.za/eng/query/validate"
    : "https://www.payfast.co.za/eng/query/validate",
  /** Hostnames a genuine ITN must originate from (resolved to IPs at runtime). */
  validHosts: SANDBOX
    ? ["sandbox.payfast.co.za"]
    : [
        "www.payfast.co.za",
        "w1w.payfast.co.za",
        "w2w.payfast.co.za",
        "payfast.co.za",
      ],
} as const;

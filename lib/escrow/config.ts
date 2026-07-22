import "server-only";
import { env } from "@/lib/env";

const SANDBOX = env.ESCROW_MODE !== "live";

/**
 * Escrow provider endpoints + credentials, folded into one frozen object
 * (mirror of `lib/payfast/config.ts`). GENERIC placeholders until the chosen
 * provider's docs arrive — provider is Truzo, but the base URL / auth scheme are
 * still `// TODO(escrow-provider)`.
 *
 * `enabled` gates the whole feature: while false (the default), the escrow
 * checkout action and webhook route are inert and the production fail-closed
 * guard in `lib/env.ts` stays dormant. Flip ESCROW_ENABLED=true in Phase 2 once
 * the provider is bound.
 */
export const escrow = {
  enabled: env.ESCROW_ENABLED,
  provider: env.ESCROW_PROVIDER, // stamped onto orders.escrow_provider
  mode: SANDBOX ? ("sandbox" as const) : ("live" as const),
  apiBase: env.ESCROW_API_BASE, // TODO(escrow-provider): from provider docs
  apiKey: env.ESCROW_API_KEY, // TODO(escrow-provider): API key / OAuth / signing secret
  webhookSecret: env.ESCROW_WEBHOOK_SECRET, // TODO(escrow-provider): webhook verification secret
} as const;

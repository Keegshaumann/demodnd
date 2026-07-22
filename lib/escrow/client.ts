import "server-only";
import { escrow } from "@/lib/escrow/config";
import type {
  CreateEscrowInput,
  CreateEscrowResult,
  EscrowProvider,
  EscrowStatus,
  EscrowWebhookResult,
} from "@/lib/escrow/provider";

/**
 * Concrete {@link EscrowProvider} implementation for the chosen provider (Truzo).
 *
 * SCAFFOLD ONLY (ESCROW-COURIER-SPEC.md Phase 1): every provider HTTP call is a
 * `// TODO(escrow-provider)` that throws until Phase 2 binds the real API from
 * Truzo's docs. Reads credentials from {@link escrow} (config.ts). Nothing here
 * runs in the live app yet — the checkout action isn't wired to any UI and the
 * webhook route is gated behind `escrow.enabled`.
 */

export class EscrowProviderNotBoundError extends Error {
  constructor(call: string) {
    super(
      `Escrow provider call '${call}' is not bound yet (TODO(escrow-provider)). ` +
        `Provider='${escrow.provider}', mode='${escrow.mode}'. Bind in Phase 2 from the provider API docs.`,
    );
    this.name = "EscrowProviderNotBoundError";
  }
}

export class GenericEscrowClient implements EscrowProvider {
  async createTransaction(input: CreateEscrowInput): Promise<CreateEscrowResult> {
    // TODO(escrow-provider): POST `${escrow.apiBase}/...` with `escrow.apiKey`.
    // Body from `input` (buyer, seller payout, amountCents→provider units,
    // currency ZAR, itemDescription, our orderRef). Return { escrowId, payUrl }.
    void input;
    throw new EscrowProviderNotBoundError("createTransaction");
  }

  async getTransaction(
    escrowId: string,
  ): Promise<{ status: EscrowStatus; orderRef?: string }> {
    // TODO(escrow-provider): GET the transaction; map provider state→EscrowStatus
    // and surface our stored orderRef. This is the authoritative re-fetch the
    // webhook handler uses to confirm authenticity (spec §7.3).
    void escrowId;
    throw new EscrowProviderNotBoundError("getTransaction");
  }

  async releaseToSeller(escrowId: string): Promise<void> {
    // TODO(escrow-provider): release/disburse held funds to the seller.
    void escrowId;
    throw new EscrowProviderNotBoundError("releaseToSeller");
  }

  async refundToBuyer(escrowId: string): Promise<void> {
    // TODO(escrow-provider): refund held funds to the buyer.
    void escrowId;
    throw new EscrowProviderNotBoundError("refundToBuyer");
  }

  async cancelTransaction(escrowId: string): Promise<void> {
    // TODO(escrow-provider): cancel the transaction.
    void escrowId;
    throw new EscrowProviderNotBoundError("cancelTransaction");
  }

  verifyWebhook(rawBody: string, headers: Headers): EscrowWebhookResult {
    // TODO(escrow-provider): verify the signature/HMAC with `escrow.webhookSecret`,
    // or (if the provider has no signed webhook) shallow-parse here and let the
    // fulfil handler re-fetch via getTransaction to confirm. Return the normalised
    // { valid, escrowId, event }.
    void rawBody;
    void headers;
    throw new EscrowProviderNotBoundError("verifyWebhook");
  }
}

let singleton: EscrowProvider | null = null;

/** The process-wide escrow provider (the stub client until Phase 2 binds Truzo). */
export function getEscrowProvider(): EscrowProvider {
  if (!singleton) singleton = new GenericEscrowClient();
  return singleton;
}

import "server-only";

/**
 * Provider-agnostic escrow adapter interface (ESCROW-COURIER-SPEC.md §7.2).
 *
 * Everything provider-specific hides behind this interface. The concrete
 * implementation ({@link ./client}) is a STUB until the chosen provider's API
 * docs arrive — provider is Truzo (ZAR-native), but their API is partner-gated
 * and not yet bound, so every concrete call is marked `// TODO(escrow-provider)`.
 *
 * Money stays integer ZAR cents throughout the app (`lib/money.ts`); the adapter
 * converts to/from the provider's representation at its own boundary.
 */

/** Where a released escrow pays the seller. Shape is provider-defined — TODO(escrow-provider). */
export interface SellerPayout {
  /** Our current model holds seller banking in `seller_profiles`; the adapter maps it. */
  bankName?: string | null;
  accountNumber?: string | null;
  branchCode?: string | null;
  accountHolder?: string | null;
}

export interface CreateEscrowInput {
  orderRef: string; // our m_payment_id equivalent (unique per attempt)
  amountCents: number; // item + shipping, integer ZAR cents
  currency: "ZAR";
  buyer: { email: string; name: string };
  seller: { id: string; payout: SellerPayout };
  itemDescription: string;
}

export interface CreateEscrowResult {
  escrowId: string;
  payUrl?: string; // set if the provider hosts the pay page (redirect)
}

export type EscrowStatus =
  | "created"
  | "funded"
  | "released"
  | "refunded"
  | "disputed"
  | "cancelled";

/** The webhook events fulfilment reacts to (a normalised subset of provider events). */
export type EscrowWebhookEvent =
  | "funded"
  | "released"
  | "refunded"
  | "disputed"
  | "cancelled";

export interface EscrowWebhookResult {
  valid: boolean;
  escrowId?: string;
  event?: EscrowWebhookEvent;
}

export interface EscrowProvider {
  createTransaction(input: CreateEscrowInput): Promise<CreateEscrowResult>;
  /**
   * Authoritative server-side fetch of a transaction's current state. Also
   * returns our `orderRef` so a webhook (which carries only the provider id) can
   * be mapped back to the originating checkout intent. Providers WITHOUT a
   * signed webhook (e.g. Escrow.com; Truzo TBD) rely on this re-fetch as the real
   * authenticity check — see {@link verifyWebhook} and spec §7.3.
   */
  getTransaction(escrowId: string): Promise<{
    status: EscrowStatus;
    orderRef?: string;
  }>;
  releaseToSeller(escrowId: string): Promise<void>;
  refundToBuyer(escrowId: string): Promise<void>;
  cancelTransaction(escrowId: string): Promise<void>;
  /**
   * Verify an inbound webhook from its raw body + headers. For a provider with a
   * signature/HMAC this checks it; for one without, it does a shallow structural
   * parse and the fulfil handler performs the authoritative {@link getTransaction}
   * re-fetch before acting on it (spec §7.3). Kept synchronous per the spec
   * interface — the network re-fetch lives in fulfilment, not here.
   */
  verifyWebhook(rawBody: string, headers: Headers): EscrowWebhookResult;
}

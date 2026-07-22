# Escrow + Courier Integration Spec

Build spec for two linked changes to the D&D Luxury marketplace:

1. **Payments: replace PayFast with a dedicated escrow provider** (collect, hold, release).
2. **Shipping: integrate JKJ Express (Parcel Perfect API)** for quoting, booking, and tracking.

Fulfilment model is locked as **hub**: `seller -> D&D depot -> buyer`. The courier "from" address is a single static D&D warehouse config value. There is no seller pickup address to capture.

This document is the source of truth for the work. Implement it in the phase order in section 10. Do not free-style outside it. Where a step depends on the escrow provider's API (section 5), stub against the adapter interface and leave a `// TODO(escrow-provider)` marker rather than guessing.

> Read this whole file before writing code. Confirm the phase you are on with the human before starting it.

---

## 1. Current state (what exists today)

Next.js 15 App Router, React 19, Supabase (Postgres + RLS), Tailwind, TypeScript strict. Money is integer ZAR cents throughout (`lib/money.ts`). Path alias `@/*` -> repo root.

Payment today (to be removed):

- Buyer address captured in-app at checkout (PayFast's hosted redirect does not collect one), Zod-validated: `lib/checkout/actions.ts:13-33` (`addressSchema`).
- Address is flattened to a single text blob by `formatShippingAddress` (`lib/checkout/actions.ts:42-60`) and stored on `checkout_intents`, then copied onto the order.
- Signed PayFast fields built in `lib/payfast/checkout.ts` (amount = `chargeCents`, `checkout.ts:44-45`; all four `custom_str1..4` used, `checkout.ts:69-72`). Client auto-POSTs to PayFast (`components/marketplace/CheckoutForm.tsx:63-74`).
- Payment confirmed by ITN webhook `app/api/payfast/itn/route.ts` (`runtime = "nodejs"`, `dynamic = "force-dynamic"`, raw body via `request.text()`). Validation `lib/payfast/itn.ts:60-118`. The only raw `fetch` in the whole app is the PayFast postback `lib/payfast/itn.ts:36-52`.
- Fulfilment `lib/payfast/fulfill.ts:36` -> atomic RPC creates the order as `status='paid'`, deletes the intent (`:168`), sends best-effort buyer+seller emails (`:182-214`). RPCs: `fulfill_payfast_order` (`supabase/migrations/20260604130000_fulfill_payfast_order_fn.sql`, insert `:67-75`) and `fulfill_offer` (`supabase/migrations/20260617120020_fulfill_offer.sql`, insert `:119-123`). Both assert an anti-tamper check that gross equals the expected price.

Orders schema `supabase/migrations/20260602111210_init.sql:152-168` (col rename in `20260603140000_payfast_gateway_reference.sql:8-9`):

```
orders( id, buyer_id, listing_id, seller_id,
        gateway_reference text unique,            -- PayFast m_payment_id
        gross_amount_cents, commission_amount_cents, seller_payout_amount_cents, fee_rate_bps,
        status text check in ('pending','paid','delivered','refunded','disputed'),  -- :162
        shipping_name text, shipping_address text, -- :163-164  single free-text blob
        created_at, paid_at, delivered_at )
```

`OrderStatus` TS union: `lib/supabase/database.types.ts:30-35`. Orders Row/Insert/Update: `database.types.ts:451-503`.

Order lifecycle:

- Orders are born `paid` from the payment webhook (the `pending` default is effectively unused).
- `paid -> delivered` via buyer self-confirm `confirmReceiptAction` (`lib/orders/actions.ts:38-43`) or admin `markOrderDeliveredAction` (`lib/admin/order-actions.ts:26-32`).
- `paid|delivered -> disputed` (`flagOrderDisputedAction`, `lib/admin/order-actions.ts:50-59`).
- `-> refunded` (`recordOrderRefundedAction`, `lib/admin/order-actions.ts:80-90`) is status-only and moves no money today.
- Seller is paid by manual EFT (admin sees bank details on the order page).

What is missing for this work:

- No held-funds / escrow model (deliberately, per `BUILD_PROMPT.md:28` and `PROJECT.md:32`). We are now adding it.
- No courier / waybill / tracking columns anywhere. No `shipped`/`in_transit` state.
- Buyer address is a single unstructured blob, not discrete fields.
- No structured item weight or dimensions (only free-text `listings.measurements`, `20260616120000_stage1_favourites_richer_search.sql:41-44`).

Integration conventions to mirror (do not invent new ones):

- Secrets: one place only, the Zod `serverEnvSchema` in `lib/env.ts:14`, parsed once (`loadEnv` `:118`, exported `env` `:133`). Read `import { env } from "@/lib/env"`, never `process.env` for secrets. Fail-closed live guard example: `assertProductionPayfast` `lib/env.ts:79`.
- Never put secrets in `lib/env.public.ts` (client-safe `NEXT_PUBLIC_*` only).
- Vendor client module pattern: `import "server-only"` at top, build client from `env`, export thin typed wrappers. See `lib/email/client.ts:1,6,22`.
- Sandbox/live config module folds env into one frozen object: `lib/payfast/config.ts:10` (`as const`).
- User-triggered external calls go in `"use server"` actions guarded by `requireUser()` + `rateLimit()` before spending (`lib/valuation/actions.ts:31`, `lib/rate-limit.ts`).
- Inbound webhooks are route handlers under `app/api/**/route.ts` with `runtime="nodejs"` + `dynamic="force-dynamic"`, raw body via `request.text()`, verify, then write via `createAdminClient()` (`lib/supabase/admin.ts:13`). `middleware.ts:15` already excludes `/api`.
- Everything runs on the Node.js runtime by default. No edge concerns for server actions or `/api` routes.

---

## 2. Target architecture

```
Buyer clicks Buy
  -> server action: get courier QUOTE (JKJ) for hub -> buyer, add to item price
  -> server action: create ESCROW transaction with provider (amount = item + shipping)
  -> buyer funds escrow (provider redirect or hosted pay page)
  -> provider webhook "funds secured"
       -> create order (status 'paid', escrow_status 'funded')
       -> book COURIER collection (JKJ), persist waybill + tracking
       -> email buyer + seller
  -> D&D depot dispatches, parcel moves hub -> buyer, tracking updates ingested
  -> delivery confirmed (courier POD event OR buyer confirmReceipt)
       -> after inspection window -> RELEASE escrow to seller
  -> dispute path -> hold / refund via provider
```

Two new self-contained server-only module folders, each mirroring `lib/payfast/`:

- `lib/escrow/` - provider adapter, config, actions, webhook handling.
- `lib/courier/jkj/` - Parcel Perfect auth handshake, quote, book, track.

The escrow release trigger is where the two integrations meet: a confirmed courier delivery (Parcel Perfect POD) plus the buyer inspection window drives the escrow release to the seller.

---

## 3. Locked decisions

- **Escrow model:** dedicated third-party provider API replaces PayFast entirely. Provider handles collect, hold, release, refund.
- **Fulfilment:** hub. Origin is a static D&D warehouse address in config. No seller pickup address is added.
- **Weight/dimensions:** captured at the depot by admin (and/or category defaults), not by the seller. See section 6.4.
- **Logistics status is separate from financial status.** Do not overload `orders.status` or the `delivered` meaning (it currently means "buyer/admin confirmed receipt", not "courier delivered").

---

## 4. What Parcel Perfect (JKJ Express) gives us

Verified live. Pure-JSON HTTP, no SOAP needed. Three services:

| Service | Base (demo) | Use |
| --- | --- | --- |
| eCom v20 | `http://adpdemo.pperfect.com/ecomService/v20/Json/` | quote + book collection/waybill |
| Integration v19 | `http://adpdemo.pperfect.com/ppintegrationservice/v19/Json/` | push own waybills (probably not our path) |
| Track v12 | `http://tracking.pperfect.com/pptrackservice/v12/Json/` | tracking, scan events, POD |

Request shape (all services): HTTP `GET <base>/?params=<URL-encoded JSON>&method=<m>&class=<c>[&token_id=<t>]`. Response envelope: `{ errorcode, errormessage, total, results[] }`, `errorcode === 0` means success.

Auth (class `Auth`, same for all three): `getSalt` -> compute `md5(password + salt)` -> `getSecureToken` -> use `results[0].token_id` on every later call. Node: `crypto.createHash('md5').update(password + salt).digest('hex')`. Cache the token server-side (~24h) and re-validate. The **Track service also requires a `ppcust` courier code** on the auth calls; eCom and Integration do not.

Quote (eCom, class `Quote`):

1. Resolve destination place code: `getPlacesByPostcode` `{ postcode }` (or `getPlacesByName`) -> `results[].place` (numeric id), `results[].town`.
2. `requestQuote` with `params = { details, contents }`.
   - `details`: `orig*` fields (from = D&D warehouse config), `dest*` fields (buyer, structured), `origplace`/`destplace` numeric ids, postal codes, phones, `reference`.
   - `contents`: array of items, each `{ item, desc, pieces, dim1, dim2, dim3 (cm), actmass (kg) }`. At least one item must have `actmass > 0` or no rate is returned. Always an array, even for one item.
   - Response: `results[0].quoteno` and `results[0].rates[]`, each rate has `.service` (3-char code e.g. `ONX`, `ECO`).
3. Optionally `updateService { quoteno, service }` to lock the chosen service.

Book (eCom, class `Collection`) - recommended customer path:

- `quoteToCollection { quoteno, quoteCollectionDate (dd/mm/yyyy), starttime, endtime, notes, printWaybill:1, printLabels:0 }`, or book directly with `submitCollection { details (adds service + accnum), contents (uses key `description`, adds `defitem:1`) }`.
- Response returns the waybill number and printable docs base64-encoded: `results[0].waybillBase64`, `results[0].labelsBase64`. The waybill number identifies the shipment.

Track (Track service, class `Waybill`, every call carries `&token_id`):

- `getWaybillByValue { type: 'reference'|'waybill'|'tracking', value }` -> waybill + POD summary. Lets us resolve our own order reference.
- `getEvents { trackno }` (accepts waybill number for consignment-level events) -> `results[].{ eventdate, eventtime, eventtype, scanrule, hub }`. Event codes include `1`=Out for Delivery, `O`=Collected, `D`=Checked in at depot, `P`=POD captured, etc.
- `getPOD { waybillno }`, `getPODsignature { waybill }` (base64 PNG), `getPODImage`.

Production watch-outs:

- Demo hosts are plain `http://`. Confirm JKJ production is `https://` before sending credentials. Never send creds over plain http in production.
- JKJ runs its own Parcel Perfect instance, so production host, versions, and credentials differ from the demo. See section 12.

---

## 5. INPUT NEEDED: escrow provider API docs

Escrow moves money, so the concrete provider calls are not guessed. Everything provider-specific hides behind the `EscrowProvider` interface (section 7.2). To fill in the adapter, I need from the provider's docs:

- [ ] Provider name and API base URL(s) (sandbox + live).
- [ ] Auth method (API key, OAuth, HMAC signing) and where the credential lives.
- [ ] Create-transaction call: request fields (buyer, seller, amount, currency ZAR, item ref, fee split), response (their transaction id, and whether the buyer pays via a redirect URL or an embedded element).
- [ ] Funding model: does the provider host the payment page (redirect, like PayFast) or do we collect and pass to them? What does "funds secured" look like?
- [ ] Webhook events + signature verification method (this replaces the PayFast ITN validation).
- [ ] Release-to-seller call, refund-to-buyer call, cancel call.
- [ ] Dispute model: does the provider own disputes, or do we keep our own `disputes` table and just hold funds?
- [ ] Whether both parties need KYC/onboarding, and how seller bank details map to their payout.
- [ ] Fees: who pays the escrow fee and how it appears in the amounts.

Until these arrive, Phases 0, 3, 4, 5 (schema + courier) proceed. Phases 1-2 (escrow) are built against the interface with stubbed provider calls, then bound once docs are in.

---

## 6. Data model changes (new migrations)

One migration file per concern, timestamped after the latest existing migration. Mirror new columns into `lib/supabase/database.types.ts`. Do not edit old migrations.

### 6.1 Structured buyer address

Add discrete destination columns so the courier "to" and the escrow record do not depend on parsing the text blob.

- New columns on `checkout_intents` and `orders`: `ship_recipient text`, `ship_line1 text`, `ship_line2 text`, `ship_suburb text`, `ship_city text`, `ship_province text`, `ship_postal_code text`, `ship_phone text`.
- Keep the existing `shipping_name` / `shipping_address` blob for display and backward compatibility; populate both.
- In `lib/checkout/actions.ts`, stop discarding the structured values from `addressSchema` (`:13-33`). Persist the discrete fields on the intent alongside the flattened blob (`formatShippingAddress` stays for display).

### 6.2 Courier / tracking columns on `orders`

- `courier text` (e.g. `'JKJ'`), `courier_service text` (e.g. `'ONX'`), `waybill_number text`, `tracking_number text`, `tracking_url text`, `pp_quoteno text`, `shipping_amount_cents integer default 0`, `dispatched_at timestamptz`, `courier_status text` (free logistics status: `null|'booked'|'collected'|'in_transit'|'out_for_delivery'|'delivered'|'failed'`).
- Do **not** add these to the `status` CHECK enum (`init.sql:162`) or the `OrderStatus` union. Logistics status stays independent so the exhaustive `Record<OrderStatus,...>` maps (buyer `[id]/page.tsx:43-57`, admin pages) and the ledger payable math (`lib/admin/orders.ts:141`) do not break.

### 6.3 Escrow columns on `orders`

- `escrow_provider text`, `escrow_id text unique`, `escrow_status text check in ('created','funded','released','refunded','disputed','cancelled')`, `escrow_funded_at timestamptz`, `escrow_released_at timestamptz`.
- `orders.status='paid'` now means "funds secured in escrow". Actual payout to the seller is the `escrow released` event, tracked by `escrow_status` + `escrow_released_at`, not by `status`.

### 6.4 Item weight / dimensions (for quoting)

- New columns on `listings`: `weight_grams integer`, `length_mm integer`, `width_mm integer`, `height_mm integer` (all nullable).
- Capture path: an admin field at authentication/depot intake, since the hub holds the item. Add the inputs to the admin listing/submission surface, not the seller submission form.
- Fallback: a category-to-default-parcel lookup (in `lib/courier/jkj/parcels.ts`) keyed by `lib/marketplace/constants.ts:4-11` categories, used when a listing has no measured weight. Always validate `actmass > 0` server-side before quoting.

---

## 7. Part A - PayFast to Escrow

### 7.1 Remove / retire PayFast

Once escrow is live and verified, delete or neutralise: `lib/payfast/*` (`checkout.ts`, `itn.ts`, `fulfill.ts`, `config.ts`, `signature.ts`), `app/api/payfast/itn/route.ts`, the PayFast POST in `components/marketplace/CheckoutForm.tsx:63-74`, and the `PAYFAST_*` env vars in `lib/env.ts` + `.env.example`. Keep `lib/payfast/fulfill.ts` as a reference until the escrow webhook replicates its idempotency and email behaviour, then remove.

Keep the reusable, provider-neutral pieces: the commission split (`splitCommission`), the atomic order-insert RPC pattern, and the `checkout_intents` bridge concept.

### 7.2 New `lib/escrow/` module

- `lib/escrow/config.ts` - `import "server-only"`; fold env (`ESCROW_MODE`, base URLs, creds) into a frozen `escrow` object, mirror of `lib/payfast/config.ts:10`.
- `lib/escrow/provider.ts` - the adapter interface (provider-agnostic):

```ts
import "server-only";

export interface CreateEscrowInput {
  orderRef: string;            // our m_payment_id equivalent
  amountCents: number;         // item + shipping
  currency: "ZAR";
  buyer: { email: string; name: string };
  seller: { id: string; payout: SellerPayout };
  itemDescription: string;
}
export interface CreateEscrowResult {
  escrowId: string;
  payUrl?: string;             // set if provider hosts the pay page (redirect)
}
export type EscrowStatus =
  | "created" | "funded" | "released" | "refunded" | "disputed" | "cancelled";

export interface EscrowProvider {
  createTransaction(input: CreateEscrowInput): Promise<CreateEscrowResult>;
  getTransaction(escrowId: string): Promise<{ status: EscrowStatus }>;
  releaseToSeller(escrowId: string): Promise<void>;
  refundToBuyer(escrowId: string): Promise<void>;
  cancelTransaction(escrowId: string): Promise<void>;
  verifyWebhook(rawBody: string, headers: Headers): {
    valid: boolean;
    escrowId?: string;
    event?: "funded" | "released" | "refunded" | "disputed" | "cancelled";
  };
}
```

- `lib/escrow/client.ts` - the concrete implementation of `EscrowProvider` for the chosen provider. **Every provider HTTP call here is `// TODO(escrow-provider)` until section 5 docs arrive.** Read creds from `lib/escrow/config.ts`.
- `lib/escrow/actions.ts` - `"use server"`; `startEscrowCheckoutAction` replacing `startPayfastCheckoutAction`. Guard with `requireUser()` + `rateLimit()`. Flow: validate address (reuse `addressSchema`), get courier quote (Part B), compute `amountCents = itemCents + shippingCents`, call `createTransaction`, persist a `checkout_intents` row (now with structured address + `pp_quoteno` + `shipping_amount_cents`), return `{ payUrl }` or the embedded-pay payload.

### 7.3 Escrow webhook (replaces the ITN)

- `app/api/escrow/route.ts` - mirror `app/api/payfast/itn/route.ts` exactly: `runtime="nodejs"`, `dynamic="force-dynamic"`, raw body via `request.text()`, then `provider.verifyWebhook(...)`. On a valid `funded` event, run the fulfilment handler below. Return 200 on success, 500 to trigger provider retry.
- `lib/escrow/fulfill.ts` - the escrow equivalent of `lib/payfast/fulfill.ts`. On `funded`:
  1. Idempotency: no-op if an order already exists for this `escrow_id`.
  2. Create the order via the atomic RPC (adapt `fulfill_payfast_order`): `status='paid'`, `escrow_status='funded'`, `escrow_id`, structured address, `shipping_amount_cents`, `pp_quoteno`. **Anti-tamper:** the RPC must now expect gross `= item price + shipping_amount_cents`, not item price alone (see the guardrail in section 11).
  3. Book the courier collection (Part B, section 8.3), persist waybill/tracking. Best-effort try/catch, idempotent guard on an existing `waybill_number`.
  4. Send buyer + seller emails (reuse the existing templates).
- On `released` / `refunded` / `disputed` / `cancelled` webhook events, update `escrow_status` + timestamps and the relevant order/dispute state.

### 7.4 Escrow release trigger

Release to the seller when delivery is confirmed and the inspection window has passed:

- Courier POD event (Parcel Perfect `getEvents`/`getPOD`, Part B) marks `courier_status='delivered'` and sets `dispatched_at`/delivery time.
- Buyer `confirmReceiptAction` (`lib/orders/actions.ts:38-43`) remains a manual confirm.
- A release job (or admin action) calls `provider.releaseToSeller(escrow_id)` once `courier_status='delivered'` (or buyer confirmed) AND the inspection window elapsed with no dispute. Set `escrow_status='released'`, `escrow_released_at`.
- Add an admin `releaseEscrowAction` for manual override, alongside the existing order actions.

---

## 8. Part B - JKJ Express (Parcel Perfect) courier

### 8.1 New `lib/courier/jkj/` module

- `lib/courier/jkj/config.ts` - `import "server-only"`; env -> frozen config (base URLs per service sandbox/live, `JKJ_USERNAME`, `JKJ_PASSWORD`, `JKJ_ACCNUM`, `JKJ_PPCUST` for tracking, warehouse origin address). Mirror `lib/payfast/config.ts:10`.
- `lib/courier/jkj/auth.ts` - the `getSalt` -> `md5(password+salt)` -> `getSecureToken` handshake, with server-side token caching + `isTokenValid` re-check. Use `node:crypto` (already used in `lib/payfast/signature.ts:2`).
- `lib/courier/jkj/client.ts` - `import "server-only"`; thin typed wrappers over the JSON GET calls:
  - `getRates(dest, contents)` -> resolve place code, `requestQuote`, return `{ quoteno, rates }`.
  - `bookCollection(quoteno | details, contents)` -> `quoteToCollection`/`submitCollection`, return `{ waybillNumber, waybillPdfBase64, labelsPdfBase64 }`.
  - `track(reference | waybill)` -> `getWaybillByValue` + `getEvents`, return normalised status + events.
  - Use `encodeURIComponent` on the whole `params` JSON blob. Follow the single `fetch` precedent (`lib/payfast/itn.ts:40`).
- `lib/courier/jkj/parcels.ts` - category-to-default-parcel lookup (section 6.4).

### 8.2 Quote at checkout (pre-funding)

- In `startEscrowCheckoutAction` (section 7.2), after parsing the address and before creating the escrow transaction, call `getRates` with the static warehouse origin, the structured buyer destination, and the listing weight/dims (or category default). Pick `rates[0]` (or a chosen service), fold `shipping_amount_cents` into `amountCents`, and persist `pp_quoteno` + `shipping_amount_cents` on the intent.
- UI: replace the hardcoded `White-glove delivery: Included` line (`app/(marketplace)/checkout/[listingId]/page.tsx:198-199`) with a real shipping row and add it into the total. Optionally recompute on address blur in `CheckoutForm.tsx`; the server action is authoritative.

### 8.3 Book collection (post-funding)

- In `lib/escrow/fulfill.ts` on `funded` (section 7.3, step 3), call `bookCollection` using the stored `pp_quoteno` (or full details). Persist `waybill_number`, `tracking_number`, `courier='JKJ'`, `courier_service`, `courier_status='booked'`, `dispatched_at`. Store the label/waybill PDFs (base64) - either to Supabase storage or a `label_url`.
- Idempotent: skip if the order already has a `waybill_number`. Best-effort try/catch so a courier failure never blocks order creation or escrow. Add an admin `bookCollectionAction` retry (mirror `markOrderDeliveredAction` in `lib/admin/order-actions.ts`).

### 8.4 Tracking surfacing

- Admin: extend `OrderDetailRow` (`lib/admin/orders.ts:155-180`, mapping `:218-243`) to select courier/tracking fields; render + a "Book collection" / status control in the Actions panel (`app/(admin)/admin/orders/[id]/page.tsx:117-128`).
- Buyer: expose tracking on `lib/orders/queries.ts` reads and extend the hardcoded 2-step delivery timeline (`app/(buyer)/buyer/orders/[id]/page.tsx:166-183`) with courier events + a tracking link.
- Live status: poll Track `getEvents` (a small server action or cron), map event codes to `courier_status`. If JKJ pushes scan webhooks, add `app/api/courier/jkj/route.ts` (mirror the ITN route) instead of polling.

---

## 9. Environment variables

Add to `lib/env.ts` `serverEnvSchema` (`:14`) with sandbox defaults + a fail-closed live guard modelled on `assertProductionPayfast` (`:79`), and document in `.env.example`:

```
# --- Escrow provider (replaces PayFast) ---
ESCROW_MODE=sandbox            # sandbox | live
ESCROW_API_BASE=...            # from provider docs
ESCROW_API_KEY=...             # or OAuth / signing secret per provider
ESCROW_WEBHOOK_SECRET=...

# --- JKJ Express (Parcel Perfect) ---
JKJ_MODE=sandbox               # sandbox | live
JKJ_ECOM_BASE=http://adpdemo.pperfect.com/ecomService/v20/Json/
JKJ_TRACK_BASE=http://tracking.pperfect.com/pptrackservice/v12/Json/
JKJ_USERNAME=...
JKJ_PASSWORD=...
JKJ_ACCNUM=...                 # customer account number
JKJ_PPCUST=...                 # courier code, Track service only
JKJ_WAREHOUSE_*=...            # static hub origin address fields
```

Remove `PAYFAST_*` once escrow is verified. Courier/escrow secrets never go in `lib/env.public.ts`. Server-to-server calls need no CSP change (`next.config.ts:16-28`); only add an origin there if a label image or provider redirect is rendered in the browser.

---

## 10. Build sequence

Do these in order. Each phase ends with a working, type-checking, test-passing tree. Show the human the diff before applying each phase.

- **Phase 0 - Schema foundation.** Migrations for 6.1-6.4. Mirror into `database.types.ts`. No behaviour change yet. Acceptance: `npm run typecheck` clean, migrations apply.
- **Phase 1 - Escrow module scaffold.** `lib/escrow/` config + interface + client stubs + actions + webhook + fulfil, all against the interface with `// TODO(escrow-provider)` for concrete calls. Acceptance: compiles, unit tests for the fulfil idempotency + anti-tamper logic pass against a fake provider.
- **Phase 2 - Bind escrow provider.** Fill the `client.ts` TODOs from the section 5 docs. Wire the real webhook verification. Swap the checkout UI from PayFast POST to the escrow pay flow. Acceptance: sandbox create -> fund -> webhook -> order created, end to end.
- **Phase 3 - Courier client.** `lib/courier/jkj/` auth + client + parcels. Acceptance: a throwaway script does auth -> quote -> book -> track against the demo endpoints (see section 12 for the standalone proof).
- **Phase 4 - Quote at checkout.** Wire `getRates` into `startEscrowCheckoutAction`, fold shipping into the amount, update the anti-tamper RPC, real shipping row in the UI. Acceptance: buyer sees a real shipping cost; escrow amount = item + shipping.
- **Phase 5 - Book + track.** Book collection in the escrow fulfil handler, persist waybill/tracking, surface on admin + buyer order pages, wire the escrow release on POD/confirm. Acceptance: funded order auto-books a waybill; tracking shows; delivery confirmation releases escrow in sandbox.
- **Phase 6 - Remove PayFast + harden.** Delete `lib/payfast/*` and `PAYFAST_*`, TLS check on JKJ prod, rate limiting on paid endpoints, idempotency/retry tests, sandbox-to-prod dry run.

---

## 11. Guardrails and gotchas

- **Idempotency.** Both the escrow webhook and the courier booking sit in a retried path (providers retry on non-200). Guard order creation on `escrow_id`, and the booking on an existing `waybill_number`, or you double-create orders / double-book collections.
- **Anti-tamper vs shipping.** The existing fulfil RPCs assert gross equals the expected item price (`20260617120020_fulfill_offer.sql`). The moment shipping is folded into the charge, that check rejects every order unless it is taught to expect `item + shipping_amount_cents`. This is easy to miss and silently breaks checkout. Update the RPC in the same phase you add the quote.
- **Do not overload `delivered`.** `orders.status='delivered'` means buyer/admin confirmed receipt. Courier POD is a different signal. Keep it in `courier_status`, not the financial enum.
- **Logistics status stays out of `OrderStatus`.** Extending the union means touching every exhaustive `Record<OrderStatus,...>` map and the ledger math (`lib/admin/orders.ts:141`). Use the separate `courier_status` column instead.
- **`escrow released` is the payout event, not `status`.** Do not infer payout from `status='delivered'`.
- **Track service auth needs `ppcust`.** eCom/Integration do not. Do not copy the eCom auth call verbatim for tracking.
- **TLS.** Demo hosts are plain http. Do not send live credentials over http. Confirm https on JKJ production first.
- **`courier` name collisions.** `AuthMethod='courier'` (`database.types.ts:23`) is how an item reaches D&D for authentication, and `subscription_tiers.courier_credits` is a seller perk. Neither is the delivery courier. Do not reuse these.

---

## 12. What to request from JKJ Express

Before Phase 3 can target production (demo works now):

- [ ] Production base host + exact version numbers for eCom, Integration, and Track (their own instance, not `adpdemo`/`tracking.pperfect.com`).
- [ ] Username (email) + password for their Parcel Perfect instance.
- [ ] Customer account number (`accnum`).
- [ ] `ppcust` courier code (Track service).
- [ ] Valid service codes (ONX, ECO, etc.) and hub codes for their network.
- [ ] Sandbox/test account access (request via support@parcelperfect.com stating JKJ Express as the courier).
- [ ] Confirmation the customer booking path (`requestQuote` -> `quoteToCollection`) is intended, versus Integration `submitWaybill`.
- [ ] Confirmation production is served over https.

Standalone proof-of-life script (Phase 3, before wiring into the app): a small Node script that runs `getSalt` -> `getSecureToken` -> `getPlacesByPostcode` -> `requestQuote` -> `quoteToCollection` -> `getEvents` against the demo endpoints, printing each envelope. This de-risks the API before touching the marketplace code.

---

## 13. Out of scope / do not do

- Do not add a seller pickup address or a direct seller-to-buyer courier flow. Fulfilment is hub only.
- Do not build a bespoke escrow ledger beyond the columns in 6.3. The provider is the source of truth for funds; our columns mirror its state.
- Do not extend the `OrderStatus` financial enum for logistics.
- Do not weaken webhook idempotency or the anti-tamper check for convenience.
- Do not touch `BUILD_PROMPT.md` / `PROJECT.md` (historical); they predate the escrow decision.

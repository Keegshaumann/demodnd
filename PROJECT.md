# D&D Luxury Marketplace — Project Context

> This file is the source of truth for all AI-assisted development on this project.
> Read it before touching any file.

---

## What This Is

D&D Luxury Marketplace is a **custom-built, production-grade luxury goods marketplace** for South Africa.
It allows sellers to list authenticated luxury items for resale and buyers to purchase them securely.
**D&D Luxury** acts as the trusted middleman — authenticating every item before it goes live, collecting payment from buyers, and paying sellers their cut via EFT after the sale is confirmed.

**Client:** D&D Luxury (Pty) Ltd  
**Development Partner:** Cognexa (Pty) Ltd — technical build and ongoing management only. Cognexa holds no IP.  
**Current state of this repo:** Static HTML/CSS/JS demo (design prototype). Must be rebuilt as a full-stack production platform.

---

## Platform Roles

| Role | What They Do |
|---|---|
| **Buyer** | Browses authenticated listings, purchases items via PayFast, raises disputes within 48hrs of delivery |
| **Seller** | Submits items for authentication, manages listings, tracks earnings, chooses subscription tier |
| **D&D Admin** | Reviews authentication submissions, approves/declines listings, manages disputes, releases payouts, configures subscription tiers |

---

## Payment Flow (Critical — Read Carefully)

**PayFast hosted redirect. No split payments. No escrow. D&D is the middleman.**

> **History (only mention of the old gateway):** the original plan was a standard Stripe
> account, but Stripe requires a registered company and D&D trades as a **sole proprietor**.
> The gateway was switched to **PayFast** (SA gateway — sole-proprietor friendly, PCI-DSS
> Level 1, ZAR cards + Instant EFT) on 2026-06-03. See `HANDOFF.md` for the migration
> detail. Everything below describes the current PayFast reality.

The flow is:
1. Buyer checks out in-app at `/checkout/[listingId]` — the platform captures their SA delivery address (stored server-only in `checkout_intents`, keyed by `m_payment_id`), then auto-POSTs a signed form that redirects them to PayFast's hosted payment page
2. Buyer pays on PayFast → funds land directly in **D&D Luxury's PayFast account**
3. D&D receives the full payment — they are the seller of record on the platform
4. PayFast confirms the payment server-to-server via its **ITN webhook** (`app/api/payfast/itn/route.ts`): `lib/payfast/itn.ts` validates it (signature, source IP, validation postback, status + amount), then `lib/payfast/fulfill.ts` atomically creates the order — idempotent on `orders.gateway_reference` (our `m_payment_id`) — marks the listing sold, copies the delivery address onto the order, and emails buyer + seller
5. D&D pays the seller their cut (minus commission) via EFT/bank transfer in their own time
6. The platform tracks order status and records that a sale occurred — it does not hold or manage funds beyond that
7. If a dispute arises → D&D handles it directly: any refund is processed **manually in the PayFast dashboard**; the admin records it on the platform as an order status change only (seller payout withheld)

**Why this matters for development:**
- Use **D&D's own PayFast merchant account** with the hosted-redirect "Custom" flow — no Node SDK exists; the MD5 signature + ITN validation are hand-implemented in `lib/payfast/`
- Fulfilment happens ONLY in the validated ITN webhook — never trust the browser's return redirect; the success page just reads the order by its reference
- **No escrow ledger** — do not build held_amount or escrow tracking
- Orders table tracks payment status (paid/refunded) and delivery status — that's it
- D&D handles all seller payouts offline (EFT) — the platform does not initiate or track these
- Refunds are manual in the PayFast dashboard — the platform never moves money; admin only flips the order status
- Store seller banking details in the admin panel for D&D's reference only

---

## Subscription Tiers

Sellers choose a tier. Tier controls max active listings and transaction fee rate.

| Tier | Monthly Fee | Max Active Listings | Transaction Fee | Auth Included |
|---|---|---|---|---|
| Free | R0 | 1 at a time | 12% | Photo review |
| Starter | TBC | Up to 5 | 8% | Photo + 1 courier/month |
| Professional | TBC | Up to 20 | 5% | Unlimited photo + 2 courier/month |
| Elite | TBC | Unlimited | 3% | All methods + priority review |

- Prices marked TBC will be configured by D&D in the admin panel
- Fee rate at time of listing is locked in — changes don't affect existing listings
- Per-item standalone registration fee (no subscription) is also configurable by admin

---

## Authentication Methods

Every item must be authenticated before listing. Three pathways:

1. **Photo Submission** — seller uploads high-res photos, D&D team reviews
2. **Courier to D&D** — seller ships physical item to D&D depot for hands-on inspection
3. **Drop-off at Depot** — seller delivers in person

All three result in a D&D Authentication Certificate on the listing.
No item may be listed without an authenticated status.
D&D has 3 working days to review and respond (approve / request more info / decline).

---

## Core Features to Build

### Seller
- Registration with identity verification
- Item submission portal (all 3 auth methods)
- Listing management (edit price, delist, relist)
- Subscription tier management
- Sales dashboard — shows completed sales and commission deducted
- Seller public reputation profile (items listed, transactions completed, star rating, member since)
- Banking details stored for D&D's reference when processing EFT payouts

### Buyer
- Browse authenticated listings
- Filter: brand, category, price range, condition, auth method
- View seller reputation profile
- Secure PayFast checkout (hosted redirect; delivery address captured in-app before redirect)
- Personalised Wishlist — add items even if not yet listed
- Wishlist alerts — email + in-platform notification when matching item is listed
- Order history and delivery tracking
- 48hr dispute window post-delivery

### D&D Admin
- Authentication queue (approve, request more info, decline)
- User management (verify, suspend, ban)
- Subscription tier configuration and fee management
- Sales ledger — view all completed orders with commission earned
- Seller banking details panel (for reference when processing EFT payouts offline)
- Dispute management panel
- Featured listings management
- Commission and revenue analytics
- Wishlist demand analytics (what buyers are searching for)

### Platform
- Role-based access (buyer / seller / admin) enforced at DB level
- Automated email: auth outcomes, wishlist alerts, purchase confirmations
- Mobile-responsive across all devices

---

## Design System (from existing demo)

Preserve the existing visual identity exactly. Do not redesign.

**Typography:**
- Headings: `Cormorant Garamond` (serif, elegant)
- Body/UI: `Raleway` + `Inter` (sans-serif)

**Colour palette:**
- Background: `#F8F8F8`
- Surface: `#FFFFFF`
- Primary/Gold: `#0D0D0D` (near-black, used where gold would be)
- Muted text: `#555555`, `#888888`
- Border: `#E5E5E5`

**Aesthetic:** Minimalist, luxury, editorial. No gradients. No bright colours. Serif headings, clean sans UI.

**Existing pages to reference for design language:**
- `index.html` — homepage / hero
- `browse.html` — listing grid
- `listing.html` — single listing detail
- `profile.html` — seller profile
- `list.html` — seller submission flow
- `signin.html` — auth
- `how-it-works.html` — informational
- `concierge.html` — concierge service page

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password + magic link) |
| Payments | PayFast (hosted-redirect "Custom" flow — D&D's own merchant account collects; no split payments) |
| Storage | Supabase Storage (item photos, auth certificates) |
| Email | Resend |
| Styling | Tailwind CSS |
| Hosting | Vercel |

---

## Database — Key Tables

```
users               id, email, role (buyer|seller|admin), created_at
seller_profiles     user_id, display_name, bio, bank_name, bank_account_number, bank_branch_code, reputation_score
subscription_tiers  id, name, monthly_fee, max_listings, transaction_fee_rate
seller_subscriptions user_id, tier_id, status, current_period_end
auth_submissions    id, seller_id, method (photo|courier|dropoff), status, submitted_at
listings            id, seller_id, auth_submission_id, title, brand, category, price, condition, status (pending|active|sold|delisted), fee_rate_at_listing
listing_images      id, listing_id, url, order
wishlists           id, buyer_id, brand, category, description, keywords
checkout_intents    m_payment_id, buyer_id, listing_id, shipping_address (server-only; pre-payment delivery address, copied onto the order by the ITN handler)
orders              id, buyer_id, listing_id, gateway_reference, gross_amount, commission_amount, seller_payout_amount, status (pending|paid|refunded|disputed)
disputes            id, order_id, raised_by, reason, status, resolved_at, resolution
reviews             id, order_id, reviewer_id, seller_id, rating, body
```

---

## Phase Delivery Plan

### Phase 1 — Web Marketplace (6 weeks)
- Weeks 1–2: Architecture, DB, auth system, seller/buyer registration, auth submission portal, listing management, subscription config
- Weeks 3–4: Checkout (PayFast), order tracking, seller reputation, Wishlist + alerts, dashboards, admin panel
- Weeks 5–6: Branding implementation, mobile responsiveness, QA, go-live deployment

### Phase 2 — Mobile App (separate engagement, post Phase 1 go-live)
- React Native + Expo
- Same backend API
- iOS + Android, submitted to App Store and Google Play

### Future Phase — Rental Module
Not in scope for Phase 1 or Phase 2. Do not build rental logic. Do not add rental UI.

---

## Constraints

- All prices in ZAR (South African Rand)
- Jurisdiction: South Africa (POPIA compliance for user data)
- D&D Luxury owns all IP. Cognexa builds and manages only.
- The rental feature is explicitly excluded from Phase 1 and Phase 2
- Subscription prices are TBC — the admin panel must allow D&D to configure them without code changes
- Fee rate is locked at listing creation time — never recalculate based on current tier
- Payments go through D&D's own PayFast merchant account — D&D receives payment directly, pays sellers via offline EFT; refunds are processed manually in the PayFast dashboard
- Source code maintained in private GitHub repo; D&D added as collaborator on go-live

---

## What NOT to Build

- Rental/lease functionality (future phase only)
- Split payments, gateway-managed payouts, or any form of automated seller payouts through PayFast
- Escrow ledger or held-funds tracking
- Social features (follows, feeds, DMs)
- Auction/bidding mechanism
- Any feature not listed in this document without a written change request

---

## Contacts

- **Cognexa (Developer):** Keegan Haumann — keegan.haumann@gmail.com
- **Client:** D&D Luxury — Ronnie James Botes (signed 01/06/2026)

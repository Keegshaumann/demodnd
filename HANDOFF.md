# D&D Luxury Marketplace — Build Handoff & Status

> **Read this first, then read [`PROJECT.md`](PROJECT.md) (the product source of truth)
> and [`BUILD_PROMPT.md`](BUILD_PROMPT.md) (the 14-step build order).**
>
> This file is a complete handoff written so a brand-new session/agent (with zero
> prior context) can continue the build exactly where it stopped. Last updated when
> **all 14 steps were complete** (two multi-agent adversarial review passes done: after
> Step 10 and after Step 14).

---

## 0. TL;DR — where we are right now

We are rebuilding the static HTML demo (in the repo root: `index.html`, `browse.html`,
`listing.html`, etc.) as a **production-grade Next.js 15 full-stack luxury marketplace**.

**Build order is the 14 steps in `BUILD_PROMPT.md`. ✅ ALL 14 STEPS COMPLETE.**
Remaining work is *provisioning + deploy* (real Supabase/Stripe/Resend keys, apply
migrations, assign an admin, deploy to Vercel) — see §5 and §11. No build steps left.

> Second review (after Step 14) over steps 11–14 + the /seller routing: 2 findings, both
> fixed — (a) an invalid wishlist category could create an all-null "match-everything"
> wishlist (now re-validated in `lib/buyer/actions.ts`, guarded in `lib/wishlist/match.ts`,
> + DB CHECK in migration `20260602111240`); (b) star-rating a11y label on the public
> seller profile. The access-control review of the /seller dual-routing found nothing.

> Routing note: `/seller` hosts BOTH the role-gated seller dashboard (`/seller`,
> `/seller/listings|sales|subscription|profile`) AND the PUBLIC reputation profiles
> (`/seller/[username]`). Middleware gates only the dashboard sections (see
> `lib/auth/roles.ts` `matchProtected`); usernames are auto-generated as
> `emaillocal-uid6` so they never collide with those section names.

> A multi-agent adversarial review ran after Step 10 (12 findings, all verified, 11 fixed).
> Notable: migration `20260602111230_review_fixes.sql` (a) removes the seller branch from
> the orders SELECT policy so sellers can't read buyer name/address via the Data API —
> seller dashboards now read orders via the service-role client, non-PII columns only;
> (b) adds a partial unique index `orders_one_per_listing` and the webhook now atomically
> claims the listing (active→sold) + refunds a double-sale. Ledger totals exclude
> refunded/disputed. New RLS tests 8–9 cover both. Finding #4 (missing `/buyer` routes) is
> resolved by Step 11.

| Step | What | Status |
|---|---|---|
| 1 | Scaffold (Next 15, TS strict, Tailwind, Supabase/Stripe/Resend clients, env validation) | ✅ Done |
| 2 | Database schema + RLS (all tables, migrations, seed) | ✅ Done |
| 3 | Auth (email/password + magic link, role middleware) | ✅ Done |
| 4 | Seller submission portal (4-step wizard) | ✅ Done |
| 5 | Admin auth queue (approve / request-info / decline) | ✅ Done |
| 6 | Marketplace pages (`/browse`, `/listing/[id]`, homepage featured grid) | ✅ Done |
| 7 | Stripe checkout + webhook (PaymentIntent + Payment Element) | ✅ Done |
| 8 | Delivery confirmation (order detail + Confirm Receipt) | ✅ Done |
| 9 | Admin sales ledger (`/admin/orders` + EFT banking details) | ✅ Done |
| 10 | Seller dashboard (listings/sales/subscription/profile) + review fixes | ✅ Done |
| 11 | Buyer dashboard (`/buyer` overview, orders, wishlist CRUD) | ✅ Done |
| 12 | Wishlist matching (email + in-platform notification on approval) | ✅ Done |
| 13 | Seller reputation public profile (`/seller/[username]`) | ✅ Done |
| 14 | Admin analytics (`/admin` overview) + tier config (`/admin/tiers`) | ✅ Done |

**The code builds cleanly right now**: `npm run build` and `npx tsc --noEmit` both pass.

> Post-spec additions (beyond the 14 steps): the informational pages `/how-it-works`
> (tabbed buyer/seller flow + FAQ) and `/concierge` (a working contact form that emails
> D&D via Resend) were ported from the demo so every nav/footer link resolves, plus a
> branded `app/not-found.tsx` 404. No rental/finance content (stripped per spec).
>
> Motion layer (restrained, luxury-appropriate; all in globals.css + two components):
> `app/template.tsx` fades page content on every navigation (`.page-in`);
> `components/ui/Reveal.tsx` does staggered scroll-reveals on grids (home/browse/listing
> similar/seller profile); buttons have press feedback; the brand marquee pauses on hover.
> **Everything respects `prefers-reduced-motion`** (global guard) and there's an
> on-brand `:focus-visible` ring for keyboard a11y. transform/opacity only.
>
> Production hardening: loading skeletons (`app/(marketplace)/browse|listing/[id]/loading.tsx`
> + `components/ui/Skeleton.tsx` shimmer), error boundaries (`app/error.tsx` +
> `app/global-error.tsx`), and SEO (`metadataBase`/openGraph/twitter/icons in the root
> layout, `app/robots.ts` disallowing private + seller-dashboard paths while keeping
> `/seller/[username]` crawlable, and a dynamic `app/sitemap.ts`).

### ⚠️ Important reality checks
- **Your local code is safe** regardless of any Claude account. It lives in this git repo.
- **The work is currently UNCOMMITTED.** `git log` shows only the original demo commits.
  Commit it: `git add -A && git commit -m "Next.js rebuild: steps 1-6"`.
- **Nothing is connected to a live backend yet.** There is a `.env.local` with
  **placeholder (fake but valid-format) values** so the app builds/runs locally. To
  actually use auth, DB, payments, or email you must create real Supabase/Stripe/Resend
  accounts and paste real keys (see §5).
- The DB migrations in `supabase/migrations/` have **not been applied to a real
  Supabase project** yet — they were verified locally in Docker (see §7). You must run
  them against your real project.

---

## 1. What this is (one paragraph)

D&D Luxury Marketplace is a South African authenticated-luxury resale marketplace.
Sellers submit items → D&D authenticates them → approved items become listings →
buyers pay via Stripe (funds go straight to **D&D's own Stripe account** — D&D is the
merchant of record) → D&D pays sellers their cut later via **offline EFT**. The platform
only *records* the sale and the reference payout amount. **No Stripe Connect, no escrow,
no automated payouts, no rental features** (the demo had rental UI — it's all stripped).
Full product spec: `PROJECT.md`.

---

## 2. Tech stack & key versions

- **Next.js 15** (App Router, `15.5.x`), **React 19**, **TypeScript strict**
- **Supabase** — `@supabase/supabase-js@^2.106` + `@supabase/ssr@^0.10.3`
  - ⚠️ **These two versions MUST stay matched.** An earlier mismatch (`ssr@0.5`) made
    every typed query resolve to `never`. If typed queries break, check version alignment first.
- **Stripe** — `stripe@^17.7`, API version pinned `2025-02-24.acacia` in `lib/stripe/client.ts`
- **Tailwind CSS v3.4** (NOT v4) — config in `tailwind.config.ts`, design tokens there
- **Resend** — `resend@^4`
- **Zod** — env validation + all API/action input validation
- Node 22+, npm

---

## 3. Architecture & conventions (READ — these are load-bearing)

### Money & fees
- **All money is integer ZAR cents** (`*_cents`). **Never floats.** Helpers in `lib/money.ts`
  (`formatZar`, `randsToCents`, `splitCommission`, `formatBps`).
- **All fee rates are integer basis points** (`*_bps`): 1200 = 12%. `rate = bps / 10000`.

### Supabase clients (`lib/supabase/`)
- `client.ts` → browser client (anon key, RLS-bound). Import in client components.
- `server.ts` → server client (cookie-bound, RLS as the signed-in user). Use in server
  components / actions / route handlers.
- `admin.ts` → **service-role client, BYPASSES RLS.** Only use after verifying the caller
  (e.g. `requireRole('admin')`) or in Stripe webhooks. Never import into client code.
- `database.types.ts` → hand-written `Database` type, **kept in lockstep with the SQL
  migration**. If you change the schema, update this file too (or regenerate with
  `supabase gen types typescript`).
- `middleware.ts` (in `lib/supabase/`) → `updateSession()` for the root `middleware.ts`.

### Env validation
- `lib/env.ts` → **server-only**, Zod-validated, throws at startup if a var is missing.
  Importing it in a client component is a build error (good — keeps secrets server-side).
- `lib/env.public.ts` → the `NEXT_PUBLIC_*` subset, safe for the browser.

### Auth & roles (`lib/auth/`)
- Roles: `buyer | seller | admin`, stored authoritatively in `public.users.role`.
  **Admin is NEVER self-assignable** (DB trigger coerces signups to buyer/seller; the
  `role` column isn't grantable to authenticated users). Assign admin manually:
  `update public.users set role='admin' where email='you@x.com';`
- `roles.ts` → `ROLE_HOME`, `matchProtected`, `roleCanAccess` (pure, shared with edge middleware).
- `guards.ts` → `getCurrentUser()`, `requireUser()`, `requireRole(role)` (server-side, redirect on fail).
- `actions.ts` → `signInAction`, `signUpAction`, `magicLinkAction`, `signOutAction` (server actions).
- `nav-user.ts` → lightweight current-user lookup for nav chrome (degrades to null gracefully).
- **Route protection is two-layer**: root `middleware.ts` gates `/seller`,`/buyer`,`/admin`
  by role, AND each route-group `layout.tsx` calls `requireRole()` (defense in depth).

### Design system (match the demo exactly — it's the visual source of truth)
- Tokens live in `tailwind.config.ts` + reusable component classes in `app/globals.css`
  (`.btn`, `.btn-primary/outline/ghost`, `.field-input`, `.field-label`, `.surface-card`,
  `.pill`, `.eyebrow`, `.dnd-container`).
- Fonts: **Cormorant Garamond** (serif headings) + **Raleway** (sans UI) via `next/font`.
- Colours: bg `#F8F8F8`, surface `#FFFFFF`, border `#E5E5E5`, near-black "gold" `#0D0D0D`,
  ink `#1A1A1A`, muted `#555`/`#888`. **3px radius. No gradients, no bright colours.**
  Shadows: `shadow-sm/md/lg`. Footer is dark (`#0D0D0D`).
- Icons: inline SVGs in `components/ui/icons.tsx` (NO icon-font dependency).
- **No Font Awesome, no rental UI.** When porting a demo page, strip Buy/Rent toggles,
  "Sell or Rent Out", and all "Rentals" links. The CTA is "Sell With Us".

### Email (`lib/email/`)
- `client.ts` → `sendEmail({to,subject,html})`, `ADMIN_NOTIFICATION_EMAIL`.
- `templates.ts` → branded HTML templates (submission received/approved/more-info/declined,
  purchase confirmation, sale notification, wishlist alert, magic link).
- **Email failures must never block the user action** — always `try/catch` and `console.error`.

---

## 4. How to run locally (fresh machine)

```bash
cd /Users/keegshaumann/Documents/GitHub/demodnd   # (or wherever the repo is)
npm install
cp .env.example .env.local        # then fill in REAL values (see §5) — or keep the
                                  # existing .env.local placeholders just to compile
npm run dev                       # http://localhost:3000 (it auto-picks 3001 if busy)
npm run build                     # production build / full typecheck + lint
npx tsc --noEmit                  # typecheck only
```

> The repo already has a `.env.local` with **placeholder** values so it compiles. With
> placeholders, pages render but anything touching Supabase/Stripe/Resend will fail at
> runtime (gracefully where it matters — e.g. the nav just shows "Sign In").

---

## 5. What you MUST provision (real accounts + keys)

Create these and fill `.env.local` (schema enforced by `lib/env.ts` / `lib/env.public.ts`;
see `.env.example` for the canonical list):

1. **Supabase project** (https://supabase.com)
   - From Project Settings → API: `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - **Apply the schema**: run, in order, in the Supabase SQL Editor (or `supabase db push`):
     1. `supabase/migrations/20260602111210_init.sql`
     2. `supabase/migrations/20260602111220_storage.sql`
     3. `supabase/seed.sql`
   - See `supabase/README.md` for details. Then assign yourself admin (SQL above).
2. **Stripe account (STANDARD — not Connect)** (https://stripe.com)
   - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
     and `STRIPE_WEBHOOK_SECRET` (from Developers → Webhooks once Step 7 exists).
3. **Resend** (https://resend.com)
   - `RESEND_API_KEY`, plus `EMAIL_FROM` (verified sender) and `ADMIN_NOTIFICATION_EMAIL`.
4. **App**: `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`, or the Vercel URL).
5. **Deploy target**: Vercel (set all the same env vars in the project settings).

---

## 6. What's DONE in detail (Steps 1–6) + file map

### Step 1 — Scaffold
Config: `package.json`, `tsconfig.json` (strict + `noUncheckedIndexedAccess`),
`next.config.ts` (image remotePatterns for unsplash + supabase; `outputFileTracingRoot`
pinned), `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json` (bans `any` &
`console.log`), `.gitignore`, `.env.example`.
App shell: `app/layout.tsx` (fonts), `app/globals.css` (tokens), `app/(marketplace)/layout.tsx`
(+ homepage), chrome in `components/marketplace/` (`AnnounceBar`, `SiteHeader`, `SiteFooter`,
`HeroDeco`, `HeroSearch`), `components/ui/icons.tsx`, `app/api/health/route.ts`.
Clients/libs: `lib/env.ts`, `lib/env.public.ts`, `lib/money.ts`, `lib/supabase/*`,
`lib/stripe/client.ts`, `lib/email/*`. SVG assets copied to `public/` and `public/brand/`.

### Step 2 — Database (`supabase/`)
- `migrations/20260602111210_init.sql` — 12 tables (`users`, `seller_profiles`,
  `subscription_tiers`, `seller_subscriptions`, `auth_submissions`, `listings`,
  `listing_images`, `wishlists`, `orders`, `disputes`, `reviews`, `notifications`),
  indexes, `is_admin()` (SECURITY DEFINER), triggers (`handle_new_user`,
  `touch_updated_at`, `recompute_seller_reputation`), full RLS policies, and
  **DB-level column locks** (column grants) so authenticated users CANNOT change
  `users.role/status`, `listings.fee_rate_bps`, or order amounts. Public reputation
  exposed via the `seller_public_profiles` view (no banking columns).
- `migrations/20260602111220_storage.sql` — `item-photos` (public read, owner-scoped
  writes) + `certificates` (public read, admin writes) buckets and `storage.objects` policies.
- `seed.sql` — Free/Starter/Pro/Elite tiers (paid prices are placeholders D&D edits).
- `.verify/` — Docker Postgres test harness (stubs Supabase objects, runs migrations,
  asserts 7 RLS behaviours). `README.md` documents apply + verify steps.

### Step 3 — Auth
`middleware.ts` (root) + `lib/supabase/middleware.ts` (session refresh + role gating,
excludes `/api`), `lib/auth/{roles,guards,actions,nav-user}.ts`,
`app/auth/callback/route.ts` (PKCE `code` + `token_hash` OTP), `app/(auth)/signin/page.tsx`
+ `components/auth-portal/{AuthPanels,SignOutButton}.tsx`. The `(seller)/(buyer)/(admin)`
group layouts call `requireRole`.

### Step 4 — Seller submission portal
`lib/marketplace/constants.ts` (categories, conditions, auth methods, brands),
`lib/seller/submissions.ts` (`createSubmissionAction` — Zod validate, insert pending
`auth_submissions`, email admin), `components/auth-portal/SubmissionWizard.tsx` (4 steps:
details → photos to Storage (4–20) → method → review), `app/(marketplace)/sell/page.tsx`
(wizard for sellers, sign-in prompt otherwise).

### Step 5 — Admin auth queue
`components/admin/{AdminShell,AdminNav,SubmissionActions}.tsx`, `lib/admin/submissions.ts`
(`approveSubmissionAction` → creates active listing + copies photos to `listing_images` +
locks the seller's tier fee rate + emails seller + calls `notifyWishlistMatches`;
`requestMoreInfoAction`; `declineSubmissionAction`), `app/(admin)/admin/submissions/page.tsx`
(filter by status/method/brand/date). `app/(admin)/layout.tsx` renders `AdminShell`.
`lib/wishlist/match.ts` is a **stub** (filled in Step 12).

### Step 6 — Marketplace pages
`lib/marketplace/listings.ts` (`getActiveListings(filters)`, `getListingById`,
`getSimilarListings`), `lib/marketplace/seller-reputation.ts` (`getSellerReputation` — uses
service client for order counts, returns only aggregates),
`components/marketplace/{ListingCard,BrowseFilters,BrowseToolbar,ListingGallery,SellerReputation}.tsx`,
`app/(marketplace)/browse/page.tsx` (SSR, filter by category/brand/condition/price/method,
search, sort), `app/(marketplace)/listing/[id]/page.tsx` (gallery, meta, action card,
reputation widget, similar rail, buy panel). Homepage now shows a "Latest pieces" grid.
**Buy button links to `/checkout/[id]` — that route is Step 7.**

---

## 7. How we verify (do this for every step)

1. `npx tsc --noEmit` → clean.
2. `npm run build` → clean (compiles, lints, prerenders).
3. Runtime smoke test: `npm run dev` then `curl` the new routes (200 / correct redirects).
   Protected routes should `307 → /signin?redirect=…` when signed out.
4. **DB changes**: the `supabase/.verify/` Docker harness. To run it (Docker Desktop must
   be running — `open -a Docker`):
   ```bash
   docker run -d --name dnd-pgcheck -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=dnd postgres:16-alpine
   # wait for ready, then:
   for f in .verify/00_stubs.sql migrations/20260602111210_init.sql \
            migrations/20260602111220_storage.sql seed.sql .verify/99_rls_tests.sql; do
     docker exec -i dnd-pgcheck psql -v ON_ERROR_STOP=1 -U postgres -d dnd < "supabase/$f"
   done   # expect: "ALL RLS TESTS PASSED"
   docker rm -f dnd-pgcheck
   ```

There is a Supabase skill available (`/supabase`) — use it for any Supabase work; it has
current best practices and caught the version-mismatch issue. A Stripe skill
(`stripe-best-practices`) exists for Step 7.

---

## 8. Critical decisions & gotchas (the stuff that's easy to get wrong)

1. **No rental. Ever.** The demo is full of rental UI — strip it all.
2. **Standard Stripe, D&D is merchant of record.** No Connect/escrow/payouts/transfers.
   `orders.commission_amount_cents` + `seller_payout_amount_cents` are **reference-only**
   for D&D's manual EFT. Seller banking details are stored for D&D's reference only.
3. **Fee rate is LOCKED at listing creation** (`listings.fee_rate_bps`). Never recalculate.
   Enforced at the DB (column grant) — verified by a test.
4. **Money = integer cents, fees = integer bps.** No floats.
5. **`@supabase/ssr` and `@supabase/supabase-js` versions must match** (see §2).
6. **Admin is manual-only.** Signup can only create buyer/seller.
7. **Banking details never go through anon/authenticated** — base `seller_profiles` is
   owner/admin-only; public reads go through the `seller_public_profiles` view.
8. **`.env.local` currently holds placeholders** so the build works without real keys.
   Real keys needed for any backend behaviour.
9. **Seller public profiles**: a `seller_profiles` row is needed for `/seller/[username]`
   and the reputation widget's name/"member since". We do NOT auto-create it on signup yet.
   **TODO (do this in Step 10 or 13)**: ensure a `seller_profiles` row exists for a seller
   — e.g. upsert one in `createSubmissionAction` (owner can insert their own; username =
   email-local + short uuid suffix, unique). `getSellerReputation` already degrades
   gracefully if it's missing.
10. **`lib/wishlist/match.ts` is a stub.** Step 12 implements `notifyWishlistMatches`;
    it's already called from the approve action, so just fill the function in.

---

## 9. What's LEFT — detailed specs for Steps 7–14

> General rule: keep the design identical to the demo, validate inputs with Zod, money in
> cents, enforce auth with `requireRole`/`requireUser`, and verify with build + curl. After
> each step, confirm before moving on.

### Step 7 — Stripe checkout + webhook  ✅ DONE
Files: `lib/stripe/checkout.ts` (`createListingPaymentIntent` + idempotent
`fulfillPaymentIntent`), `app/api/stripe/webhook/route.ts` (raw-body signature verify),
`app/(marketplace)/checkout/[listingId]/page.tsx` (PaymentIntent + order summary; guards
guest/owner/non-active listings), `components/marketplace/CheckoutForm.tsx` (Payment Element
+ shipping AddressElement), `app/(marketplace)/checkout/success/page.tsx`. Standard account,
ZAR, no `payment_method_types` (dynamic methods). The webhook creates the `orders` row with
the listing's locked `fee_rate_bps`, marks the listing `sold`, and emails buyer + seller —
idempotent on `stripe_payment_intent_id`.
**Test locally**: `stripe login`, then
`stripe listen --forward-to localhost:3000/api/stripe/webhook` (it prints the `whsec_…` for
`STRIPE_WEBHOOK_SECRET`). Test card `4242 4242 4242 4242`.

### Step 8 — Delivery confirmation  ← START HERE
- Order detail page (e.g. `/buyer/orders/[id]`) showing status timeline.
- "Confirm Receipt" button for the buyer → server action: verify the order's `buyer_id`
  matches, then (service-role or an `orders` RLS update policy for buyers) set
  `status='delivered'`, `delivered_at=now()`. Orders currently only allow admin UPDATE via
  RLS, so do this confirmation through a server action that checks ownership then uses the
  admin client (simplest), or add a narrow buyer UPDATE policy.
- Disputes go to D&D directly (no automated flow). A "Report a problem" link is enough.

### Step 9 — Admin sales ledger
- `/admin/orders` (link already in `AdminNav`). Table of all orders: gross, commission
  earned, seller payout due, status, date, **+ the seller's banking details** (from
  `seller_profiles`, admin-readable) for D&D's manual EFT. Filter by date/status/seller.
  Use the server client (admin passes RLS) or admin client.

### Step 10 — Seller dashboard (`/seller`)
- Build `app/(seller)/seller/page.tsx` (+ a seller shell like `AdminShell`). Show: active
  listings (edit price, delist/relist via the allowed column updates), pending submissions
  (statuses), completed sales with commission deducted + net payout (reference), subscription
  tier management (pick/cancel a tier → `seller_subscriptions`), transaction history with
  ratings. **Also ensure the `seller_profiles` row exists here (see §8.9).** Edit display
  name/bio/banking details.

### Step 11 — Buyer dashboard (`/buyer`)
- Build `app/(buyer)/buyer/page.tsx`. Order history + delivery status (links to Step 8 order
  pages), wishlist management (CRUD on `wishlists`: brand/category/keywords/max price).

### Step 12 — Wishlist matching
- Implement `lib/wishlist/match.ts` `notifyWishlistMatches(listingId)` (already called on
  approval). Load the listing; find `wishlists` where brand/category match (and keywords
  appear in title/description, and price ≤ max_price if set); for each matching buyer:
  insert a `notifications` row + send `wishlistAlertBuyerEmail`. Use the service-role client.
  Add an in-app notifications indicator (optional).

### Step 13 — Seller reputation public profile
- Build `app/(marketplace)/seller/[username]/page.tsx`. Look up `seller_public_profiles` by
  username, then reuse `getSellerReputation(userId)`. Show items listed, completed
  transactions, star rating, member since, auth-method badge, and their active listings grid.
  (The reputation widget + data helper already exist from Step 6.)

### Step 14 — Admin analytics
- Build `app/(admin)/admin/page.tsx` (Overview) and/or `/admin/analytics`. Show GMV,
  commission earned (this month + all-time), active listings count, pending submissions
  count, and wishlist demand (top requested brands/categories — aggregate `wishlists`).
  Also `/admin/tiers` (link exists) to configure `subscription_tiers` (prices are TBC/admin-set).
  Use the admin client for aggregates.

---

## 10. Full file inventory (as of Step 6)

```
app/
  layout.tsx, globals.css
  (marketplace)/ layout.tsx, page.tsx, browse/page.tsx, listing/[id]/page.tsx, sell/page.tsx
  (auth)/ layout.tsx, signin/page.tsx
  (seller)/ layout.tsx          (buyer)/ layout.tsx          (admin)/ layout.tsx
  (admin)/admin/submissions/page.tsx
  auth/callback/route.ts        api/health/route.ts
components/
  ui/icons.tsx
  marketplace/ AnnounceBar, SiteHeader, SiteFooter, HeroDeco, HeroSearch,
               ListingCard, BrowseFilters, BrowseToolbar, ListingGallery, SellerReputation
  auth-portal/ AuthPanels, SignOutButton, SubmissionWizard
  admin/ AdminShell, AdminNav, SubmissionActions
lib/
  env.ts, env.public.ts, money.ts
  supabase/ client, server, admin, middleware, database.types
  auth/ roles, guards, actions, nav-user
  email/ client, templates
  stripe/ client
  marketplace/ constants, listings, seller-reputation
  seller/ submissions      admin/ submissions      wishlist/ match (stub)
middleware.ts
supabase/
  migrations/20260602111210_init.sql, migrations/20260602111220_storage.sql
  seed.sql, README.md, .verify/00_stubs.sql, .verify/99_rls_tests.sql
config: package.json, tsconfig.json, next.config.ts, tailwind.config.ts,
        postcss.config.mjs, .eslintrc.json, .gitignore, .env.example, .env.local (gitignored)
demo (DO NOT DELETE — design reference): index.html, browse.html, listing.html, profile.html,
        list.html, signin.html, how-it-works.html, concierge.html, style.css, main.js, *.svg
```

---

## 11. Immediate next actions for you (the human)

1. `git add -A && git commit -m "Next.js rebuild: steps 1-6 + handoff"` (don't lose the work).
2. Create Supabase + Stripe + Resend accounts; fill `.env.local` with real keys (§5).
3. Apply the three SQL files to Supabase; assign yourself admin.
4. In a fresh session, say: *"Read HANDOFF.md and PROJECT.md, then continue from Step 7
   (Stripe checkout) per BUILD_PROMPT.md."*

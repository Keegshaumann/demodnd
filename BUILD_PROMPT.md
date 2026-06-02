# AI Build Prompt — D&D Luxury Marketplace

Paste this entire prompt to your AI when starting a new session on this project.

---

## The Task

You are building the **D&D Luxury Marketplace** — a production-grade, enterprise-scalable luxury goods marketplace for South Africa. The full project context is in `PROJECT.md` in this repo. Read it completely before writing a single line of code.

This repo currently contains a **static HTML/CSS/JS demo** (`index.html`, `browse.html`, `listing.html`, etc.) that serves as the visual and design reference. You are rebuilding this as a full-stack Next.js 15 application. **Do not delete the HTML files** — reference them for design fidelity throughout.

---

## Stack

- **Next.js 15** (App Router, TypeScript strict mode)
- **Supabase** (PostgreSQL + Auth + Storage)
- **Stripe** (standard account — NOT Connect — D&D collects funds, pays sellers via EFT)
- **Tailwind CSS** (preserve existing design system exactly — see PROJECT.md)
- **Resend** (transactional email)
- **Vercel** (deployment target)

---

## Payment Architecture (Non-Negotiable)

Do NOT use Stripe Connect. Do NOT build escrow. Do NOT build automated seller payouts.

The flow is:
1. Buyer pays → Stripe charges buyer → funds land directly in **D&D's Stripe account**
2. D&D is the seller of record — the platform is just the storefront
3. The `orders` table records the sale, amounts, and commission — that's all the tracking needed
4. D&D pays sellers their cut via offline EFT in their own time
5. Seller banking details are stored in the platform for D&D's reference only

The platform has no concept of held funds, escrow release, or payout triggers. Disputes are handled by D&D via Stripe refunds if needed.

---

## Build Order (Follow This Exactly)

### Step 1 — Project Scaffold
- Init Next.js 15 with TypeScript, Tailwind, App Router in this directory
- Set up Supabase client (server + browser)
- Set up Stripe client
- Set up Resend client
- Configure environment variables (create `.env.example` with all required keys)
- Set up the folder structure:
  ```
  /app
    /(auth)         — signin, register
    /(marketplace)  — public marketplace pages
    /(seller)       — seller dashboard, listings, submissions
    /(buyer)        — buyer dashboard, orders, wishlist
    /(admin)        — D&D admin panel (protected)
    /api            — API routes
  /components
    /ui             — shared UI primitives
    /marketplace    — listing cards, filters, search
    /auth-portal    — submission wizard
    /admin          — admin panel components
  /lib
    /supabase       — client, server, types
    /stripe         — payment helpers
    /email          — Resend templates
  ```

### Step 2 — Database Schema
Run the full schema migration in Supabase. Tables required (full schema in PROJECT.md):
`users`, `seller_profiles`, `subscription_tiers`, `seller_subscriptions`, `auth_submissions`, `listings`, `listing_images`, `wishlists`, `orders`, `disputes`, `reviews`

Enable Row Level Security on all tables. Policies:
- Buyers can only read their own orders
- Sellers can only read/write their own listings and submissions
- Admin role bypasses all RLS
- Public can read `listings` where `status = 'active'`

### Step 3 — Auth System
- Supabase Auth with email/password and magic link
- Role assignment at signup (buyer or seller — admin is manually assigned)
- Role stored in `users` table and in Supabase user metadata
- Middleware to protect `/seller/*`, `/buyer/*`, `/admin/*` routes by role

### Step 4 — Seller Authentication Submission Portal
This is the core trust feature. Build a multi-step wizard:
- Step 1: Item details (brand, category, description, condition, asking price)
- Step 2: Photo upload (Supabase Storage, min 4 photos, max 20)
- Step 3: Authentication method selection (Photo Review / Courier to D&D / Drop-off at Depot)
- Step 4: Review and submit
On submit: create `auth_submissions` record (status = 'pending'), email D&D admin

### Step 5 — Admin Authentication Queue
Admin-only page showing all pending submissions. For each:
- View all submitted photos
- Item details
- Action buttons: Approve → creates listing record (status = 'active') / Request More Info → emails seller / Decline → emails seller
- Filter by method, brand, date submitted

### Step 6 — Marketplace Listing Pages
Rebuild `browse.html` and `listing.html` as Next.js pages.
- `/browse` — server-side rendered grid with filtering (brand, category, price, condition, auth method)
- `/listing/[id]` — single listing detail with Stripe checkout button
- Seller reputation widget on listing page
- Preserve all design from the HTML demo exactly

### Step 7 — Stripe Checkout
- Create Stripe Payment Intent on checkout
- On `payment_intent.succeeded` webhook:
  - Create `orders` record (status = 'paid', gross_amount, commission_amount, seller_payout_amount calculated from listing's locked fee_rate)
  - Update listing status to 'sold'
  - Send purchase confirmation email to buyer
  - Send sale notification email to seller

### Step 8 — Delivery Confirmation
- Order detail page shows delivery status
- "Confirm Receipt" button for buyer
- On confirmation: update order status to 'delivered'
- Buyer can raise a dispute via admin — D&D handles resolution and Stripe refund if needed

### Step 9 — Admin Sales Ledger
Admin page showing all completed orders:
- Gross amount, commission earned, seller payout amount due
- Seller name and banking details visible for reference when doing offline EFT
- Filter by date, status, seller

### Step 10 — Seller Dashboard
- Active listings with status
- Pending auth submissions
- Completed sales with commission deducted and net payout amount (for seller's reference)
- Subscription tier management
- Transaction history with buyer ratings

### Step 11 — Buyer Dashboard
- Order history with delivery status
- Wishlist management
- Dispute contact (links to D&D support)

### Step 12 — Wishlist Matching
- When a listing is approved and goes active, query wishlist table for matching entries (brand, category, keywords)
- Send email alert to matching buyers via Resend
- Send in-platform notification (store in a `notifications` table)

### Step 13 — Seller Reputation
Public seller profile page (accessible at `/seller/[username]`):
- Total authenticated items listed
- Total completed transactions
- Star rating (average of buyer reviews)
- Member since date
- Authentication method badge

### Step 14 — Admin Analytics Dashboard
- Total GMV (gross merchandise value)
- Commission earned (month / all time)
- Active listings count
- Pending auth submissions
- Wishlist demand: top searched brands/categories

---

## Design Rules

The existing HTML demo has a specific aesthetic. Replicate it precisely in Tailwind:

- **Headings:** `font-['Cormorant_Garamond']` — elegant, editorial
- **Body/UI:** `font-['Raleway']` — clean, modern luxury
- **Background:** `#F8F8F8` (off-white, not pure white)
- **Cards:** `#FFFFFF` with `border border-[#E5E5E5]`
- **Primary text:** `#1A1A1A`
- **Muted text:** `#555555` / `#888888`
- **Radius:** very subtle — `rounded-[3px]` on cards/buttons
- **No gradients. No bright colours. No playful UI.**
- Shadows: `shadow-[0_4px_16px_rgba(0,0,0,0.08)]`
- Hover transitions: `transition-all duration-300 ease-out`

Reference the `.html` files constantly. Every page you build should look like it belongs in the same family as the demo.

---

## Code Standards

- TypeScript strict — no `any`, no type assertions without justification
- All Supabase queries via typed client (generate types from schema)
- All money in **integer cents** (ZAR cents) — never floats
- All sensitive data (bank details) encrypted at rest
- Input validation on all API routes (use `zod`)
- RLS enforced at DB level — never rely solely on application-level checks
- Environment variables validated at startup with `zod`
- No `console.log` in production code

---

## What Not to Build

- Rental/lease functionality — not in scope, do not add it
- Stripe Connect — wrong payment model for this platform
- Escrow ledger, held-funds tracking, or automated payout logic
- Any bank transfer initiation — D&D handles EFTs entirely offline
- Auctions or bidding
- Social features (follows, feeds, direct messages)
- Any feature not in this document or PROJECT.md

---

## Start Here

Begin with Step 1. Scaffold the project, set up all clients and environment config, then confirm before moving to Step 2 (database schema). The schema is the foundation — get it right before building anything on top of it.

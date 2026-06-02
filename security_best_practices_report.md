# Security Best-Practices Report — D&D Luxury Marketplace

**Date:** June 2026
**Scope:** Full codebase, audited against the Next.js (TypeScript) and React web-security specs (`NEXT-*` rule families).
**Method:** Multi-agent audit — 5 finder agents (one per rule family) grounded in the security spec, each finding independently verified by an adversarial reviewer; only findings ≥7 confidence retained.

## Executive summary

The codebase has a **strong secure-by-default posture**. Authorization is enforced server-side before every privileged action, the RLS-bound vs service-role Supabase client boundary is respected, inputs are Zod-validated, the Stripe webhook verifies signatures against the raw body, redirects are allowlisted to internal paths, and security headers + CSP are in place.

The audit produced **one confirmed finding (Medium)** and **one low-confidence hardening note**. **Both have been fixed** in this pass. No High or Critical issues were found. (Two prior adversarial review passes had already closed a buyer-PII RLS leak, a double-sale race, and a ledger-totals bug.)

---

## Findings

### F-1 — Medium — Stored HTML injection in transactional emails — ✅ FIXED
- **Rule:** NEXT-XSS-001 (untrusted HTML into a rendering sink)
- **Location:** `lib/email/templates.ts` (shared `detailRow`/`paragraph` helpers + `<strong>${title}</strong>` and `notes` sinks)
- **Impact (one sentence):** A seller could embed arbitrary HTML (e.g. a fake "verify payout" phishing link or layout-mangling markup) in `brand`/`title` or admin `notes`, which then rendered **unescaped** inside legitimately-branded D&D emails delivered to buyers, sellers, and the admin team — stored HTML/content injection (mail clients strip `<script>`, so not JS execution).
- **Root cause:** `escapeHtml()` existed but was only applied in the concierge template; the submission/sale/purchase/wishlist templates interpolated user data raw.
- **Fix applied:** `detailRow()` now escapes its value by default; `title` is escaped inside the `<strong>` wrappers; admin `notes` are escaped in their `<div>`; `escapeHtml()` extended to cover `'`. New templates are escaped-by-default.

### F-2 — Low — `.gitignore` did not cover `.env.production` / `.env.development` — ✅ FIXED
- **Rule:** NEXT-SECRETS-001 (don't commit `.env*`)
- **Location:** `.gitignore`
- **Impact:** No present-day exposure (only `.env.example` is tracked; `.env.local` was already ignored). Latent risk that a future `.env.production` with real secrets could be committed.
- **Fix applied:** `.gitignore` now ignores all `.env*` with an exception for `.env.example` (verified: `.env.local`/`.env.production`/`.env.development` ignored, `.env.example` still tracked).

---

## Verified clean (audited, no issues)

| Rule family | Result |
|---|---|
| NEXT-AUTH-001/002 — server-side authz, middleware coverage | ✅ `requireRole`/`requireUser` before every mutation; middleware gates `/admin`,`/buyer` + seller dashboard sections, leaves public `/seller/[username]` open |
| NEXT-ACTION-001 — server actions treated as public endpoints | ✅ all actions auth-checked; service-role client only used after the check (or in the webhook) |
| NEXT-CSRF-001 — CSRF on state-changing endpoints | ✅ Server Actions use Next's built-in Origin check; no `allowedOrigins` widening |
| NEXT-INPUT-001 — runtime validation | ✅ Zod on action inputs |
| NEXT-INJECT-001 — SQL/PostgREST injection | ✅ admin search `.or()` interpolation is sanitized (strips `,()%*`) **and** admin-gated; everything else parameterized |
| NEXT-SSRF-001 — outbound fetch | ✅ no user-influenced server-side `fetch` |
| NEXT-REDIRECT-001 — open redirect | ✅ `safeRedirect` rejects `//` and non-internal targets |
| NEXT-SECRETS-001/002 — client/server boundary | ✅ `server-only` on secret modules; no secrets under `NEXT_PUBLIC_` |
| NEXT-WEBHOOK-001 — webhook raw-body verify | ✅ Stripe webhook verifies signature on the raw body, nodejs runtime |
| NEXT-CACHE-001 — per-user cache leaks | ✅ user data fetched dynamically (cookies), not statically cached |
| NEXT-SUPPLY-001 — version currency | ✅ `next` 15.5.19 (patched for react2shell) |
| NEXT-XSS-001 — React DOM | ✅ no `dangerouslySetInnerHTML` in any component |

---

## Known / accepted limitations (not findings)

- **CSP uses `'unsafe-inline'` for scripts** — required for Next.js inline hydration without a nonce pipeline. A nonce-based CSP is a future hardening step; the important `script-src` allowlist (self + Stripe) is present.
- **2 moderate `npm audit` items** — transitive `postcss` inside Next's own build tooling; not exploitable in our usage and not fixable without breaking Next (clears on the next Next release).
- **Go-live items** (already on the HANDOFF checklist): enable Supabase "Leaked password protection", verify the Resend domain, switch Stripe to live keys + a production webhook, and have a SA attorney review the Terms/Privacy drafts.

---

**Bottom line:** No High/Critical issues. The one real finding (email HTML injection) and the gitignore note are fixed. The application follows the secure-by-default patterns the Next.js spec prescribes.

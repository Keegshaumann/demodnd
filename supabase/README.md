# Supabase — schema & setup

This folder holds the database migrations, seed data, and a local verification
harness for the D&D Luxury Marketplace.

```
supabase/
├── migrations/
│   ├── 20260602111210_init.sql      # tables, indexes, is_admin(), triggers, RLS, grants
│   └── 20260602111220_storage.sql   # storage buckets + storage.objects policies
├── seed.sql                         # subscription tiers (idempotent)
└── .verify/                         # local-only Postgres test harness (not for prod)
```

## Applying to a Supabase project

**Option A — Supabase SQL Editor (quickest):**
Paste and run each file in order:
1. `migrations/20260602111210_init.sql`
2. `migrations/20260602111220_storage.sql`
3. `seed.sql`

**Option B — Supabase CLI:**
```bash
supabase link --project-ref <your-ref>
supabase db push          # applies migrations/
# then run seed.sql via the SQL editor or:
psql "$DATABASE_URL" -f supabase/seed.sql
```

After applying, copy the project URL + keys into `.env.local` (see `.env.example`).

## Design notes

- **Money** is integer ZAR cents (`*_cents`); **fee rates** are integer basis
  points (`*_bps`, e.g. 1200 = 12%). No floats anywhere.
- **RLS** is enabled on every table. Authorization reads `users.role` via
  `is_admin()` (a `SECURITY DEFINER` helper) — never `user_metadata`, which is
  user-editable and unsafe for authz.
- **DB-level locks** (column grants) make critical fields immutable to
  authenticated sessions: `users.role`/`status`, `listings.fee_rate_bps`
  (the locked commission), and the order-amount columns. This enforces the spec
  at the database, not just the app.
- **Banking details** live in `seller_profiles` but the base table is
  owner/admin-only; public reputation is exposed through the
  `seller_public_profiles` view (safe columns only — never banking).
- **Roles**: `handle_new_user` mirrors `auth.users` → `public.users` on signup
  and coerces the role to `buyer`/`seller` only. **Admin is assigned manually**
  (e.g. `update public.users set role='admin' where email='…';`).
- **Storage**: `item-photos` — public bucket for serving approved listing
  images via the public object route, but the authenticated Storage API
  (list/search) is restricted to owner-or-admin so pending/declined submission
  photos can't be enumerated. `certificates` (public read, admin writes).

## Verifying locally (optional)

Requires Docker. Spins up a throwaway Postgres, stubs the Supabase-specific
objects (`auth`/`storage` schemas, `auth.uid()`, roles), applies the migrations,
and runs RLS behaviour assertions:

```bash
docker run -d --name dnd-pgcheck -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=dnd postgres:16-alpine
for i in $(seq 1 40); do docker exec dnd-pgcheck pg_isready -U postgres -d dnd && break; sleep 1; done
for f in .verify/00_stubs.sql migrations/20260602111210_init.sql migrations/20260602111220_storage.sql seed.sql .verify/99_rls_tests.sql; do
  docker exec -i dnd-pgcheck psql -v ON_ERROR_STOP=1 -U postgres -d dnd < "supabase/$f"
done
docker rm -f dnd-pgcheck
```

A successful run prints `ALL RLS TESTS PASSED`.

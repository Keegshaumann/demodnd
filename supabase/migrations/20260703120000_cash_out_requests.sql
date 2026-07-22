-- ============================================================================
-- cash_out_requests — a seller asks D&D to make them an offer to BUY a piece
-- outright (instant liquidity), instead of waiting for a marketplace buyer.
-- ============================================================================
-- This is a LEAD/REQUEST only — no money moves and no order is created. It is
-- the same shape as a dispute: the seller raises it one-click, D&D is emailed,
-- it appears in the /admin/cash-outs queue, and D&D follows up manually to make
-- an offer. Workflow states: open -> contacted -> closed (admin-driven).

create table public.cash_out_requests (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  seller_id    uuid not null references public.users (id) on delete cascade,
  status       text not null default 'open'
                 check (status in ('open', 'contacted', 'closed')),
  admin_notes  text,
  handled_by   uuid references public.users (id),
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index cash_out_requests_status_idx
  on public.cash_out_requests (status, created_at desc);

-- At most ONE open request per listing — a seller can't flood the queue; a new
-- request is only allowed once the previous one is contacted/closed. This is the
-- hard guarantee behind the action's friendly pre-check (double-submit race).
create unique index cash_out_requests_one_open_per_listing
  on public.cash_out_requests (listing_id) where status = 'open';

alter table public.cash_out_requests enable row level security;

-- Seller reads their own requests; admin reads all.
create policy "cash_out: seller or admin read"
  on public.cash_out_requests for select to authenticated
  using ((select auth.uid()) = seller_id or public.is_admin());

-- Seller may raise a request only for a listing THEY own that has not sold.
-- (seller_id is re-checked here so a forged body can't attribute it elsewhere.)
create policy "cash_out: owner insert for own unsold listing"
  on public.cash_out_requests for insert to authenticated
  with check (
    (select auth.uid()) = seller_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status <> 'sold'
    )
  );

-- Only D&D (admin) advances the workflow state / annotates. No money moves.
create policy "cash_out: admin update"
  on public.cash_out_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- RLS governs row access; no delete grant (only the service-role client can).
grant select, insert on public.cash_out_requests to authenticated;

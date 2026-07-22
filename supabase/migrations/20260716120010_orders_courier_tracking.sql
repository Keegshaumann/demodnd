-- ============================================================================
-- courier / tracking columns (2026-07-16) — Phase 0 of the escrow + courier
-- build (ESCROW-COURIER-SPEC.md §6.2): JKJ Express (Parcel Perfect) fields.
-- ============================================================================
-- Logistics state is DELIBERATELY separate from the financial lifecycle:
-- orders.status keeps its CHECK from init.sql untouched ('delivered' still
-- means "buyer/admin confirmed receipt"), and courier movement lives in
-- courier_status instead, so the exhaustive Record<OrderStatus,...> maps and
-- the ledger payable math do not break (spec §11).
--
-- shipping_amount_cents is the courier charge folded into the buyer's total
-- (integer ZAR cents, like every other money column). NOT NULL DEFAULT 0 on
-- orders so ledger arithmetic never meets a null; existing PayFast-era rows
-- backfill to 0 (shipping was never charged separately before).
--
-- The checkout intent also carries the quote (pp_quoteno +
-- shipping_amount_cents): the quote is taken at checkout, pre-funding (spec
-- §7.2/§8.2), persisted on the intent, and copied onto the order at
-- fulfilment — exactly like the address. Nullable on the intent (null = not
-- quoted yet), mirroring the nullable amount_cents added for offers.
--
-- Naming (spec §11): orders.courier is the DELIVERY courier (e.g. 'JKJ').
-- It is unrelated to auth_method='courier' (how an item reaches D&D for
-- authentication) and to subscription_tiers.courier_credits (a seller perk).
--
-- GRANTS/RLS unchanged: these are written server-side only (service-role
-- client); order parties read their own rows via the existing table-level
-- SELECT, and the intent stays invisible to the Data API.
-- ============================================================================
alter table public.orders
  add column courier               text,
  add column courier_service       text,
  add column waybill_number        text,
  add column tracking_number       text,
  add column tracking_url          text,
  add column pp_quoteno            text,
  add column shipping_amount_cents integer not null default 0
               check (shipping_amount_cents >= 0),
  add column dispatched_at         timestamptz,
  add column courier_status        text
               check (courier_status in
                 ('booked', 'collected', 'in_transit',
                  'out_for_delivery', 'delivered', 'failed'));

comment on column public.orders.courier is
  'Delivery courier code (e.g. JKJ). NOT listings.auth_method=''courier'' (authentication intake) and NOT subscription_tiers.courier_credits (seller perk).';
comment on column public.orders.courier_status is
  'Logistics status from the courier (null until booked). Independent of orders.status: ''delivered'' here is the courier POD signal, while orders.status=''delivered'' remains buyer/admin-confirmed receipt.';

alter table public.checkout_intents
  add column pp_quoteno            text,
  add column shipping_amount_cents integer
               check (shipping_amount_cents >= 0);

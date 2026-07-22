-- ============================================================================
-- Security fix — restrict item-photos SELECT to owner/admin (stop enumeration)
-- ============================================================================
-- The original "item-photos: public read" policy granted anon + authenticated
-- SELECT over EVERY object in the bucket. That SELECT grant is exactly what the
-- Storage list/search API enforces, so anyone with the public anon key could
-- enumerate the whole bucket (root -> {seller_uuid}/{draft_id}/... ), leaking
-- the seller auth UUID and the photos of PENDING and DECLINED submissions that
-- never become a public listing (e.g. pieces D&D privately rejected as
-- suspected counterfeits).
--
-- Approved listing images are served through the bucket's PUBLIC object route
-- (/storage/v1/object/public/item-photos/...), which does NOT evaluate these
-- RLS policies, so tightening the authenticated Storage API to owner-or-admin
-- does not change public listing-image display. It only removes the ability of
-- anon / other authenticated users to LIST or read through the authenticated
-- API. (certificates stays public-read: those are meant to be public and hold
-- no pre-approval private data.)
drop policy if exists "item-photos: public read" on storage.objects;

create policy "item-photos: owner or admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'item-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin()
    )
  );

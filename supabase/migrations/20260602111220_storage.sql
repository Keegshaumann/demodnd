-- ============================================================================
-- Storage buckets for item photos and authentication certificates.
-- ============================================================================
-- item-photos:  uploaded by sellers during submission, reused on the live
--               listing. Public read (items become public on approval); writes
--               are scoped to the owner via the first path segment = auth.uid().
-- certificates: D&D authentication certificates shown on listings. Public read;
--               admin-only writes.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('item-photos', 'item-photos', true),
  ('certificates', 'certificates', true)
on conflict (id) do nothing;

-- ---- item-photos -----------------------------------------------------------
create policy "item-photos: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'item-photos');

create policy "item-photos: owner upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "item-photos: owner or admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  )
  with check (
    bucket_id = 'item-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

create policy "item-photos: owner or admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- ---- certificates ----------------------------------------------------------
create policy "certificates: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'certificates');

create policy "certificates: admin write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'certificates' and public.is_admin());

create policy "certificates: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'certificates' and public.is_admin())
  with check (bucket_id = 'certificates' and public.is_admin());

create policy "certificates: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'certificates' and public.is_admin());

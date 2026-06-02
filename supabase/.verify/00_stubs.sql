-- Minimal Supabase environment stubs so the migrations can be validated on a
-- vanilla Postgres image. NOT part of the real schema — verification only.

-- Roles that Supabase provides.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

-- auth schema + minimal auth.users + auth.uid()
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb
);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$$;
create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', 'anon');
$$;

-- storage schema + minimal objects/buckets + foldername()
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean default false
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select string_to_array(name, '/');
$$;

grant usage on schema auth, storage to anon, authenticated, service_role;
grant all on auth.users to service_role;
grant all on storage.objects, storage.buckets to service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated;

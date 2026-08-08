-- WAVERIDER storage table.
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Everything the app persists lives here: orders, leads, site settings,
-- admin auth. Accessed exclusively with the service-role key from the
-- server, so RLS stays enabled with no public policies.

create table if not exists public.store (
  bucket text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (bucket, key)
);

alter table public.store enable row level security;
-- No policies on purpose: anon/authenticated roles get nothing; the
-- service-role key (server only) bypasses RLS.

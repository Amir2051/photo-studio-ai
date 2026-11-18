-- Minu Studio — client gallery delivery (Supabase, free tier).
-- Shares live in gallery_shares; photos live in the public gallery-shares bucket.
-- Anonymous readers can SELECT unexpired shares; no client write path exists —
-- only the create-gallery-share Edge Function (service role) writes after
-- verifying the caller's Firebase ID token.

create table public.gallery_shares (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  name text not null default 'Client gallery',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  photos jsonb not null default '[]'::jsonb
);

alter table public.gallery_shares enable row level security;

create policy gallery_shares_public_read on public.gallery_shares
  for select using (expires_at > now());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-shares', 'gallery-shares', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

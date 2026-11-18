-- Minu Studio — Style Recipe cloud sync (replaces the old Base44 sync).
-- Recipes are scoped to the owner's Supabase auth uid via RLS. Client writes
-- are only allowed for the caller's own rows; deletes are allowed too.

create table public.style_recipes_sync (
  owner_uid text not null,
  local_recipe_id text not null,
  recipe_name text,
  category text default 'custom',
  description text,
  recipe_json text not null,
  updated_at_local timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_uid, local_recipe_id)
);

alter table public.style_recipes_sync enable row level security;

create policy style_recipes_sync_owner on public.style_recipes_sync
  for all using (auth.uid()::text = owner_uid) with check (auth.uid()::text = owner_uid);

grant select, insert, update, delete on public.style_recipes_sync to authenticated;

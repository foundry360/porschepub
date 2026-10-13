-- A contributor's cover image (their car, a place, a detail) shown large on the
-- homepage spotlight, separate from the headshot in avatar_asset_id.
-- Additive only: a nullable column, an index and a column-level read grant.

alter table public.contributors
  add column if not exists cover_asset_id uuid references public.media_assets (id) on delete set null;

create index if not exists contributors_cover_idx on public.contributors (cover_asset_id);

grant select (cover_asset_id) on public.contributors to anon;

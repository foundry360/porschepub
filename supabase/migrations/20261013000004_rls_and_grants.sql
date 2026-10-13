-- =============================================================================
-- Row Level Security, table privileges and storage policies
--
-- Principles
--   1. Deny by default: RLS is enabled everywhere and privileges are revoked
--      from anon/authenticated before being granted back explicitly. This is
--      deliberate so hosted projects (which auto-expose new tables) behave the
--      same as local ones.
--   2. Public (anon) reads see only live content: published stories whose
--      published_at is in the past, and rows that belong to them.
--   3. Editorial staff are identified by public.profiles, never by the mere
--      existence of an Auth account.
--   4. Destructive operations on core records (stories, contributors,
--      categories) are admin-only; editors archive instead of deleting.
-- =============================================================================

-- Enable RLS ------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_asset_private enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.contributors enable row level security;
alter table public.contributor_private enable row level security;
alter table public.stories enable row level security;
alter table public.story_tags enable row level security;
alter table public.related_stories enable row level security;
alter table public.story_slug_history enable row level security;
alter table public.pages enable row level security;
alter table public.site_settings enable row level security;
alter table public.homepage_placements enable row level security;
alter table public.submissions enable row level security;

-- Privileges --------------------------------------------------------------------
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- anon: column-limited reads of public content (no internal user ids).
grant select on public.categories, public.tags, public.story_tags,
  public.related_stories, public.story_slug_history, public.homepage_placements
  to anon;
grant select (id, slug, name, descriptor, bio, avatar_asset_id, expertise, website_url,
  social_url, profile_visible, is_highlighted, created_at, updated_at)
  on public.contributors to anon;
grant select (id, bucket, storage_path, mime_type, byte_size, width, height, alt_text,
  caption, credit, created_at, updated_at)
  on public.media_assets to anon;
grant select (id, slug, format, headline, subtitle, summary, body, body_text, reading_minutes,
  contributor_id, category_id, lead_image_id, status, published_at, seo_title,
  seo_description, og_image_id, canonical_url_override, created_at, updated_at, search_tsv)
  on public.stories to anon;
grant select (id, slug, kind, title, summary, body, legal_reviewed, is_published,
  seo_title, seo_description, created_at, updated_at)
  on public.pages to anon;
grant select (key, value, updated_at) on public.site_settings to anon;

-- authenticated: RLS decides row access; only editorial staff get past it.
grant select, insert, update, delete on
  public.profiles, public.media_assets, public.media_asset_private, public.categories,
  public.tags, public.contributors, public.contributor_private, public.stories,
  public.story_tags, public.related_stories, public.story_slug_history, public.pages,
  public.site_settings, public.homepage_placements
  to authenticated;
grant select, update, delete on public.submissions to authenticated;
grant select, insert on public.audit_log to authenticated;
-- rate_limits: service_role only (through consume_rate_limit()).

-- profiles --------------------------------------------------------------------------
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: admin read all" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "profiles: admin insert" on public.profiles
  for insert to authenticated with check (public.is_admin());
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "profiles: admin delete" on public.profiles
  for delete to authenticated using (public.is_admin());

-- audit_log -------------------------------------------------------------------------
create policy "audit_log: admin read" on public.audit_log
  for select to authenticated using (public.is_admin());
create policy "audit_log: editors append own actions" on public.audit_log
  for insert to authenticated
  with check (public.is_editor() and actor_id = (select auth.uid()));

-- media -----------------------------------------------------------------------------
create policy "media_assets: public read" on public.media_assets
  for select to anon, authenticated using (true);
create policy "media_assets: editors insert" on public.media_assets
  for insert to authenticated with check (public.is_editor());
create policy "media_assets: editors update" on public.media_assets
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "media_assets: editors delete" on public.media_assets
  for delete to authenticated using (public.is_editor());

create policy "media_asset_private: editors" on public.media_asset_private
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- taxonomy ----------------------------------------------------------------------------
create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: editors insert" on public.categories
  for insert to authenticated with check (public.is_editor());
create policy "categories: editors update" on public.categories
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "categories: admin delete" on public.categories
  for delete to authenticated using (public.is_admin());

create policy "tags: public read" on public.tags
  for select to anon, authenticated using (true);
create policy "tags: editors insert" on public.tags
  for insert to authenticated with check (public.is_editor());
create policy "tags: editors update" on public.tags
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "tags: editors delete" on public.tags
  for delete to authenticated using (public.is_editor());

-- stories -------------------------------------------------------------------------------
create policy "stories: public reads live stories" on public.stories
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "stories: editors read all" on public.stories
  for select to authenticated using (public.is_editor());
create policy "stories: editors insert" on public.stories
  for insert to authenticated with check (public.is_editor());
create policy "stories: editors update" on public.stories
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "stories: admin delete" on public.stories
  for delete to authenticated using (public.is_admin());

-- Rows that hang off a story are visible exactly when the story is visible to
-- the caller (the sub-select is itself subject to the stories policies above).
create policy "story_tags: visible with story" on public.story_tags
  for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.id = story_tags.story_id));
create policy "story_tags: editors insert" on public.story_tags
  for insert to authenticated with check (public.is_editor());
create policy "story_tags: editors delete" on public.story_tags
  for delete to authenticated using (public.is_editor());
create policy "story_tags: editors update" on public.story_tags
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "related_stories: visible with both stories" on public.related_stories
  for select to anon, authenticated
  using (
    exists (select 1 from public.stories s where s.id = related_stories.story_id)
    and exists (select 1 from public.stories r where r.id = related_stories.related_story_id)
  );
create policy "related_stories: editors insert" on public.related_stories
  for insert to authenticated with check (public.is_editor());
create policy "related_stories: editors update" on public.related_stories
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "related_stories: editors delete" on public.related_stories
  for delete to authenticated using (public.is_editor());

create policy "story_slug_history: visible with story" on public.story_slug_history
  for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.id = story_slug_history.story_id));
create policy "story_slug_history: editors insert" on public.story_slug_history
  for insert to authenticated with check (public.is_editor());
create policy "story_slug_history: editors update" on public.story_slug_history
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "story_slug_history: editors delete" on public.story_slug_history
  for delete to authenticated using (public.is_editor());

create policy "homepage_placements: visible with story" on public.homepage_placements
  for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.id = homepage_placements.story_id));
create policy "homepage_placements: editors insert" on public.homepage_placements
  for insert to authenticated with check (public.is_editor());
create policy "homepage_placements: editors update" on public.homepage_placements
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "homepage_placements: editors delete" on public.homepage_placements
  for delete to authenticated using (public.is_editor());

-- contributors ---------------------------------------------------------------------------
-- A contributor row is public only when it has an approved public profile or a
-- live story attributed to it (so bylines work). Drafts-only authors stay hidden.
create policy "contributors: public read approved" on public.contributors
  for select to anon, authenticated
  using (
    profile_visible
    or exists (select 1 from public.stories s where s.contributor_id = contributors.id)
  );
create policy "contributors: editors read all" on public.contributors
  for select to authenticated using (public.is_editor());
create policy "contributors: editors insert" on public.contributors
  for insert to authenticated with check (public.is_editor());
create policy "contributors: editors update" on public.contributors
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "contributors: admin delete" on public.contributors
  for delete to authenticated using (public.is_admin());

create policy "contributor_private: editors" on public.contributor_private
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- pages and settings ---------------------------------------------------------------------------
create policy "pages: public reads published" on public.pages
  for select to anon, authenticated using (is_published);
create policy "pages: editors read all" on public.pages
  for select to authenticated using (public.is_editor());
create policy "pages: editors insert" on public.pages
  for insert to authenticated with check (public.is_editor());
create policy "pages: editors update" on public.pages
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "pages: admin delete" on public.pages
  for delete to authenticated using (public.is_admin());

create policy "site_settings: public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings: editors insert" on public.site_settings
  for insert to authenticated with check (public.is_editor());
create policy "site_settings: editors update" on public.site_settings
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "site_settings: editors delete" on public.site_settings
  for delete to authenticated using (public.is_editor());

-- submissions ----------------------------------------------------------------------------------
-- No anon access of any kind. Inserts come from the server using service_role.
create policy "submissions: editors read" on public.submissions
  for select to authenticated using (public.is_editor());
create policy "submissions: editors update" on public.submissions
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "submissions: admin delete" on public.submissions
  for delete to authenticated using (public.is_admin());

-- Storage ---------------------------------------------------------------------------------------
-- Public bucket: delivery URLs for editorial images are intentionally world
-- readable (they are embedded in public pages). Object paths contain random
-- UUIDs. Only editorial staff can write. Size/type limits are enforced by the
-- bucket itself in addition to application-side validation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editorial-media', 'editorial-media', true, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "editorial-media: editors list" on storage.objects
  for select to authenticated
  using (bucket_id = 'editorial-media' and public.is_editor());
create policy "editorial-media: editors upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'editorial-media' and public.is_editor());
create policy "editorial-media: editors update" on storage.objects
  for update to authenticated
  using (bucket_id = 'editorial-media' and public.is_editor())
  with check (bucket_id = 'editorial-media' and public.is_editor());
create policy "editorial-media: editors delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'editorial-media' and public.is_editor());

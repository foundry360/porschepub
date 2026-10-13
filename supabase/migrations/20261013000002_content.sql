-- =============================================================================
-- Editorial content model
--
-- Design notes
--   * Story bodies are structured JSON (an array of typed blocks), validated by
--     the application with Zod. No raw HTML is stored or rendered.
--   * "Live" means: status = 'published' AND published_at <= now(). Setting a
--     future published_at therefore schedules a story without a background job.
--   * Private editorial notes (contributor emails, image licence notes) live in
--     separate *_private tables so public read policies never expose them.
--   * Format-neutral by design: `stories.format` allows video/audio/interview
--     stories later without a redesign (body blocks + embed block already
--     support media).
-- =============================================================================

-- Media -----------------------------------------------------------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'editorial-media',
  storage_path text not null check (char_length(storage_path) between 1 and 300),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 15728640),
  width integer not null check (width > 0 and width <= 20000),
  height integer not null check (height > 0 and height <= 20000),
  alt_text text not null default '' check (char_length(alt_text) <= 500),
  caption text check (char_length(caption) <= 500),
  credit text check (char_length(credit) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

create table public.media_asset_private (
  asset_id uuid primary key references public.media_assets (id) on delete cascade,
  license_note text check (char_length(license_note) <= 1000),
  source_note text check (char_length(source_note) <= 1000),
  updated_at timestamptz not null default now()
);

-- Taxonomy ----------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 600),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

-- Contributors ---------------------------------------------------------------------
create table public.contributors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 120),
  descriptor text check (char_length(descriptor) <= 160),
  bio text check (char_length(bio) <= 3000),
  avatar_asset_id uuid references public.media_assets (id) on delete set null,
  expertise text[] not null default '{}' check (coalesce(array_length(expertise, 1), 0) <= 12),
  website_url text check (website_url ~ '^https://[^\s]+$' and char_length(website_url) <= 500),
  social_url text check (social_url ~ '^https://[^\s]+$' and char_length(social_url) <= 500),
  -- Controls whether a public profile page exists. Attribution on published
  -- stories is always shown; the profile page is opt-in per contributor.
  profile_visible boolean not null default false,
  is_highlighted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger contributors_set_updated_at
  before update on public.contributors
  for each row execute function public.set_updated_at();

create table public.contributor_private (
  contributor_id uuid primary key references public.contributors (id) on delete cascade,
  email text check (char_length(email) <= 254),
  notes text check (char_length(notes) <= 3000),
  updated_at timestamptz not null default now()
);

-- Stories -----------------------------------------------------------------------------
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  format text not null default 'article' check (format in ('article', 'interview', 'video', 'audio', 'gallery')),
  headline text not null check (char_length(headline) between 1 and 200),
  subtitle text check (char_length(subtitle) <= 300),
  summary text check (char_length(summary) <= 500),
  body jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  -- Plain-text extraction of `body`, maintained by the application on save.
  -- Feeds full-text search only; never rendered.
  body_text text not null default '',
  reading_minutes smallint not null default 1 check (reading_minutes between 1 and 240),
  contributor_id uuid references public.contributors (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  lead_image_id uuid references public.media_assets (id) on delete set null,
  status public.story_status not null default 'draft',
  published_at timestamptz,
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  og_image_id uuid references public.media_assets (id) on delete set null,
  -- Only for syndicated/republished work. Must be an absolute https URL.
  canonical_url_override text check (canonical_url_override ~ '^https://[^\s]+$' and char_length(canonical_url_override) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(headline, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) stored,
  constraint stories_published_has_date check (status <> 'published' or published_at is not null)
);

create index stories_search_idx on public.stories using gin (search_tsv);
create index stories_live_idx on public.stories (published_at desc) where status = 'published';
create index stories_category_idx on public.stories (category_id, published_at desc);
create index stories_contributor_idx on public.stories (contributor_id, published_at desc);
create index stories_lead_image_idx on public.stories (lead_image_id);
create index stories_og_image_idx on public.stories (og_image_id);

create table public.story_tags (
  story_id uuid not null references public.stories (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (story_id, tag_id)
);

create index story_tags_tag_idx on public.story_tags (tag_id);

-- Editor-curated related stories. When none are set the application falls back
-- to same-category / shared-tag stories.
create table public.related_stories (
  story_id uuid not null references public.stories (id) on delete cascade,
  related_story_id uuid not null references public.stories (id) on delete cascade,
  position smallint not null default 0,
  primary key (story_id, related_story_id),
  check (story_id <> related_story_id)
);

create index related_stories_related_idx on public.related_stories (related_story_id);

-- Old slugs of stories that were once published; used for permanent redirects.
create table public.story_slug_history (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  story_id uuid not null references public.stories (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index story_slug_history_story_idx on public.story_slug_history (story_id);

-- Story triggers ----------------------------------------------------------------------
-- 1. Maintain updated_at and published_at.
-- 2. Enforce that a story cannot go live without the essentials.
-- 3. Track slug changes of previously-published stories for redirects.
create function public.stories_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_alt text;
begin
  new.updated_at := now();

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  if new.status = 'published' then
    if new.contributor_id is null then
      raise exception 'A story needs a contributor before it can be published'
        using errcode = '23514';
    end if;
    if new.category_id is null then
      raise exception 'A story needs a category before it can be published'
        using errcode = '23514';
    end if;
    if jsonb_array_length(new.body) < 1 then
      raise exception 'A story needs body content before it can be published'
        using errcode = '23514';
    end if;
    if new.lead_image_id is null then
      raise exception 'A story needs a lead image before it can be published'
        using errcode = '23514';
    end if;
    select m.alt_text into v_alt from public.media_assets m where m.id = new.lead_image_id;
    if v_alt is null or btrim(v_alt) = '' then
      raise exception 'The lead image needs alternative text before the story can be published'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.slug <> old.slug then
    if old.published_at is not null then
      insert into public.story_slug_history (slug, story_id)
      values (old.slug, old.id)
      on conflict (slug) do nothing;
    end if;
  end if;

  -- A slug may not collide with another story's historical slug.
  if exists (
    select 1 from public.story_slug_history h
    where h.slug = new.slug and h.story_id <> new.id
  ) then
    raise exception 'Slug "%" was previously used by another story', new.slug
      using errcode = '23505';
  end if;

  -- Reclaiming one of its own old slugs removes the redirect.
  delete from public.story_slug_history h where h.slug = new.slug and h.story_id = new.id;

  return new;
end;
$$;

create trigger stories_before_write
  before insert or update on public.stories
  for each row execute function public.stories_before_write();

-- Site pages (About, Privacy, Submission Terms) and site settings -------------------------
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  kind text not null default 'general' check (kind in ('general', 'about', 'legal')),
  title text not null check (char_length(title) between 1 and 160),
  summary text check (char_length(summary) <= 500),
  body jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  -- Legal pages show a visible notice until a human has reviewed the copy.
  legal_reviewed boolean not null default false,
  is_published boolean not null default true,
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- Non-sensitive, publicly readable settings (for example homepage hero copy).
create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$' and char_length(key) <= 80),
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Homepage placements ----------------------------------------------------------------------
create table public.homepage_placements (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('featured', 'editors_picks')),
  story_id uuid not null references public.stories (id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 20),
  created_at timestamptz not null default now(),
  unique (section, story_id)
);

-- Exactly one featured (hero) story at a time.
create unique index homepage_placements_single_featured
  on public.homepage_placements (section) where section = 'featured';
create index homepage_placements_story_idx on public.homepage_placements (story_id);

-- Foreign-key indexes that are not already covered above.
create index contributors_avatar_idx on public.contributors (avatar_asset_id);

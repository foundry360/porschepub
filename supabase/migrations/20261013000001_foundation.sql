-- =============================================================================
-- Foundation: enums, editorial users/roles, helper functions, audit log,
-- rate limiting.
--
-- Security model summary
--   * Every table in `public` has Row Level Security enabled.
--   * Public visitors (role `anon`) can only read intentionally public content.
--   * Editorial staff are rows in `public.profiles` with role `editor` or
--     `admin`. Having a Supabase Auth account alone grants NO permissions.
--   * Public sign-ups are disabled (see supabase/config.toml and the
--     deployment guide for the hosted-project equivalent).
--   * The service_role key is used server-side only, for the public
--     submission insert and rate limiting.
-- =============================================================================

create type public.editorial_role as enum ('admin', 'editor');
create type public.story_status as enum ('draft', 'published', 'archived');
create type public.submission_status as enum (
  'submitted', 'in_review', 'accepted', 'declined', 'published'
);
create type public.delivery_status as enum ('pending', 'sent', 'failed', 'skipped');

-- Shared trigger: keep updated_at honest.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Editorial users ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.editorial_role not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers. SECURITY DEFINER so policies can consult `profiles` without
-- recursive RLS evaluation. They only ever answer about the calling user.
create function public.current_editorial_role()
returns public.editorial_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_editorial_role() in ('admin', 'editor'), false)
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_editorial_role() = 'admin', false)
$$;

revoke all on function public.current_editorial_role() from public;
revoke all on function public.is_editor() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_editorial_role() to anon, authenticated, service_role;
grant execute on function public.is_editor() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Audit log ------------------------------------------------------------------
-- Append-only record of significant editorial actions. Do not store secrets or
-- submitter personal data in `details`.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 60),
  entity_id text not null check (char_length(entity_id) between 1 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- Rate limiting --------------------------------------------------------------
-- Fixed-window counters. Keys are opaque hashes created by the application;
-- raw IP addresses are never stored.
create table public.rate_limits (
  key text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create index rate_limits_window_idx on public.rate_limits (window_start);

create function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit parameters';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Opportunistic cleanup keeps the table small without a scheduled job.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

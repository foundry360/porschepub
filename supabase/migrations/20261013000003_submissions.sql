-- =============================================================================
-- Story submissions ("Tell Your Story")
--
-- Privacy: this table holds contributor contact information. It is readable
-- only by editorial staff and written by the server using the service role.
-- Anonymous visitors have NO direct access (no select, insert, update).
-- =============================================================================

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254 and email like '%_@_%.__%'),
  title text not null check (char_length(title) between 1 and 200),
  subject text not null check (char_length(subject) between 1 and 200),
  category_id uuid references public.categories (id) on delete set null,
  pitch text not null check (char_length(pitch) between 1 and 5000),
  portfolio_url text check (portfolio_url ~ '^https?://[^\s]+$' and char_length(portfolio_url) <= 500),
  additional_info text check (char_length(additional_info) <= 3000),
  consent_version text not null check (char_length(consent_version) <= 40),
  consented_at timestamptz not null,
  status public.submission_status not null default 'submitted',
  story_id uuid references public.stories (id) on delete set null,
  decision_note text check (char_length(decision_note) <= 2000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  notification_status public.delivery_status not null default 'pending',
  notification_error text check (char_length(notification_error) <= 300),
  -- Salted hash of the submitter's IP, kept only for abuse investigation.
  ip_hash text check (char_length(ip_hash) <= 128),
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_published_needs_story check (status <> 'published' or story_id is not null)
);

create index submissions_status_idx on public.submissions (status, created_at desc);
create index submissions_created_idx on public.submissions (created_at desc);
create index submissions_category_idx on public.submissions (category_id);
create index submissions_story_idx on public.submissions (story_id);

create trigger submissions_set_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

-- Retention helper: strips contact details from old, closed submissions while
-- keeping the editorial record (title, decision). Run manually or from a
-- scheduled job once a retention period has been agreed (see docs/PRIVACY.md).
create function public.anonymize_closed_submissions(p_older_than interval)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_older_than < interval '30 days' then
    raise exception 'refusing to anonymize submissions newer than 30 days';
  end if;

  update public.submissions s
     set name = 'Redacted',
         email = 'redacted@invalid.example',
         portfolio_url = null,
         additional_info = null,
         ip_hash = null,
         anonymized_at = now()
   where s.status in ('declined', 'published')
     and s.anonymized_at is null
     and s.updated_at < now() - p_older_than;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.anonymize_closed_submissions(interval) from public;
grant execute on function public.anonymize_closed_submissions(interval) to service_role;

-- Ranked full-text search over live stories.
--
-- SECURITY INVOKER on purpose: the caller's RLS policies apply, so anonymous
-- callers can only ever match live (published) stories, and a signed-in editor
-- searching through this function would see drafts as well.
create function public.search_stories(
  p_query text,
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (id uuid, rank real, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('english', left(p_query, 200)) as tsq
  ),
  matches as (
    select s.id, ts_rank_cd(s.search_tsv, q.tsq) as rank
    from public.stories s, q
    where s.search_tsv @@ q.tsq
  )
  select m.id, m.rank::real, count(*) over () as total_count
  from matches m
  order by m.rank desc, m.id
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0)
$$;

revoke all on function public.search_stories(text, integer, integer) from public;
grant execute on function public.search_stories(text, integer, integer) to anon, authenticated, service_role;

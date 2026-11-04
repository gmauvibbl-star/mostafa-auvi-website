-- 4 November 2026: repair the Most Read RPC.
-- posts.id is bigint, not uuid. The previous function signature prevented
-- PostgREST from exposing a usable get_most_read_posts endpoint.

drop function if exists public.get_most_read_posts(integer);

create function public.get_most_read_posts(limit_count integer default 10)
returns table (
  id bigint,
  title text,
  slug text,
  view_count bigint,
  language text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    p.id,
    p.title,
    p.slug,
    count(pv.id)::bigint as view_count,
    p.language
  from public.posts p
  left join public.post_views pv on pv.post_id = p.id
  where p.published = true
  group by p.id, p.title, p.slug, p.language
  order by count(pv.id) desc, p.published_at desc nulls last
  limit greatest(coalesce(limit_count, 10), 0);
end;
$$;

revoke all on function public.get_most_read_posts(integer) from public, anon;
grant execute on function public.get_most_read_posts(integer) to authenticated;

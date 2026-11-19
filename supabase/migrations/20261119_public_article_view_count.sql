-- 19 November 2026: make the public article counter use the same post_views
-- source as the author dashboard's Most Read metric.

create or replace function public.get_post_view_count(p_slug text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint
  from public.post_views v
  join public.posts p on p.id = v.post_id
  where p.slug = p_slug
    and p.published = true;
$$;

revoke all on function public.get_post_view_count(text) from public, anon, authenticated;
grant execute on function public.get_post_view_count(text) to anon, authenticated;

-- Return the current view total after recording a view. This lets the reader
-- page wait for the view to be recorded before displaying its number.
drop function if exists public.record_post_view(text);

create function public.record_post_view(p_slug text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id bigint;
  v_total bigint;
begin
  select p.id into v_post_id
  from public.posts p
  where p.slug = p_slug and p.published = true
  limit 1;

  if v_post_id is null then
    return 0;
  end if;

  insert into public.post_views(post_id) values (v_post_id);

  select count(*)::bigint into v_total
  from public.post_views v
  where v.post_id = v_post_id;

  return coalesce(v_total, 0);
end;
$$;

revoke all on function public.record_post_view(text) from public, anon, authenticated;
grant execute on function public.record_post_view(text) to anon, authenticated;

-- Keep the existing public reader-count RPC name, but make it use the
-- same post_views rows that power the author dashboard.
create or replace function public.get_post_reader_count(p_slug text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint
  from public.post_views v
  join public.posts p on p.id = v.post_id
  where p.slug = p_slug
    and p.published = true;
$$;

revoke all on function public.get_post_reader_count(text) from public, anon, authenticated;
grant execute on function public.get_post_reader_count(text) to anon, authenticated;

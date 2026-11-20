-- 20 November 2026: preserve the historical public reader count.
-- The site previously stored one anonymous reader per article in post_readers.
-- The newer dashboard stores views in post_views. Keep both sources visible
-- to the public reader counter so existing counts are not lost.

create or replace function public.get_post_reader_count(p_slug text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((
      select count(*)::bigint
      from public.post_readers r
      join public.posts p on p.id = r.post_id
      where p.slug = p_slug
        and p.published = true
    ), 0)
    +
    coalesce((
      select count(*)::bigint
      from public.post_views v
      join public.posts p on p.id = v.post_id
      where p.slug = p_slug
        and p.published = true
    ), 0);
$$;

revoke all on function public.get_post_reader_count(text) from public, anon, authenticated;
grant execute on function public.get_post_reader_count(text) to anon, authenticated;

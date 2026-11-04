-- Expose only the minimal published-post fields required by the sitemap job.
-- Run this migration in the Supabase SQL Editor (project: voswrndbxrsaqfzwffhh).
-- SECURITY DEFINER lets the function owner read published rows without granting
-- anon any access to admin_users or changing the existing posts RLS policies.

create or replace function public.get_sitemap_published_posts()
returns table (
  slug text,
  language text,
  group_id text,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p.slug::text,
    p.language::text,
    p.group_id::text,
    p.published_at,
    p.updated_at
  from public.posts as p
  where p.published is true
    and p.language in ('bn', 'en')
    and nullif(btrim(p.slug), '') is not null
  order by p.published_at asc nulls last, p.slug asc;
$function$;

-- Supabase SQL Editor runs as a privileged database role; make ownership explicit.
alter function public.get_sitemap_published_posts() owner to postgres;

revoke all on function public.get_sitemap_published_posts() from public;
revoke all on function public.get_sitemap_published_posts() from anon, authenticated;
grant execute on function public.get_sitemap_published_posts() to anon;

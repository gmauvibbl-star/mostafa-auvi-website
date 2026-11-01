-- Author dashboard metrics: real public article views and active subscribers.
-- Additive migration; does not alter existing posts or subscriber records.

create table if not exists public.post_views (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index if not exists post_views_post_id_idx on public.post_views(post_id);
create index if not exists post_views_viewed_at_idx on public.post_views(viewed_at);
alter table public.post_views enable row level security;
revoke all on public.post_views from anon, authenticated;

create or replace function public.record_post_view(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid;
begin
  select p.id into v_post_id
  from public.posts p
  where p.slug = p_slug and p.published = true
  limit 1;

  if v_post_id is not null then
    insert into public.post_views(post_id) values (v_post_id);
  end if;
end;
$$;
revoke all on function public.record_post_view(text) from public;
grant execute on function public.record_post_view(text) to anon, authenticated;

create or replace function public.get_author_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_views bigint;
  v_followers bigint;
  v_published bigint;
begin
  if not exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  select count(*) into v_views from public.post_views;
  select count(*) into v_followers
  from public.subscribers s
  where s.confirmed_at is not null and s.unsubscribed_at is null;
  select count(*) into v_published
  from public.posts p
  where p.published = true and coalesce(p.language, 'bn') = 'bn';

  return jsonb_build_object(
    'total_views', coalesce(v_views, 0),
    'followers', coalesce(v_followers, 0),
    'published', coalesce(v_published, 0)
  );
end;
$$;
revoke all on function public.get_author_dashboard_stats() from public, anon;
grant execute on function public.get_author_dashboard_stats() to authenticated;

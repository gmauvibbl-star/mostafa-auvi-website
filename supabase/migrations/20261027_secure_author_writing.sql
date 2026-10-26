-- Secure author-only writing management; additive and safe to rerun.
-- Run this migration in Supabase SQL Editor only after reviewing the existing schema.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  body text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.posts add column if not exists subtitle text;
alter table public.posts add column if not exists excerpt text;
alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists cover_image_url text;
alter table public.posts add column if not exists language text not null default 'bn';
alter table public.posts add column if not exists featured boolean not null default false;
alter table public.posts add column if not exists title_en text;
alter table public.posts add column if not exists body_en text;

alter table public.posts enable row level security;
alter table public.admin_users enable row level security;

-- Remove any older/overly broad policies on these two tables before installing
-- the narrow policy set below. No client-side operation can add an admin.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename in ('posts','admin_users')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname,
      case when exists(select 1 from pg_policies where schemaname='public' and tablename='posts' and policyname=p.policyname) then 'posts' else 'admin_users' end);
  end loop;
end $$;

create policy "admin users can read own authorization" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

create policy "published posts are public; author can read all" on public.posts
  for select to anon, authenticated
  using (published = true or exists (
    select 1 from public.admin_users a where a.user_id = (select auth.uid())
  ));

create policy "authorized author can create posts" on public.posts
  for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "authorized author can edit posts" on public.posts
  for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "authorized author can delete posts" on public.posts
  for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
revoke insert, update, delete on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

create or replace function public.set_posts_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_posts_updated_at() from public, anon, authenticated;
drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at before update on public.posts
for each row execute function public.set_posts_updated_at();

-- Extra guard against invalid language values while preserving existing rows.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='posts_language_allowed' and conrelid='public.posts'::regclass) then
    alter table public.posts add constraint posts_language_allowed check (language in ('bn','en')) not valid;
    alter table public.posts validate constraint posts_language_allowed;
  end if;
end $$;

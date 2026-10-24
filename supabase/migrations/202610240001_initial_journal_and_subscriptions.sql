-- Initial schema for journal publishing and newsletter subscriptions.
-- Apply this migration in the Supabase SQL Editor or through the Supabase CLI.
-- Never put service_role/secret keys in browser code or this repository.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_posts_published_at_idx
  on public.journal_posts (published_at desc)
  where status = 'published';

-- Subscriber records are accessed only by trusted server-side functions.
-- Store hashes of confirmation tokens, never raw tokens.
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  confirmation_token_hash text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.profiles enable row level security;
alter table public.journal_posts enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- New accounts are never admins by default.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Security-definer helper avoids recursive RLS evaluation on profiles.
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_admin = true
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
  on public.profiles for all
  to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

drop policy if exists "Public can read published journal posts" on public.journal_posts;
create policy "Public can read published journal posts"
  on public.journal_posts for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Admins can manage journal posts" on public.journal_posts;
create policy "Admins can manage journal posts"
  on public.journal_posts for all
  to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

-- Browser roles cannot read or mutate subscribers. A trusted server-side
-- function will handle signup, confirmation and unsubscribe.
revoke all on table public.newsletter_subscribers from anon, authenticated;
revoke all on table public.profiles from anon;
revoke all on table public.journal_posts from anon, authenticated;
grant select on table public.journal_posts to anon, authenticated;
grant insert, update, delete on table public.journal_posts to authenticated;
grant select on table public.profiles to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists journal_posts_set_updated_at on public.journal_posts;
create trigger journal_posts_set_updated_at
  before update on public.journal_posts
  for each row execute procedure public.set_updated_at();

-- After the owner signs up through Supabase Auth, promote only that exact
-- user in the SQL Editor, replacing the placeholder with the owner's UUID:
-- update public.profiles set is_admin = true where id = 'OWNER_AUTH_USER_UUID';
-- Never expose the service_role/secret key to browser code.

-- Supabase schema for Mostafa Auvi.
-- For an existing project, prefer the additive migration in supabase/migrations.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  subtitle text,
  excerpt text,
  category text,
  tags text[] not null default '{}',
  cover_image_url text,
  language text not null default 'bn' check (language in ('bn','en')),
  featured boolean not null default false,
  slug text not null unique,
  body text not null,
  title_en text,
  body_en text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.posts add column if not exists subtitle text;
alter table public.posts add column if not exists excerpt text;
alter table public.posts add column if not exists scheduled_at timestamptz;
alter table public.posts add column if not exists subcategory_id uuid;
alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists cover_image_url text;
alter table public.posts add column if not exists language text not null default 'bn';
alter table public.posts add column if not exists featured boolean not null default false;
alter table public.posts add column if not exists title_en text;
alter table public.posts add column if not exists body_en text;
alter table public.posts add column if not exists group_id text;
alter table public.posts add column if not exists cover_image text;
alter table public.posts add column if not exists parent_category text;
alter table public.posts add column if not exists subcategory text;

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  confirmation_token_hash text,
  unsubscribe_token_hash text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.subscribers add column if not exists unsubscribe_token_hash text;
alter table public.subscribers add column if not exists unsubscribed_at timestamptz;

alter table public.admin_users enable row level security;
alter table public.posts enable row level security;
alter table public.subscribers enable row level security;

-- Ensure no older permissive policy remains on the author/admin tables.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname='public' and tablename in ('posts','admin_users')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "admin users can read own authorization" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));
create policy "published posts are public; author can read all" on public.posts
  for select to anon, authenticated using (
    published = true or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  );
create policy "authorized author can create posts" on public.posts
  for insert to authenticated with check (
    exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  );
create policy "authorized author can edit posts" on public.posts
  for update to authenticated using (
    exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  );
create policy "authorized author can delete posts" on public.posts
  for delete to authenticated using (
    exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  );

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

-- Subscriber records are only accessed by trusted Edge Functions.
revoke all on public.subscribers from anon, authenticated;

-- Revision History table
create table if not exists public.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  body text,
  body_en text,
  title text,
  title_en text,
  saved_at timestamptz not null default now(),
  saved_by uuid
);
alter table public.post_revisions enable row level security;
create policy "admin_read_revisions" on public.post_revisions for select to authenticated using (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);
create policy "admin_insert_revisions" on public.post_revisions for insert to authenticated with check (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);
create policy "admin_delete_revisions" on public.post_revisions for delete to authenticated using (
  exists (select 1 from public.admin_users where user_id = auth.uid())
);
create index if not exists idx_post_revisions_post_id on public.post_revisions(post_id);
create index if not exists idx_post_revisions_saved_at on public.post_revisions(saved_at desc);

create index if not exists idx_posts_scheduled_at on public.posts(scheduled_at) where scheduled_at is not null;

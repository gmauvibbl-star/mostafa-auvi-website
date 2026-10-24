-- Run this file in the Supabase SQL Editor after creating a project.
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
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  confirmation_token_hash text,
  unsubscribe_token_hash text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
-- Safe to re-run if this schema was already applied once.
alter table public.subscribers add column if not exists unsubscribe_token_hash text;
alter table public.admin_users enable row level security;
alter table public.posts enable row level security;
alter table public.subscribers enable row level security;

drop policy if exists "admins can read their own admin record" on public.admin_users;
create policy "admins can read their own admin record" on public.admin_users
 for select to authenticated using (user_id = auth.uid());
drop policy if exists "public can read published posts" on public.posts;
create policy "public can read published posts" on public.posts
 for select to anon, authenticated using (published = true or exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "admins can insert posts" on public.posts;
create policy "admins can insert posts" on public.posts
 for insert to authenticated with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "admins can update posts" on public.posts;
create policy "admins can update posts" on public.posts
 for update to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
 with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "admins can delete posts" on public.posts;
create policy "admins can delete posts" on public.posts
 for delete to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
-- Subscriber table has no browser-facing policies. Edge Functions use the server-only service role.

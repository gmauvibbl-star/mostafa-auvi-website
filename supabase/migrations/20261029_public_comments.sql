-- Public name-only comments for article pages.
-- Run this script once in Supabase SQL Editor.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null check (char_length(post_slug) between 1 and 180),
  author_name text not null check (char_length(trim(author_name)) between 1 and 60),
  comment_text text not null check (char_length(trim(comment_text)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_slug_created_at_idx
  on public.comments (post_slug, created_at desc);

alter table public.comments enable row level security;

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Anyone can read comments"
  on public.comments for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can post a comment with a name" on public.comments;
create policy "Anyone can post a comment with a name"
  on public.comments for insert
  to anon, authenticated
  with check (
    char_length(trim(author_name)) between 1 and 60
    and char_length(trim(comment_text)) between 1 and 2000
    and char_length(post_slug) between 1 and 180
  );

grant select, insert on public.comments to anon, authenticated;

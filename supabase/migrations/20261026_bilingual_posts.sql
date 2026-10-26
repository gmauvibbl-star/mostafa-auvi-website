-- Run once in Supabase SQL Editor to enable English fields.
alter table public.posts add column if not exists title_en text;
alter table public.posts add column if not exists body_en text;

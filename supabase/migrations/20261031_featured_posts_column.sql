-- Add the Featured Writing flag used by the author dashboard and featured-writing display.
-- Safe to run more than once.
alter table public.posts
  add column if not exists featured boolean not null default false;

comment on column public.posts.featured is
  'Marks a post as selected/featured for the featured-writing section.';

notify pgrst, 'reload schema';

-- Add editorial metadata used by the author dashboard, homepage, and archive filters.
-- Safe to run on an existing posts table; existing article content is preserved.
alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists excerpt text;
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists cover_image text;
alter table public.posts add column if not exists language text;
alter table public.posts add column if not exists featured boolean not null default false;

create index if not exists posts_published_at_idx on public.posts (published_at desc) where published = true;
create index if not exists posts_category_idx on public.posts (category) where published = true;
create index if not exists posts_language_idx on public.posts (language) where published = true;
create index if not exists posts_featured_idx on public.posts (featured) where published = true;

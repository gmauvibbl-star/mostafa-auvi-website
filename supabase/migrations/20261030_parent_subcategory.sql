-- Add explicit parent and child category fields for published writing.
alter table public.posts
  add column if not exists parent_category text,
  add column if not exists subcategory text;

-- Keep older posts searchable by their existing category value.
update public.posts
set subcategory = category
where subcategory is null and category is not null;

create index if not exists posts_parent_category_idx on public.posts(parent_category);
create index if not exists posts_subcategory_idx on public.posts(subcategory);

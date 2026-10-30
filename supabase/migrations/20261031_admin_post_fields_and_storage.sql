-- Align the dashboard's post fields with the public reading/archive pages.
-- Also configure the public cover-image bucket with author-only uploads.
alter table public.posts
  add column if not exists group_id text,
  add column if not exists cover_image text,
  add column if not exists excerpt text,
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists language text not null default 'bn',
  add column if not exists parent_category text,
  add column if not exists subcategory text;

-- Preserve images previously stored in the older cover_image_url field.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='posts' and column_name='cover_image_url'
  ) then
    execute 'update public.posts set cover_image = cover_image_url where cover_image is null and cover_image_url is not null';
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-covers', 'post-covers', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view post covers" on storage.objects;
create policy "Public can view post covers"
on storage.objects for select to public
using (bucket_id = 'post-covers');

drop policy if exists "Authorized authors can upload post covers" on storage.objects;
create policy "Authorized authors can upload post covers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-covers'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  )
);

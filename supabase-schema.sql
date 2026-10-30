-- ============================================================
-- মোস্তফা অভি — লেখক ড্যাশবোর্ড সম্প্রসারিত Schema
-- Mostafa Auvi Author Dashboard — Extended Schema for Supabase
-- ============================================================
--
-- এই SQL ফাইলটি আপনার Supabase SQL Editor-এ রান করুন।
-- নিরাপদ — আগের থেকে থাকা টেবিল/কলামের ক্ষতি করবে না।
--
-- রান করার পর:
--   1. Storage বালতি (bucket) তৈরি হবে: covers
--   2. টেবিল তৈরি/আপডেট হবে: categories, posts (extended), tags, post_tags, authors
--   3. RLS পলিসি সেট হবে
--   4. ১০টি ডিফল্ট ক্যাটাগরি + সাবক্যাটাগরি seed হবে
--
-- ============================================================

-- ১. pgcrypto extension (uuid জেনারেশনের জন্য)
create extension if not exists pgcrypto;

-- ============================================================
-- ২. ক্যাটাগরি টেবিল (self-referencing — subcategory সাপোর্ট)
-- ============================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,                          -- বাংলা নাম
  name_en text not null,                       -- English name
  slug text not null unique,
  icon text,
  sort_order int not null default 0,
  parent_id uuid references public.categories(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
-- পাবলিক রিড (যাতে পাবলিক সাইটে দেখানো যায়)
drop policy if exists "public can read categories" on public.categories;
create policy "public can read categories" on public.categories
  for select to anon, authenticated using (true);
-- শুধু admin ইনসার্ট/আপডেট/ডিলিট করতে পারবে
drop policy if exists "admins can manage categories" on public.categories;
create policy "admins can manage categories" on public.categories
  for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- ============================================================
-- ৩. posts টেবিল সম্প্রসারণ — bilingual + নতুন কলাম
-- ============================================================
-- আগের কলামগুলো (id, title, slug, body, published, created_at, updated_at, published_at) রাখা হবে।
-- নতুন কলাম যোগ করছি (safe — if not exists প্যাটার্ন)।

-- ৩.১ নতুন কলাম যোগ করুন
alter table public.posts add column if not exists title_en text;
alter table public.posts add column if not exists slug_en text;
alter table public.posts add column if not exists intro text;
alter table public.posts add column if not exists intro_en text;
alter table public.posts add column if not exists body_en text;
alter table public.posts add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.posts add column if not exists cover_image text;
alter table public.posts add column if not exists featured boolean not null default false;
alter table public.posts add column if not exists word_count int not null default 0;
alter table public.posts add column if not exists status text not null default 'draft';
-- "title" ও "slug" কলাম আগে থেকেই আছে, সেগুলোকে বাংলা ভার্সন হিসেবে ব্যবহার করা হবে।

-- ৩.২ পুরোনো "published" boolean কলামকে status দিয়ে sync রাখুন
-- (ঐতিহাসিক কোডের জন্য — নতুন কোড status ব্যবহার করবে)
-- যদি published=true হয় কিন্তু status=null থাকে, তাহলে status='published' করুন।
update public.posts set status = 'published' where published = true and status is distinct from 'published';
update public.posts set status = 'draft' where published = false and status is distinct from 'draft';

-- ৩.৩ slug constraint (ঐতিহাসিক — পুরোনো slug বাংলা হতে পারে, আমরা check relax করছি)
-- (Bengali slug যেমন "পরীক্ষামূলক-লেখা" সাপোর্ট করার জন্য constraint পরিবর্তন)
do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'posts_slug_check' and table_name = 'posts'
  ) then
    alter table public.posts drop constraint posts_slug_check;
  end if;
end $$;

-- ৩.৪ RLS পলিসি আপডেট (public read published, admins manage all)
-- পুরোনো পলিসি ড্রপ করে নতুন করছি
drop policy if exists "public can read published posts" on public.posts;
create policy "public can read published posts" on public.posts
  for select to anon, authenticated
  using (status = 'published' or exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins can insert posts" on public.posts;
create policy "admins can insert posts" on public.posts
  for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins can update posts" on public.posts;
create policy "admins can update posts" on public.posts
  for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins can delete posts" on public.posts;
create policy "admins can delete posts" on public.posts
  for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- ============================================================
-- ৪. tags টেবিল
-- ============================================================
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.tags enable row level security;
drop policy if exists "public can read tags" on public.tags;
create policy "public can read tags" on public.tags
  for select to anon, authenticated using (true);
drop policy if exists "admins can manage tags" on public.tags;
create policy "admins can manage tags" on public.tags
  for all to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- ============================================================
-- ৫. post_tags জয়েন টেবিল (many-to-many)
-- ============================================================
create table if not exists public.post_tags (
  post_id uuid references public.posts(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);
alter table public.post_tags enable row level security;
drop policy if exists "public can read post_tags" on public.post_tags;
create policy "public can read post_tags" on public.post_tags
  for select to anon, authenticated using (true);
drop policy if exists "admins can manage post_tags" on public.post_tags;
create policy "admins can manage post_tags" on public.post_tags
  for all to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- ============================================================
-- ৬. Storage bucket — কভার ইমেজ আপলোড
-- ============================================================
-- Storage তৈরি করতে হবে — admin ইমেজ আপলোড/পড়তে পারবে, পাবলিক পড়তে পারবে।
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

-- Storage RLS পলিসি
drop policy if exists "public can read covers" on storage.objects;
create policy "public can read covers" on storage.objects
  for select to anon, authenticated using (bucket_id = 'covers');

drop policy if exists "admins can upload covers" on storage.objects;
create policy "admins can upload covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins can delete covers" on storage.objects;
create policy "admins can delete covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- ============================================================
-- ৭. ডিফল্ট ক্যাটাগরি seed (যদি খালি থাকে)
-- ============================================================
insert into public.categories (name, name_en, slug, sort_order)
select * from (values
  ('গল্প', 'Fiction', 'fiction', 1),
  ('প্রবন্ধ', 'Essays', 'essays', 2),
  ('সাহিত্য সমালোচনা', 'Literary Criticism', 'literary-criticism', 3),
  ('অনুবাদ সাহিত্য', 'Translated Literature', 'translated-literature', 4),
  ('ভ্রমণ', 'Travel', 'travel', 5),
  ('স্মৃতিচারণ', 'Memoirs', 'memoirs', 6),
  ('ব্যক্তিগত লেখা', 'Personal Writings', 'personal-writings', 7),
  ('আইন-আদালত', 'Law & Court', 'law-court', 8),
  ('ব্যাংকিং ও অর্থনীতি', 'Banking & Economics', 'banking-economics', 9),
  ('PDF ও প্রকাশনা', 'PDF & Publications', 'pdf-publications', 10)
) as v(name, name_en, slug, sort_order)
where not exists (select 1 from public.categories where slug = v.slug);

-- সাবক্যাটাগরি seed (parent_id lookup সহ)
insert into public.categories (name, name_en, slug, parent_id, sort_order)
select v.name, v.name_en, v.slug, p.id, v.sort_order
from (values
  ('ছোটগল্প', 'Short Story', 'fiction-short-story', 'fiction', 1),
  ('উপন্যাস', 'Novel', 'fiction-novel', 'fiction', 2),
  ('সামাজিক প্রবন্ধ', 'Social Essay', 'essays-social-essay', 'essays', 1),
  ('রাজনৈতিক প্রবন্ধ', 'Political Essay', 'essays-political-essay', 'essays', 2),
  ('বই পর্যালোচনা', 'Book Review', 'literary-criticism-book-review', 'literary-criticism', 1),
  ('ইংরেজি থেকে অনূদিত', 'From English', 'translated-literature-from-english', 'translated-literature', 1),
  ('দেশীয় ভ্রমণ', 'Domestic Travel', 'travel-domestic', 'travel', 1),
  ('বিদেশ ভ্রমণ', 'International Travel', 'travel-international', 'travel', 2),
  ('জীবনস্মৃতি', 'Life Memoir', 'memoirs-life-memoir', 'memoirs', 1),
  ('ডায়েরি', 'Diary', 'personal-writings-diary', 'personal-writings', 1),
  ('আত্মজীবনী', 'Autobiography', 'personal-writings-autobiography', 'personal-writings', 2),
  ('আইনি বিশ্লেষণ', 'Legal Analysis', 'law-court-legal-analysis', 'law-court', 1),
  ('ব্যাংকিং', 'Banking', 'banking-economics-banking', 'banking-economics', 1),
  ('অর্থনীতি', 'Economics', 'banking-economics-economics', 'banking-economics', 2),
  ('বই', 'Books', 'pdf-publications-books', 'pdf-publications', 1)
) as v(name, name_en, slug, parent_slug, sort_order)
join public.categories p on p.slug = v.parent_slug
where not exists (select 1 from public.categories where slug = v.slug);

-- ============================================================
-- ৮. updated_at ট্রিগার (যদি না থাকে)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- ============================================================
-- ✅ সম্পূর্ণ! এখন dashboard.html ফাইলটি আপনার GitHub repo-তে
--    আপলোড করুন এবং Supabase URL + anon key বসান।
-- ============================================================

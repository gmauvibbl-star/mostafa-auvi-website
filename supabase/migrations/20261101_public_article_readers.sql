-- Public article reader count.
-- Counts one anonymous browser per article, only after the visitor scrolls
-- to at least the midpoint of the article. No IP address or personal data is stored.

create table if not exists public.post_readers (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  read_at timestamptz not null default now(),
  constraint post_readers_post_visitor_unique unique (post_id, visitor_hash)
);

create index if not exists post_readers_post_id_idx
  on public.post_readers(post_id);

alter table public.post_readers enable row level security;
revoke all on public.post_readers from public, anon, authenticated;

create or replace function public.get_post_reader_count(p_slug text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint
  from public.post_readers r
  join public.posts p on p.id = r.post_id
  where p.slug = p_slug and p.published = true;
$$;

create or replace function public.record_post_reader(p_slug text, p_visitor_hash text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid;
  v_total bigint;
begin
  if p_slug is null or length(p_slug) > 180
     or p_visitor_hash is null
     or p_visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid reader data';
  end if;

  select p.id into v_post_id
  from public.posts p
  where p.slug = p_slug and p.published = true
  limit 1;

  if v_post_id is null then
    return 0;
  end if;

  insert into public.post_readers(post_id, visitor_hash)
  values (v_post_id, p_visitor_hash)
  on conflict (post_id, visitor_hash) do nothing;

  select count(*)::bigint into v_total
  from public.post_readers r
  where r.post_id = v_post_id;

  return coalesce(v_total, 0);
end;
$$;

revoke all on function public.get_post_reader_count(text) from public;
revoke all on function public.record_post_reader(text, text) from public;
grant execute on function public.get_post_reader_count(text) to anon, authenticated;
grant execute on function public.record_post_reader(text, text) to anon, authenticated;

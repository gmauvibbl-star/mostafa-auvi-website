-- Reader counts for the three static Chandradwip articles.
-- One anonymous browser is counted once per article after reaching the article midpoint.

create table if not exists public.static_article_readers (
  id bigint generated always as identity primary key,
  slug text not null check (slug in (
    'chandradwip-writing',
    'chandradwip-characters',
    'chandradwip-settlement'
  )),
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  read_at timestamptz not null default now(),
  constraint static_article_readers_slug_visitor_unique unique (slug, visitor_hash)
);

create index if not exists static_article_readers_slug_idx
  on public.static_article_readers(slug);

alter table public.static_article_readers enable row level security;
revoke all on public.static_article_readers from public, anon, authenticated;

create or replace function public.get_static_article_reader_count(p_slug text)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_slug not in (
    'chandradwip-writing',
    'chandradwip-characters',
    'chandradwip-settlement'
  ) then
    raise exception 'Invalid static article';
  end if;

  return (
    select count(*)::bigint
    from public.static_article_readers r
    where r.slug = p_slug
  );
end;
$$;

create or replace function public.record_static_article_reader(p_slug text, p_visitor_hash text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint;
begin
  if p_slug not in (
    'chandradwip-writing',
    'chandradwip-characters',
    'chandradwip-settlement'
  )
     or p_visitor_hash is null
     or p_visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid reader data';
  end if;

  insert into public.static_article_readers(slug, visitor_hash)
  values (p_slug, p_visitor_hash)
  on conflict (slug, visitor_hash) do nothing;

  select count(*)::bigint into v_total
  from public.static_article_readers
  where slug = p_slug;

  return coalesce(v_total, 0);
end;
$$;

revoke all on function public.get_static_article_reader_count(text) from public;
revoke all on function public.record_static_article_reader(text, text) from public;
grant execute on function public.get_static_article_reader_count(text) to anon, authenticated;
grant execute on function public.record_static_article_reader(text, text) to anon, authenticated;

-- Subscription abuse protection: five attempts per IP per rolling hour.
-- Run this migration in the Supabase SQL Editor before deploying the updated
-- subscription Edge Function.

create table if not exists public.subscription_rate_limits (
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists subscription_rate_limits_ip_time_idx
  on public.subscription_rate_limits (ip_hash, attempted_at desc);

alter table public.subscription_rate_limits enable row level security;

create or replace function public.consume_subscription_rate_limit(
  p_ip_hash text,
  p_max_attempts integer default 5,
  p_window_minutes integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 32 then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_ip_hash, 0)
  );

  delete from public.subscription_rate_limits
  where attempted_at < now() - interval '1 day';

  select count(*)::integer
    into v_count
  from public.subscription_rate_limits
  where ip_hash = p_ip_hash
    and attempted_at > now() - pg_catalog.make_interval(mins => greatest(p_window_minutes, 1));

  if v_count >= greatest(p_max_attempts, 1) then
    return false;
  end if;

  insert into public.subscription_rate_limits (ip_hash)
  values (p_ip_hash);

  return true;
end;
$function$;

alter function public.consume_subscription_rate_limit(text, integer, integer) owner to postgres;
revoke all on function public.consume_subscription_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_subscription_rate_limit(text, integer, integer) to service_role;

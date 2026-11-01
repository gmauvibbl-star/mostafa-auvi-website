-- 2 November 2026: add the missing unsubscribe timestamp used by
-- dashboard metrics and the subscription Edge Functions.
-- Existing subscriber records remain subscribed unless explicitly unsubscribed.
alter table public.subscribers
  add column if not exists unsubscribed_at timestamptz;

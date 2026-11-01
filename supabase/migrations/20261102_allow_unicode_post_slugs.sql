-- Allow Bengali and other Unicode slugs, matching the public site's URL handling.
-- Existing slugs are preserved; this only removes the legacy ASCII-only check.
alter table public.posts drop constraint if exists posts_slug_check;

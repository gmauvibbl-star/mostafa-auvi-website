-- ============================================================
-- Dashboard Feature Enhancement Migration
-- ============================================================

-- 1. Add scheduled_at column for Scheduled Publishing
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- 2. Add subcategory_id column (was used in code but missing from schema)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS subcategory_id uuid;

-- 3. Create post_revisions table for Revision History
CREATE TABLE IF NOT EXISTS public.post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  body text,
  body_en text,
  title text,
  title_en text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  saved_by uuid
);

-- RLS for post_revisions — only admin can read/insert
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_revisions" ON public.post_revisions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);
CREATE POLICY "admin_insert_revisions" ON public.post_revisions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);
CREATE POLICY "admin_delete_revisions" ON public.post_revisions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- 4. Ensure covers bucket allows PDF and video uploads too
-- (The 'covers' bucket already exists; just update accepted mime types if needed)
-- Storage bucket policies are managed separately

-- 5. Update RLS on posts to also allow filtering by scheduled_at
-- Published posts that are scheduled should NOT appear until scheduled_at has passed
-- This is enforced by the query, not by RLS (RLS already allows public SELECT on published=true)

-- 6. Add index for revision history lookups
CREATE INDEX IF NOT EXISTS idx_post_revisions_post_id ON public.post_revisions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_revisions_saved_at ON public.post_revisions(saved_at DESC);

-- 7. Add index for scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

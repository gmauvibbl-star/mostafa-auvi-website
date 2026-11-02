-- ============================================================
-- Dashboard Enhancement Phase 2: RBAC + SEO + Most Read
-- ============================================================

-- 1. Add role column to admin_users for RBAC
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role text DEFAULT 'author';

-- 2. Add SEO columns to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS canonical_url text;

-- 3. Create Most Read RPC function
-- First check if post_views table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_views' AND table_schema = 'public') THEN
    -- Create the Most Read function if post_views exists
    CREATE OR REPLACE FUNCTION public.get_most_read_posts(limit_count int DEFAULT 10)
    RETURNS TABLE(id uuid, title text, slug text, view_count bigint, language text)
    LANGUAGE sql SECURITY DEFINER AS $$
      SELECT p.id, p.title, p.slug, COUNT(pv.id)::bigint as view_count, p.language
      FROM public.posts p
      LEFT JOIN public.post_views pv ON pv.post_id = p.id
      WHERE p.published = true
      GROUP BY p.id, p.title, p.slug, p.language
      ORDER BY view_count DESC
      LIMIT $1;
    $$;
  END IF;
END $$;

-- 4. Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role) WHERE role IS NOT NULL;

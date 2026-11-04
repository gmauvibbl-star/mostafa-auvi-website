-- 4 November 2026: ensure revision history uses the live posts.id type.
-- The live posts.id column is bigint. This migration is non-destructive:
-- it creates the table when absent and refuses to rewrite existing revision IDs.

DO $$
DECLARE
  v_posts_id_type text;
  v_revision_post_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_posts_id_type
  FROM pg_attribute a
  WHERE a.attrelid = 'public.posts'::regclass
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF v_posts_id_type IS DISTINCT FROM 'bigint' THEN
    RAISE EXCEPTION 'Expected public.posts.id to be bigint, found %', v_posts_id_type;
  END IF;

  IF to_regclass('public.post_revisions') IS NULL THEN
    CREATE TABLE public.post_revisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
      body text,
      body_en text,
      title text,
      title_en text,
      saved_at timestamptz NOT NULL DEFAULT now(),
      saved_by uuid
    );
  ELSE
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO v_revision_post_id_type
    FROM pg_attribute a
    WHERE a.attrelid = 'public.post_revisions'::regclass
      AND a.attname = 'post_id'
      AND NOT a.attisdropped;

    IF v_revision_post_id_type IS DISTINCT FROM 'bigint' THEN
      RAISE EXCEPTION 'public.post_revisions.post_id is %, not bigint. No existing revision data was changed; inspect this table before migrating it.', v_revision_post_id_type;
    END IF;
  END IF;
END
$$;

ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_revisions'
      AND policyname = 'admin_read_revisions'
  ) THEN
    CREATE POLICY admin_read_revisions ON public.post_revisions
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_revisions'
      AND policyname = 'admin_insert_revisions'
  ) THEN
    CREATE POLICY admin_insert_revisions ON public.post_revisions
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_revisions'
      AND policyname = 'admin_delete_revisions'
  ) THEN
    CREATE POLICY admin_delete_revisions ON public.post_revisions
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
      ));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_post_revisions_post_id
  ON public.post_revisions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_revisions_saved_at
  ON public.post_revisions(saved_at DESC);

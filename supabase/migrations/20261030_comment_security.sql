-- Public comments: server-side abuse protection
CREATE TABLE IF NOT EXISTS public.comment_rate_limits (
  ip_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);

ALTER TABLE public.comment_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.comment_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.comment_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_comment_rate_limit(
  p_ip_hash text,
  p_max_requests integer DEFAULT 5,
  p_window_seconds integer DEFAULT 600
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_ip_hash IS NULL OR length(p_ip_hash) <> 64
     OR p_max_requests < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO public.comment_rate_limits AS current_limit
    (ip_hash, window_started_at, request_count)
  VALUES (p_ip_hash, now(), 1)
  ON CONFLICT (ip_hash) DO UPDATE
    SET window_started_at = CASE
          WHEN current_limit.window_started_at <= now() - make_interval(secs => p_window_seconds)
          THEN now() ELSE current_limit.window_started_at END,
        request_count = CASE
          WHEN current_limit.window_started_at <= now() - make_interval(secs => p_window_seconds)
          THEN 1 ELSE current_limit.request_count + 1 END
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_comment_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_comment_rate_limit(text, integer, integer) TO service_role;

-- All public comment submissions must pass through the protected Edge Function.
REVOKE INSERT ON TABLE public.comments FROM anon, authenticated;
GRANT INSERT ON TABLE public.comments TO service_role;

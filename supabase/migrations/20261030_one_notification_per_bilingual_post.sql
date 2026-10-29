-- Run this migration in the Supabase SQL Editor.
-- A bilingual post pair shares group_id. Send one subscriber notification
-- for the group, not one notification for each language row.
CREATE OR REPLACE FUNCTION public.notify_new_post()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_secret text;
  v_url text := 'https://voswrndbxrsaqfzwffhh.supabase.co/functions/v1/subscription';
  v_payload json;
BEGIN
  IF (
    (TG_OP = 'INSERT' AND COALESCE(NEW.published, false) = true)
    OR
    (TG_OP = 'UPDATE'
      AND COALESCE(NEW.published, false) = true
      AND COALESCE(OLD.published, false) = false)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.group_id = NEW.group_id
      AND p.id <> NEW.id
      AND COALESCE(p.published, false) = true
  )
  THEN
    SELECT value
      INTO v_secret
      FROM public._app_config
     WHERE key = 'broadcast_webhook_secret';

    v_payload := json_build_object(
      'action', 'broadcast',
      'secret', v_secret,
      'post', json_build_object(
        'slug', NEW.slug,
        'title', NEW.title,
        'excerpt', COALESCE(NEW.excerpt, LEFT(NEW.body, 200)),
        'body', NEW.body,
        'cover_image_url', NEW.cover_image,
        'category', NEW.category,
        'published_at', TO_CHAR(
          NEW.published_at AT TIME ZONE 'Asia/Dhaka',
          'DD Mon YYYY'
        )
      )
    );

    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body := v_payload::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Align all post foreign keys with public.posts.id (BIGINT).
-- This migration never converts or discards populated UUID values. If a
-- dependent table contains UUID post IDs, it stops and asks for an explicit
-- mapping rather than risking data loss.

do $migration$
declare
  v_posts_type text;
  v_child_type text;
  v_child_table text;
  v_row_count bigint;
  v_tables text[] := array['post_tags','post_revisions','post_views','post_readers'];
begin
  select data_type into v_posts_type
  from information_schema.columns
  where table_schema='public' and table_name='posts' and column_name='id';

  if v_posts_type is null then
    raise exception 'public.posts.id was not found. Check the active database schema.';
  end if;

  if v_posts_type <> 'bigint' then
    raise exception 'Expected public.posts.id to be BIGINT, found %. Back up and map existing post IDs before changing the primary key.', v_posts_type;
  end if;

  foreach v_child_table in array v_tables loop
    if to_regclass('public.' || v_child_table) is null then
      continue;
    end if;

    select data_type into v_child_type
    from information_schema.columns
    where table_schema='public' and table_name=v_child_table and column_name='post_id';

    if v_child_type is null or v_child_type='bigint' then
      continue;
    end if;

    execute format('select count(*) from public.%I', v_child_table) into v_row_count;
    if v_row_count > 0 then
      raise exception 'public.% has % rows and post_id type %. No rows were changed. Map these UUID values to public.posts.id before retrying.', v_child_table, v_row_count, v_child_type;
    end if;

    execute format('alter table public.%I drop constraint if exists %I', v_child_table, v_child_table || '_post_id_fkey');
    execute format('alter table public.%I alter column post_id type bigint using null::bigint', v_child_table);
    execute format(
      'alter table public.%I add constraint %I foreign key (post_id) references public.posts(id) on delete cascade',
      v_child_table, v_child_table || '_post_id_fkey'
    );
  end loop;
end;
$migration$;

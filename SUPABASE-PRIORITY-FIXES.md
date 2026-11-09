# Supabase follow-up required for the priority fixes

The source changes are committed, but the following steps require access to the Supabase and Cloudflare projects. They cannot be completed from the GitHub repository alone.

## 1. Apply the database migrations

In the Supabase SQL Editor for the website project, run these files in this order:

1. `supabase/migrations/20261109_align_post_id_types.sql`
2. `supabase/migrations/20261109_subscription_rate_limit.sql`

The first migration checks that `public.posts.id` is BIGINT and aligns empty child tables if needed. It deliberately stops if a child table contains UUID post IDs; those rows must be mapped to the real BIGINT post IDs before any conversion. It does not discard populated data.

The second migration creates the private rate-limit table and the service-role-only rate-limit function.

## 2. Enable Cloudflare Turnstile

1. Create a Turnstile widget for `gmauvibbl-star.github.io` in Cloudflare.
2. Replace `YOUR_TURNSTILE_SITE_KEY` in both `subscribe.html` and `subscribe-en.html` with the widget's public site key.
3. Add the matching private secret to Supabase Edge Function secrets as `TURNSTILE_SECRET_KEY`. Do not put the secret in HTML or GitHub.
4. Set a private random `RATE_LIMIT_SALT` in the same Edge Function secrets.

## 3. Deploy the updated subscription function

Deploy `supabase/functions/subscription/index.ts` to the Supabase project after applying the migrations and setting the secrets. The function now:
- rejects filled honeypot submissions;
- limits each IP hash to five subscription attempts per hour;
- verifies Turnstile whenever `TURNSTILE_SECRET_KEY` is configured;
- continues to use the existing double opt-in email flow through Resend.

## 4. Test the email flow

Use an email inbox you control:

1. Submit the Bengali subscription form.
2. Confirm that the confirmation email arrives and its link confirms the subscription.
3. Trigger a test published-writing notification and confirm delivery.
4. Confirm that the notification contains a working unsubscribe link.
5. Use the unsubscribe link and verify that the subscriber is marked unsubscribed.
6. Repeat in the English form.

A successful source-code change does not prove email delivery. Delivery depends on the Resend API key, verified sender domain, Supabase secrets, and deployed Edge Function.

## 5. Verify post ID types

Run this read-only query after the migrations:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'posts' and column_name = 'id')
    or (column_name = 'post_id' and table_name in
      ('post_tags','post_revisions','post_views','post_readers'))
  )
order by table_name, column_name;
```

The `posts.id` and every existing `post_id` foreign key should report `bigint`.

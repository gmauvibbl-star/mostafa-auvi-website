# Secure writing dashboard + email subscriptions

This repository currently uses GitHub Pages, which serves static files only. The pages added alongside this guide are **scaffolding** and will not authenticate or send email until the setup below is completed. Never put a Supabase service-role key or Resend API key in HTML.

## Services needed
- Supabase project: Auth + Postgres database.
- Resend account and a verified sending domain/email for production.
- The existing GitHub Pages site remains public and articles remain free.

## 1. Set up Supabase
1. Create a Supabase project and open **SQL Editor**.
2. Run `supabase/schema.sql`.
3. In Authentication settings, enable email OTP/magic-link login and set the site URL and redirect URL to `https://gmauvibbl-star.github.io/mostafa-auvi-website/admin.html`.
4. Copy the project URL and the **anon/publishable** key into `admin.html`, `posts.html`, `read.html`, and `subscribe.html`, replacing `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY`. These are public browser values; never use the service-role key.
5. Sign in to the dashboard once, then find your user UUID in Supabase **Authentication → Users**. In SQL Editor, grant admin access to that one account:
   `insert into public.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');`
   Keep this table restricted; do not add a public insert policy.

## 1A. Upgrade an existing database for the author dashboard
If the project already has tables or posts, do **not** blindly recreate the schema. Review and run `supabase/migrations/20261027_secure_author_writing.sql` in Supabase **SQL Editor**. This migration adds the dashboard metadata columns and replaces policies on `posts` and `admin_users` with a restrictive author-only policy set. Confirm the SQL Editor reports success before testing the dashboard.

Then open **Authentication → Users** and confirm the intended owner account exists. Copy that account's UUID and check whether it is present in `public.admin_users`. If it is missing, add only that specific UUID from SQL Editor:
```sql
insert into public.admin_users (user_id)
values ('PASTE_THE_OWNER_AUTH_USER_UUID_HERE')
on conflict (user_id) do nothing;
```
Replace the placeholder with the exact UUID from Authentication → Users. Never add a public insert policy to `admin_users`. The dashboard login is configured not to offer public account creation.

Before launch, verify in SQL Editor that RLS is enabled and inspect the policies for `public.posts` and `public.admin_users`. Do not claim author-only management is live until the migration and owner authorization have both been confirmed in the actual Supabase project.

## 2. Configure server-side email
1. Create a Resend account, verify a sending domain, and create an API key.
2. Deploy both Edge Functions in `supabase/functions/subscription` and `supabase/functions/publish-notification`.
3. Set server-side function secrets in Supabase: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (for example `Author Name <updates@yourdomain.com>`), and `SITE_URL=https://gmauvibbl-star.github.io/mostafa-auvi-website`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.
4. Configure the `subscription` function to allow public requests (it uses its own email validation; enable CAPTCHA/rate limiting before public launch). Keep `publish-notification` protected by JWT verification.
5. Confirm email sending works with a test address before launch.

## 3. Important follow-up before public launch
- The subscription function currently contains the subscribe-confirmation email flow scaffold; the confirmation handler and unsubscribe endpoint must be completed and tested before collecting real subscribers.
- The public pages are not yet linked from the very large existing `index.html`. Add visible navigation links to `posts.html` and `subscribe.html` only after configuration and smoke tests.
- The existing home page and journal have not been replaced. The new article reader uses `read.html?slug=...` as a stable per-article URL.
- Add an actual unsubscribe link and endpoint before sending production email. Include a privacy notice, data retention policy, and anti-abuse/rate limiting.
- Test admin isolation in a signed-out/incognito browser: drafts must never be visible, and non-admin users must not be able to insert, edit, or delete posts.
- Existing articles need to be imported or linked separately; they are not automatically migrated into the new database.

## Files
- `admin.html`: magic-link owner dashboard, draft/publish/edit UI.
- `posts.html`: public list of published articles.
- `read.html`: public article reader and share/copy links.
- `subscribe.html`: subscription form.
- `supabase/schema.sql`: database tables and row-level security policies.
- `supabase/functions/`: server-side email function scaffolds.

# Journal subscriptions and secure admin dashboard

## Goal
Keep public reading and sharing open while allowing only the authenticated site owner to create, edit, publish, or delete journal entries. Confirmed subscribers receive an email when a new entry is published.

## Current repository observations
- The site is a static HTML website in the `main` branch.
- `journal.html` includes the journal UI and browser-side entry storage (`localStorage`).
- Static hosting alone cannot securely protect write operations, persist shared edits, or send email.
- Never place service-role keys, email-provider secrets, or privileged credentials in public JavaScript.

## Proposed architecture
1. **Public site:** continue serving published articles and preserve existing URLs where possible.
2. **Backend and database:** store journal entries and subscriber records persistently. Expose only published content to public readers.
3. **Authentication:** use a supported auth provider; enforce owner authorization server-side for every write request, not merely by hiding admin UI.
4. **Admin dashboard:** list entries; create drafts; edit, preview, publish, unpublish, and delete with confirmation and clear success/error states.
5. **Email subscription:** validate addresses, send a confirmation email, store consent and subscription state, and provide an unsubscribe link. Rate-limit signups and protect against abuse.
6. **Publication notifications:** send email only after a successful transition to published; record notification status to prevent duplicate sends. Keep recipient addresses private.
7. **Migration:** identify any locally stored entries that need export/import; localStorage entries are not automatically available to the server.
8. **Operations:** keep secrets in the deployment platform's environment/secrets manager; document backup, rollback, and recovery.

## Security and acceptance checks
- Anonymous users cannot create, edit, publish, or delete entries through direct API requests.
- An authenticated non-owner cannot perform owner-only actions.
- Public readers can read published articles without logging in.
- Draft and unpublished entries are not publicly accessible.
- Subscriber confirmation and unsubscribe flows work.
- A publication sends at most one notification per subscriber per entry, with retries tracked safely.
- Subscriber addresses and secret keys are never exposed to the browser or public repository.
- Signup endpoints have validation and rate limits.
- Existing public pages and article URLs continue to work after rollout.

## Deployment dependencies / blockers
Before production can work, choose and configure a backend/database/auth provider and an email delivery provider, then add the required credentials to deployment secrets. GitHub Pages alone is not sufficient for these server-side functions. Do not claim the feature is live until deployment and end-to-end tests pass.

## Implementation sequence
- [x] Inspect current journal implementation and confirm static/localStorage architecture.
- [x] Create this implementation plan on a feature branch.
- [ ] Select backend/auth/database and email providers.
- [ ] Implement server-side data model and authorization.
- [ ] Implement owner dashboard and public subscription UI.
- [ ] Implement confirmation, publication email, and unsubscribe flows.
- [ ] Migrate required existing entries.
- [ ] Run security and end-to-end tests; deploy only after configuration.

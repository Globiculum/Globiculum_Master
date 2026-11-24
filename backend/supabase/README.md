# Database (Supabase)

Live project: `ocrpjxpntzqzcsmedqwm`. Run the commands below from `backend/` after `npx supabase link --project-ref ocrpjxpntzqzcsmedqwm`.

## How the schema is tracked

`migrations/20261106000000_baseline_live_schema.sql` is the live database's structure as of 6 Nov 2026,
taken with `supabase db dump --linked`. The live database records it as applied, so the history is in sync:

```
npx supabase migration list --linked     # local and remote columns match
npx supabase db push --dry-run --linked  # "Remote database is up to date"
```

The 49 older files are in `migrations_archive/` for reference only. They had drifted from production
(the live database was built through Lovable, the dashboard and hand-run SQL and never recorded them),
so they must not be moved back into `migrations/`.

## Making a schema change

1. Add a new file: `npx supabase migration new <short_name>`, then write the SQL in it.
2. Test it on a local copy of production: `npx supabase db start` (needs Docker Desktop running)
   builds a fresh database from `migrations/`. Check it, then `npx supabase stop --no-backup`.
3. Preview, then apply to live: `npx supabase db push --dry-run --linked`, then `npx supabase db push --linked`.
   Only the new file runs, and it is recorded.
4. Commit the migration file with the code that needs it.

Never change the live schema in the dashboard or with ad-hoc SQL: the files would drift again.
One-off data fixes (not structure) can still be run with `npx supabase db query --linked`.

If `db push` says "Remote migration versions not found", your code is out of date: run `git pull`.
Don't run the `migration repair` command it suggests.

Never run `supabase db reset --linked`: it erases the live database.

## Sign-in settings (Authentication, in the dashboard)

Auth settings live in the Supabase dashboard, not in `config.toml` (it holds only the project id).
Don't run `supabase config push`: it would overwrite the live auth settings with local defaults.

### Google sign-in ("Continue with Google" on /login and /signup)

The button is always shown. Until Google is switched on, it says so instead of redirecting (the app
reads the public `/auth/v1/settings`). To switch it on:

1. **Google Cloud console** (APIs & Services):
   - OAuth consent screen: app name Globiculum, a support email, app domain `arnaintellignece.com`,
     scopes `openid`, `email`, `profile` only. Publish the app (In production) so any Google account
     can sign in, not only test users.
   - Credentials > Create OAuth client ID > Web application:
     - Authorised JavaScript origins: `https://arnaintellignece.com` (and `http://localhost:8080` for local testing).
     - Authorised redirect URI: `https://ocrpjxpntzqzcsmedqwm.supabase.co/auth/v1/callback`
   - Copy the client ID and client secret.
2. **Supabase dashboard** > Authentication:
   - Sign In / Providers > Google: enable, paste the client ID and secret, save.
   - URL Configuration: Site URL `https://arnaintellignece.com`. Redirect URLs must include
     `https://arnaintellignece.com/auth/callback` (and `http://localhost:8080/auth/callback` for local use).
     The app returns to `/auth/callback?via=google&next=...&terms=...`.
3. Check: `https://ocrpjxpntzqzcsmedqwm.supabase.co/auth/v1/settings` (with the publishable key as
   `apikey`) shows `"google": true`; then try "Continue with Google" on the live site.

What the app does with a Google account: the name comes from Google (`full_name`, shown in the
header). Google creates the account on first use, so the Terms agreement is handled in
`frontend/src/pages/AuthCallback.tsx`: Sign up passes the time its box was ticked and the page saves
it as `accepted_terms_at` (as for email sign-ups); anyone without it (e.g. a new account from the Log
in page) is asked to agree before going on, or can cancel and log out. An existing email account
with the same address gets Google added to it by Supabase (both addresses are verified).

## Parent permission ("Before we begin" card, T27)

The parent form asks for the parent's permission once, before its first question
(`frontend/src/components/assessment/parent/ParentConsentStep.tsx`). The `record-consent` edge
function checks and saves it in `user_consents` (one row per agreement: server time, wording
version, the two statements, IP address and browser). The browser can't read or write that table
(row security on, no rules), so only the function, with the service key, touches it.

- **Deploy `record-consent` before the frontend that uses it.** Without it, parents can't get past
  the card (it says the agreement couldn't be saved).
  `npx supabase functions deploy record-consent` (from `backend/`).
- **Changing the wording:** never edit it under the same version. Add a new version to
  `PARENT_CONSENT_VERSIONS` in `functions/_shared/consent.ts` and to `PARENT_CONSENT_VERSION` in
  `frontend/src/lib/parentConsent.ts`, deploy the function, then the frontend. Every parent then
  sees the card again.
- Not done yet: the student form's permission (waits on the lead), and a check in
  `analyze-curriculum` that refuses a report without a permission on file. That check can only come
  with the student form's permission, or it would block student reports.

## Known gaps between the old files and production (6 Nov 2026)

These existed in the archived files but are not in the live database. Restoring any of them is a
separate change (a new migration), tracked in the execution plan:

- Indexes: 29 of 35 never created. `20261110105451_add_missing_indexes.sql` (10 Nov 2026) added the
  three that were needed (`curriculum_edges` target, `saved_reports` by user, `shared_reports.token`).
  The others are left out on purpose, including the `curriculum_embeddings` vector index, which the
  report's gap matching would never use; that file explains why.
- Security rules (RLS policies): 29 live versus 130 in the files. 22 tables have RLS on but no policy,
  so the browser cannot use them; the app does for `user_consents`, `data_deletion_requests`,
  `tutor_sessions`, `alerts` and the guardian tables.
- Triggers: none live (the files had 26 `updated_at` and audit-log triggers). That includes the
  `auth.users` trigger that calls `handle_new_user()`: checked 23 Nov 2026, 17 accounts but 0
  `profiles` and 0 `user_roles` rows. The app reads names from the account (`user_metadata`), for
  email and Google sign-ups alike, so nothing breaks today; restore it as part of T58 if profiles
  are needed.
- Foreign keys from `curriculum_edges`, `curriculum_embeddings` and `curriculum_alignments` to
  `curriculum_nodes` have no ON DELETE rule: delete embeddings, then edges, then nodes.
- The `artifacts` storage bucket (and its 4 storage rules) and realtime on `alerts` were never set up live.

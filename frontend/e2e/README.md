# Browser tests (Playwright)

These tests sign in, fill in the form and open share links in a real browser. They create test
accounts and reports, so they run against a **local** Supabase only, never the live project:
`localSupabase.ts` refuses any other address, and every test fails if the page calls a hosted
Supabase project.

## Run them

1. Start Docker Desktop.
2. Start the local Supabase from `backend/` (a copy of the live schema and security rules, no data):

   ```sh
   npx supabase start -x analytics,imgproxy,inbucket,meta,storage,studio,vector
   ```

3. From `frontend/`:

   ```sh
   npx playwright install chromium   # once
   npm run test:e2e
   ```

   This builds the site into `dist-e2e/` pointed at the local Supabase (your `.env` and `dist/`
   are not touched), serves it on http://127.0.0.1:8081 and runs the tests.

4. When done: `npx supabase stop --no-backup` in `backend/`.

Each run recreates two test accounts and a test report (`global-setup.ts`, `testData.ts`).

## What they check

- `privacy.spec.ts`: sign-out removes the child's answers and the login from the browser; the next
  account in the same tab sees none of the previous account's reports; My Reports needs a sign-in.
- `share-link.spec.ts`: a share link opens the report without a sign-in and shows the child's first
  name only; unknown, expired and deleted links open nothing; the public key cannot list reports or
  share links, and another account cannot read them.
- Every test (`fixtures.ts`): nothing in the browser console contains the child's name, an email,
  the password or a login token.
- `consent.spec.ts`: the consent rules from T27. Marked `fixme` (reported as skipped) until T27 is built.

Not covered here: generating a new report. That needs the AI keys and the curriculum data, which the
local copy does not have.

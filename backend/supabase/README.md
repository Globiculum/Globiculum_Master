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

## Known gaps between the old files and production (6 Nov 2026)

These existed in the archived files but are not in the live database. Restoring any of them is a
separate change (a new migration), tracked in the execution plan:

- Indexes: 29 of 35 never created (e.g. `curriculum_edges` source/target, `curriculum_nodes` lookups,
  the `curriculum_embeddings` vector index, `saved_reports.user_id`). Live has 6.
- Security rules (RLS policies): 29 live versus 130 in the files. 22 tables have RLS on but no policy,
  so the browser cannot use them; the app does for `user_consents`, `data_deletion_requests`,
  `tutor_sessions`, `alerts` and the guardian tables.
- Triggers: none live (the files had 26 `updated_at` and audit-log triggers).
- Foreign keys from `curriculum_edges`, `curriculum_embeddings` and `curriculum_alignments` to
  `curriculum_nodes` have no ON DELETE rule: delete embeddings, then edges, then nodes.
- The `artifacts` storage bucket (and its 4 storage rules) and realtime on `alerts` were never set up live.

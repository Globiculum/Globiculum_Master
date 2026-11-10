-- T56: indexes the live database is missing (measured on live, 10 Nov 2026).
--
-- curriculum_edges (target_node_id): looking up edges by target walked the whole
--   (source, target, type) index: 645 ms per lookup. Every curriculum node that is
--   deleted triggers one such lookup (the target FK has no index), which is why
--   curriculum re-ingests time out. Also used by the graph functions and by
--   rag-pipeline's delete-by-target (db/supabase_client.py).
-- saved_reports (user_id, created_at DESC): Reports History lists a user's reports
--   newest first; one row per report, so this table keeps growing.
-- shared_reports (token): fetch-shared-report opens every share link by token.
--
-- Deliberately NOT added:
-- - A vector index on curriculum_embeddings (1.1M rows, 9.3 GB): the report's
--   gap matching (find_curriculum_gaps_rag) compares against a filtered pool held
--   in memory, so it would never use one, and building it on this instance would
--   take hours and several GB of disk.
-- - Single-column curriculum_nodes indexes and a curriculum_edges source index:
--   idx_curriculum_nodes_rag_lookup and the (source, target, type) unique index
--   already cover those lookups.
-- - Indexes on empty or unused tables (assessments, audit_logs, guardian tables,
--   curriculum_alignments, projects...).
--
-- Plain CREATE INDEX (not CONCURRENTLY, which cannot run inside the migration
-- transaction). It blocks writes to each table while that index builds; reads,
-- and so reports, keep working. Only curriculum loading writes to
-- curriculum_edges. lock_timeout makes the migration fail instead of queueing
-- behind a long-running transaction.

SET lock_timeout = '10s';
SET statement_timeout = '15min';

CREATE INDEX IF NOT EXISTS idx_curriculum_edges_target
  ON public.curriculum_edges (target_node_id);

CREATE INDEX IF NOT EXISTS idx_saved_reports_user_created
  ON public.saved_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_reports_token
  ON public.shared_reports (token);

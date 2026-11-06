-- =============================================================================
-- FIX: anyone with the public anon key could soft-delete any user's rows.
--
-- soft_delete(table_name, record_id) (20260127145742) is SECURITY DEFINER and
-- owned by postgres, so it bypasses RLS, and it never checks who owns the row:
--   UPDATE <table_name> SET deleted_at = now() WHERE id = record_id
-- Live (checked 24 Oct 2026) EXECUTE was granted to PUBLIC, anon and
-- authenticated, so any caller could hide another family's saved_reports,
-- student_profiles, assessments (or any of the 8 tables with deleted_at) given
-- a row id. No row had deleted_at set, so it had not been used.
--
-- Nothing in the app, edge functions or ingestion calls it. Execution is kept
-- for service_role only, so server code can still use it deliberately.
--
-- Rollback (re-opens the hole):
--   GRANT EXECUTE ON FUNCTION public.soft_delete(text, uuid) TO anon, authenticated;
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.soft_delete(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete(text, uuid) TO service_role;

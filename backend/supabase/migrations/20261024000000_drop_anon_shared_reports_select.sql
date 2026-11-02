-- =============================================================================
-- FIX (T26): anyone could list every shared child report.
--
-- "Anyone can view shared report by token" (20260305110611, re-created in
-- 20260901000000) is FOR SELECT TO anon USING (true): despite its name it never
-- checks a token, so the public anon key could read every row of
-- shared_reports (verified live 24 Oct 2026: all 14 rows), and each token then
-- opened a full child report through fetch-shared-report.
--
-- Nothing needs the policy. fetch-shared-report looks tokens up with the
-- service role, which bypasses RLS, and the browser only touches this table
-- signed in (insert + read back its own token), which the "own" policies cover.
-- Shared links keep working.
--
-- Rollback (re-opens the leak, do not use without a token-scoped design):
--   CREATE POLICY "Anyone can view shared report by token"
--     ON public.shared_reports FOR SELECT TO anon USING (true);
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view shared report by token" ON public.shared_reports;

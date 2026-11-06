-- =============================================================================
-- RESTORE MISSING RLS POLICIES on profiles, student_profiles, assessments,
-- diagnostic_results.
--
-- FOUND DURING PRODUCTION AUDIT (2026-09-10): live `pg_policies` shows ZERO
-- policies on these 4 tables, even though 20260716000000_ensure_rls_all_tables.sql
-- turned RLS ON for all of them (to satisfy the Supabase "rls_disabled_in_public"
-- advisor warning). RLS enabled + zero policies = deny-all for every role
-- except service_role/postgres. Confirmed live: a fresh test user's own
-- browser-equivalent session (anon key + user JWT) could not see its own
-- freshly-inserted student_profiles row at all.
--
-- This is NOT caused by the curriculum architecture work in this session —
-- it predates it. But it silently breaks:
--   - submitAssessment.ts's very first call, `.from("student_profiles").select("id")...`,
--     which runs directly from the browser (not through an edge function) —
--     every fresh assessment submission likely fails at this step for a real
--     user, and falls back to the local-only fallbackResult() path.
--   - diagnostics-engine, which reads student_profiles via the caller's own
--     JWT (not service_role) — this is WHY the audit's live diagnostics-engine
--     test returned 404 "Student profile not found" for a row that
--     demonstrably existed (confirmed via service_role).
--   - useAlignmentData.ts's Dashboard "Alignment Overview" widget, and this
--     session's new fetch of the latest `assessments` row for state-aware
--     alignment (both read these tables directly from the browser).
--
-- The correct policies already exist, unapplied, in two places:
--   - profiles/student_profiles/assessments: the ORIGINAL base migration
--     20251124214402_remix_migration_from_pg_dump.sql (lines ~654-829) —
--     this file's CREATE POLICY statements never actually ran against this
--     project, even though the tables themselves clearly exist.
--   - diagnostic_results: 20260305092906_9096065a-0ed9-4bad-a1d3-ccb4ea7eb8a0.sql
--     (lines ~23-40) — also written, also never applied.
--
-- This migration re-issues exactly those policies, guarded with
-- DROP POLICY IF EXISTS so it's safe to run even if some already exist.
-- =============================================================================

-- ── profiles ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── student_profiles ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own student profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can insert own student profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can update own student profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can delete own student profiles" ON public.student_profiles;

CREATE POLICY "Users can view own student profile" ON public.student_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own student profile" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own student profile" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own student profiles" ON public.student_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ── assessments ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can insert own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can delete own assessments" ON public.assessments;

CREATE POLICY "Users can view own assessments" ON public.assessments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assessments" ON public.assessments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assessments" ON public.assessments
  FOR DELETE USING (auth.uid() = user_id);

-- ── diagnostic_results ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own diagnostic results" ON public.diagnostic_results;
DROP POLICY IF EXISTS "Users can insert own diagnostic results" ON public.diagnostic_results;
DROP POLICY IF EXISTS "Users can update own diagnostic results" ON public.diagnostic_results;
DROP POLICY IF EXISTS "Users can delete own diagnostic results" ON public.diagnostic_results;

CREATE POLICY "Users can view own diagnostic results" ON public.diagnostic_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own diagnostic results" ON public.diagnostic_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diagnostic results" ON public.diagnostic_results
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diagnostic results" ON public.diagnostic_results
  FOR DELETE USING (auth.uid() = user_id);

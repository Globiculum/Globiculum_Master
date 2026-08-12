-- =============================================================================
-- FIX: Ensure saved_reports has the correct RLS policies for authenticated users.
-- This is idempotent: it drops and re-creates the policies only if they exist,
-- guaranteeing the live Supabase project matches the repo state.
-- Run via Supabase SQL Editor or `supabase migration up`.
-- =============================================================================

-- 1. Make sure RLS is enabled
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing saved_reports policies so we can recreate them cleanly
DROP POLICY IF EXISTS "Users can view own reports" ON public.saved_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.saved_reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.saved_reports;

-- 3. Recreate the policies with the correct user_id = auth.uid() checks
CREATE POLICY "Users can view own reports"
  ON public.saved_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON public.saved_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON public.saved_reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

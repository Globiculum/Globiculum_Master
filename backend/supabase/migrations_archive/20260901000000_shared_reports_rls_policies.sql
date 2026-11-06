-- =============================================================================
-- FIX: shared_reports had RLS enabled but no policies (all operations blocked).
-- The table was created outside the CLI migration flow (via Lovable) without
-- the accompanying CREATE POLICY statements. Applied directly to production via
-- supabase db query --linked on 2026-09-01; recorded here for repo consistency.
-- =============================================================================

-- Idempotent: only create if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shared_reports'
      AND policyname = 'Users can insert own shared reports'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can insert own shared reports"
        ON public.shared_reports FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shared_reports'
      AND policyname = 'Users can view own shared reports'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can view own shared reports"
        ON public.shared_reports FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shared_reports'
      AND policyname = 'Users can delete own shared reports'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can delete own shared reports"
        ON public.shared_reports FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id)
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shared_reports'
      AND policyname = 'Anyone can view shared report by token'
  ) THEN
    EXECUTE '
      CREATE POLICY "Anyone can view shared report by token"
        ON public.shared_reports FOR SELECT
        TO anon
        USING (true)
    ';
  END IF;
END $$;

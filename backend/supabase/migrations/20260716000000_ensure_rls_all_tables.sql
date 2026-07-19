-- =============================================================================
-- ENSURE ROW LEVEL SECURITY IS ENABLED ON ALL PUBLIC TABLES
-- Idempotent: ALTER TABLE ... ENABLE ROW LEVEL SECURITY is safe to re-run.
-- Resolves Supabase "rls_disabled_in_public" advisor warning.
-- =============================================================================

-- Core user / profile tables
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles      ENABLE ROW LEVEL SECURITY;

-- Alerts & sessions
ALTER TABLE public.alerts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions              ENABLE ROW LEVEL SECURITY;

-- Assessment / reporting tables
ALTER TABLE public.assessments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gap_reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_pathways     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cultural_modules      ENABLE ROW LEVEL SECURITY;

-- Saved / shared reports
ALTER TABLE public.saved_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_artifacts      ENABLE ROW LEVEL SECURITY;

-- Audit & diagnostic
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_results    ENABLE ROW LEVEL SECURITY;

-- Curriculum knowledge graph
ALTER TABLE public.curriculum_nodes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_edges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_embeddings ENABLE ROW LEVEL SECURITY;

-- Security & consent
ALTER TABLE public.user_consents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_keys       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_rules      ENABLE ROW LEVEL SECURITY;

-- Projects, feedback, tutor sessions
ALTER TABLE public.projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_sessions        ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- MISSING POLICIES: validation_rules was created without a SELECT policy.
-- Authenticated users need to read validation rules for the knowledge layer.
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'validation_rules'
      AND policyname = 'Authenticated users can read validation rules'
  ) THEN
    EXECUTE '
      CREATE POLICY "Authenticated users can read validation rules"
        ON public.validation_rules
        FOR SELECT
        TO authenticated
        USING (true)
    ';
  END IF;
END $$;

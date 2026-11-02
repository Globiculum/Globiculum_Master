-- =============================================================================
-- FIX: deleting a report from Reports History failed ("Failed to delete report")
-- whenever anything pointed at it.
--
-- Live (checked 24 Oct 2026), every foreign key referencing saved_reports had no
-- ON DELETE action, although the migrations that created them declare one
-- (schema drift: these tables were created outside the CLI). Postgres therefore
-- rejected the delete (23503) for any report that had been shared (9 reports) or
-- that a retake points to as its previous report (2 reports).
--
-- Intended behaviour, restored here:
--   shared_reports.report_id   CASCADE   (20260305110611) share links go with the report
--   report_artifacts.report_id CASCADE   (20260127145742)
--   feedback.report_id         SET NULL  (20260127145742) feedback is kept
--   saved_reports.prev_report_id SET NULL (column has no migration) the newer
--     retake is kept and just loses its comparison baseline; ReportPreview
--     already skips the comparison when the previous report is missing.
-- =============================================================================

BEGIN;

ALTER TABLE public.shared_reports DROP CONSTRAINT IF EXISTS shared_reports_report_id_fkey;
ALTER TABLE public.shared_reports
  ADD CONSTRAINT shared_reports_report_id_fkey
  FOREIGN KEY (report_id) REFERENCES public.saved_reports(id) ON DELETE CASCADE;

ALTER TABLE public.report_artifacts DROP CONSTRAINT IF EXISTS report_artifacts_report_id_fkey;
ALTER TABLE public.report_artifacts
  ADD CONSTRAINT report_artifacts_report_id_fkey
  FOREIGN KEY (report_id) REFERENCES public.saved_reports(id) ON DELETE CASCADE;

ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_report_id_fkey;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_report_id_fkey
  FOREIGN KEY (report_id) REFERENCES public.saved_reports(id) ON DELETE SET NULL;

ALTER TABLE public.saved_reports DROP CONSTRAINT IF EXISTS saved_reports_prev_report_id_fkey;
ALTER TABLE public.saved_reports
  ADD CONSTRAINT saved_reports_prev_report_id_fkey
  FOREIGN KEY (prev_report_id) REFERENCES public.saved_reports(id) ON DELETE SET NULL;

COMMIT;

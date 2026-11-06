-- Study resources shown in reports: textbooks, video lessons and practice
-- material per target board, class and subject.
--
-- Filled by backend/rag-pipeline/ingest/learning_resources.py, which keeps
-- only links verified to show the expected class and subject. The report used
-- to list each subject's gap topics again under "Resources" (the same links as
-- its Missing Topics table) and showed "No eBooks / YouTube channels / question
-- banks available yet" below; both now read from this table.

CREATE TABLE IF NOT EXISTS public.learning_resources (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'cbse' | 'isc' | 'any' (suits both, e.g. NCERT Physics, Khan Academy)
  board          TEXT NOT NULL CHECK (board IN ('cbse', 'isc', 'any')),
  -- Subject key ('physics', 'social-science', ...) or '*' for every subject.
  subject        TEXT NOT NULL,
  grade_min      INT  NOT NULL CHECK (grade_min BETWEEN 1 AND 12),
  grade_max      INT  NOT NULL CHECK (grade_max BETWEEN grade_min AND 12),
  -- textbook -> report "eBooks", video -> "Video Lessons", practice -> "Question Banks"
  resource_type  TEXT NOT NULL CHECK (resource_type IN ('textbook', 'video', 'practice')),
  provider       TEXT NOT NULL,
  title          TEXT NOT NULL,
  url            TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_resources_lookup
  ON public.learning_resources (board, grade_min, grade_max);

-- Public reference data: readable by the report pages (including shared
-- reports opened without signing in); written only by the import script.
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learning resources are readable" ON public.learning_resources;
CREATE POLICY "Learning resources are readable"
  ON public.learning_resources FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.learning_resources TO anon, authenticated;
GRANT ALL ON public.learning_resources TO service_role;

-- Study links for reports, part 2 (T05).
--
-- 1. Reference books. The subject card's "Where to study" listed one NCERT or
--    CISCE book plus videos and practice sites. Reference books (R.D. Sharma,
--    H.C. Verma, Selina Concise, Oswaal question banks...) are catalogued as a
--    fourth resource type, linked to the publisher's own page. Widens the
--    check only; every existing row stays valid.
ALTER TABLE public.learning_resources DROP CONSTRAINT IF EXISTS learning_resources_resource_type_check;
ALTER TABLE public.learning_resources
  ADD CONSTRAINT learning_resources_resource_type_check
  CHECK (resource_type IN ('textbook', 'video', 'practice', 'reference'));

-- 2. Links for each gap topic. A subject card lists the topics a student is
--    missing; each used to link only to its source document: NCERT's chapter
--    viewer page (it shows the PDF in a frame, which phones leave blank, and
--    for most Class 11-12 chapters it opened the book's front pages instead),
--    or the whole CISCE syllabus PDF for ICSE/ISC. This table gives every
--    topic its own links for its board: the NCERT chapter PDF itself, the
--    matching Khan Academy unit and free chapter-wise solutions. The report
--    matches rows to its gaps by board, class and topic name (the curriculum
--    node's name), so reports saved earlier get the links too.
--
--    Filled by backend/rag-pipeline/ingest/topic_resources.py.
CREATE TABLE IF NOT EXISTS public.topic_resources (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board          TEXT NOT NULL CHECK (board IN ('cbse', 'icse', 'isc')),
  grade          INT  NOT NULL CHECK (grade BETWEEN 1 AND 12),
  -- The node's metadata.subject ("Mathematics", "History & Civics", ...).
  subject        TEXT NOT NULL,
  -- curriculum_nodes.name of the topic, exactly.
  topic          TEXT NOT NULL,
  -- textbook -> "Read chapter", video -> "Lesson", practice -> "Solutions"
  resource_type  TEXT NOT NULL CHECK (resource_type IN ('textbook', 'video', 'practice')),
  provider       TEXT NOT NULL,
  title          TEXT NOT NULL,
  url            TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS topic_resources_lookup
  ON public.topic_resources (board, grade);

-- Public reference data, like learning_resources: readable by report pages
-- (shared reports are opened without signing in); written only by the script.
ALTER TABLE public.topic_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Topic resources are readable" ON public.topic_resources;
CREATE POLICY "Topic resources are readable"
  ON public.topic_resources FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.topic_resources TO anon, authenticated;
GRANT ALL ON public.topic_resources TO service_role;

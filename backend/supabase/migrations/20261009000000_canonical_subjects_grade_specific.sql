-- Subject list per grade for the assessment form.
--
-- The form showed the same subjects for every grade (Grade 1 listed World
-- Languages and Personal Finance). get_canonical_subjects counted, for any
-- grade, three kinds of standards that do not belong to that grade:
--   * catch-all ranges: 43,293 US standards are tagged K-12 because their grade
--     was never recorded, plus wide bands such as K-6 and K-8;
--   * Kindergarten-only standards (grade 0-0), counted for every grade;
--   * Personal Finance financial-literacy strands (e.g. Ohio K-3), which sit
--     inside social studies and are not a subject a young child takes.
-- Checked on live data (8 Oct 2026): World Languages at Grade 1 came only from
-- K-12 catch-alls in California, Florida and Maryland (Ohio: a K-6 band).
-- Arts and PE & Health are genuine Grade 1 subjects (Florida has 672 Arts
-- standards written for Grade 1), so they stay; the form marks them as
-- electives, not core.
--
-- p_grade_specific (new, default FALSE): count only standards written for the
-- grade or a normal band (K-2, 3-5, 6-8, 9-12: span <= 3 grades), and show
-- Personal Finance from Grade 9. World Languages standards are written by
-- proficiency level (Novice..Advanced), not grade, so most states tag them K-12;
-- from Grade 6, when language courses are commonly taken, those count too.
-- The gap engine keeps the default: for a source pool every standard the
-- student may have met counts.

DROP FUNCTION IF EXISTS public.get_canonical_subjects(TEXT, INT, INT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_canonical_subjects(
  p_curriculum_system TEXT,
  p_grade_min         INT     DEFAULT NULL,
  p_grade_max         INT     DEFAULT NULL,
  p_core_only         BOOLEAN DEFAULT FALSE,
  p_grade_specific    BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  canonical_subject TEXT,
  domain            TEXT,
  is_core           BOOLEAN,
  node_count        BIGINT,
  raw_subjects      TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      COALESCE(p_grade_min, p_grade_max) AS gmin,
      COALESCE(p_grade_max, p_grade_min) AS gmax
  ),
  scoped AS (
    SELECT
      si.subject AS raw_subject,
      SUM(si.node_count) AS n_all,
      SUM(si.node_count) FILTER (WHERE si.grade_level_max - si.grade_level_min <= 3) AS n_graded
    FROM public.curriculum_subject_index si, bounds b
    WHERE si.curriculum_system = p_curriculum_system
      AND (
        b.gmin IS NULL
        OR (NOT p_grade_specific AND si.grade_level_min = 0 AND si.grade_level_max = 0)
        OR (si.grade_level_min <= b.gmax AND si.grade_level_max >= b.gmin)
      )
    GROUP BY si.subject
  ),
  counted AS (
    SELECT
      sm.canonical_subject, sm.domain, sm.is_core, sm.vintage_end, s.raw_subject,
      CASE
        WHEN NOT p_grade_specific THEN s.n_all
        WHEN sm.canonical_subject = 'World Languages' AND COALESCE(b.gmin, 12) >= 6 THEN s.n_all
        ELSE COALESCE(s.n_graded, 0)
      END AS n
    FROM scoped s
    JOIN public.subject_mappings sm ON sm.raw_subject = s.raw_subject
    CROSS JOIN bounds b
    WHERE sm.canonical_subject IS NOT NULL
      AND (NOT p_core_only OR sm.is_core)
      AND NOT (p_grade_specific AND sm.canonical_subject = 'Personal Finance' AND COALESCE(b.gmax, 12) < 9)
  ),
  mapped AS (
    SELECT c.*, (c.vintage_end IS NULL OR c.vintage_end >= EXTRACT(YEAR FROM now())::INT) AS is_current
    FROM counted c
    WHERE c.n > 0
  ),
  currency AS (
    SELECT
      m.canonical_subject,
      bool_or(m.is_current)                              AS any_current,
      max(m.vintage_end) FILTER (WHERE NOT m.is_current) AS latest_superseded
    FROM mapped m
    GROUP BY m.canonical_subject
  )
  SELECT
    m.canonical_subject,
    m.domain,
    m.is_core,
    SUM(m.n)::BIGINT AS node_count,
    array_agg(m.raw_subject ORDER BY m.raw_subject) AS raw_subjects
  FROM mapped m
  JOIN currency c ON c.canonical_subject = m.canonical_subject
  WHERE (c.any_current AND m.is_current)
     OR (NOT c.any_current AND m.vintage_end = c.latest_superseded)
  GROUP BY m.canonical_subject, m.domain, m.is_core
  ORDER BY m.is_core DESC, m.canonical_subject;
$$;

GRANT EXECUTE ON FUNCTION public.get_canonical_subjects(TEXT, INT, INT, BOOLEAN, BOOLEAN)
  TO anon, authenticated, service_role;

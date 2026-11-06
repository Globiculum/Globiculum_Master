-- Return the subjects a curriculum actually teaches at a given grade, so the
-- assessment form can stop hardcoding subject lists.
--
-- Why an RPC rather than a direct table read from the browser:
-- curriculum_nodes' SELECT policy is restricted to admins or users who already
-- have a student_profiles row (tightened in 20260121170116), but the assessment
-- wizard runs on /begin-journey which is a PUBLIC route - a visitor filling the
-- form has no profile yet, so a direct query returns zero rows. SECURITY DEFINER
-- here exposes only distinct subject labels and counts, never node content, and
-- mirrors get_distinct_curriculum_systems() which exists for the same reason.
--
-- p_stream filters ISC/NCERT Classes XI-XII by stream ('science' | 'commerce' |
-- 'humanities'). Subjects can belong to several streams (Mathematics is taken in
-- both Science and Commerce), which is why metadata.streams is an array and this
-- uses a containment test rather than equality. NULL returns every subject.

CREATE OR REPLACE FUNCTION public.get_curriculum_subjects(
  p_curriculum_system TEXT,
  p_grade INT DEFAULT NULL,
  p_stream TEXT DEFAULT NULL
)
RETURNS TABLE(
  subject TEXT,
  node_count BIGINT,
  streams TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      cn.metadata->>'subject' AS subject,
      CASE
        WHEN jsonb_typeof(cn.metadata->'streams') = 'array'
        THEN cn.metadata->'streams'
        ELSE '[]'::jsonb
      END AS streams_json
    FROM public.curriculum_nodes cn
    WHERE cn.curriculum_system = p_curriculum_system
      AND cn.metadata->>'subject' IS NOT NULL
      AND cn.metadata->>'subject' <> ''
      -- Grade 0 means "applies to every grade" (see 20260828000000), so it must
      -- not be excluded by a specific-grade request.
      AND (
        p_grade IS NULL
        OR (cn.grade_level_min = 0 AND cn.grade_level_max = 0)
        OR (cn.grade_level_min <= p_grade AND cn.grade_level_max >= p_grade)
      )
      AND (
        p_stream IS NULL
        OR cn.metadata->'streams' @> to_jsonb(p_stream)
      )
  ),
  counts AS (
    SELECT s.subject, COUNT(*) AS node_count
    FROM scoped s
    GROUP BY s.subject
  ),
  -- Flattened separately from counts: a subject's streams live in a jsonb array
  -- per node, so they need expanding before they can be de-duplicated. An empty
  -- array yields no rows here, which the LEFT JOIN below turns back into '{}'.
  stream_map AS (
    SELECT s.subject, array_agg(DISTINCT el ORDER BY el) AS streams
    FROM scoped s
    CROSS JOIN LATERAL jsonb_array_elements_text(s.streams_json) AS el
    GROUP BY s.subject
  )
  SELECT
    c.subject,
    c.node_count,
    COALESCE(sm.streams, ARRAY[]::TEXT[]) AS streams
  FROM counts c
  LEFT JOIN stream_map sm ON sm.subject = c.subject
  ORDER BY 1;
$$;

-- anon included deliberately: the assessment form is reachable before sign-in.
GRANT EXECUTE ON FUNCTION public.get_curriculum_subjects(TEXT, INT, TEXT)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_curriculum_subjects(TEXT, INT, TEXT) IS
  'Distinct subjects for a curriculum_system at a grade, optionally filtered by stream. Drives the assessment form subject list instead of hardcoded arrays.';

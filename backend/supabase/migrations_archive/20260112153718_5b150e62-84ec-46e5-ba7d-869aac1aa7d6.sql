-- Fix warning-level security issues
-- 1. Add input validation to SECURITY DEFINER functions to prevent DoS
-- 2. Add guardian access to sessions table RLS policies

-- =====================================================
-- FIX 1: Update traverse_curriculum_graph with input validation
-- Must DROP first since return type needs to match exactly
-- =====================================================
DROP FUNCTION IF EXISTS public.traverse_curriculum_graph(uuid, integer, text[]);

CREATE FUNCTION public.traverse_curriculum_graph(
  start_node_id uuid,
  max_depth integer DEFAULT 3,
  relationship_types text[] DEFAULT NULL
)
RETURNS TABLE (
  node_id uuid,
  node_type text,
  name text,
  depth integer,
  path uuid[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validated_max_depth integer;
BEGIN
  -- Input validation: Limit max_depth to prevent resource exhaustion (DoS protection)
  IF max_depth IS NULL OR max_depth < 1 THEN
    validated_max_depth := 3;
  ELSIF max_depth > 10 THEN
    validated_max_depth := 10;
  ELSE
    validated_max_depth := max_depth;
  END IF;

  RETURN QUERY
  WITH RECURSIVE graph_traversal AS (
    -- Base case: start node
    SELECT 
      cn.id,
      cn.node_type,
      cn.name,
      0 AS depth,
      ARRAY[cn.id] AS path
    FROM curriculum_nodes cn
    WHERE cn.id = start_node_id
    
    UNION ALL
    
    -- Recursive case: follow edges
    SELECT 
      cn.id,
      cn.node_type,
      cn.name,
      gt.depth + 1,
      gt.path || cn.id
    FROM graph_traversal gt
    JOIN curriculum_edges ce ON ce.source_node_id = gt.id
    JOIN curriculum_nodes cn ON cn.id = ce.target_node_id
    WHERE 
      gt.depth < validated_max_depth
      AND NOT cn.id = ANY(gt.path) -- prevent cycles
      AND (relationship_types IS NULL OR ce.relationship_type = ANY(relationship_types))
  )
  SELECT 
    gt.id AS node_id,
    gt.node_type,
    gt.name,
    gt.depth,
    gt.path
  FROM graph_traversal gt
  ORDER BY gt.depth, gt.name;
END;
$$;

-- =====================================================
-- FIX 2: Update find_curriculum_gaps with input validation
-- =====================================================
CREATE OR REPLACE FUNCTION public.find_curriculum_gaps(
  source_curriculum_param text,
  target_curriculum_param text,
  grade_level integer DEFAULT NULL
)
RETURNS TABLE (
  source_topic text,
  target_topic text,
  alignment_score numeric,
  gap_type text,
  notes text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation: Validate grade level range (DoS protection)
  IF grade_level IS NOT NULL AND (grade_level < 1 OR grade_level > 12) THEN
    RAISE EXCEPTION 'Invalid grade level: must be between 1 and 12';
  END IF;

  -- Input validation: Require curriculum parameters
  IF source_curriculum_param IS NULL OR target_curriculum_param IS NULL THEN
    RAISE EXCEPTION 'Source and target curriculum parameters are required';
  END IF;

  RETURN QUERY
  SELECT 
    scn.name AS source_topic,
    tcn.name AS target_topic,
    ca.alignment_score,
    ca.gap_type,
    ca.notes
  FROM curriculum_alignments ca
  JOIN curriculum_nodes scn ON scn.id = ca.source_node_id
  JOIN curriculum_nodes tcn ON tcn.id = ca.target_node_id
  WHERE 
    ca.source_curriculum = source_curriculum_param
    AND ca.target_curriculum = target_curriculum_param
    AND (grade_level IS NULL 
         OR (scn.grade_level_min <= grade_level AND scn.grade_level_max >= grade_level))
    AND ca.alignment_score < 1.0 -- only gaps
  ORDER BY ca.alignment_score ASC;
END;
$$;

-- =====================================================
-- FIX 3: Add guardian access to sessions table RLS policies
-- =====================================================

-- Drop existing SELECT policy for sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;

-- Create new SELECT policy that includes verified guardian access
CREATE POLICY "Users and guardians can view sessions"
  ON public.sessions FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.guardian_relationships gr
      WHERE gr.guardian_user_id = auth.uid()
      AND gr.student_user_id = sessions.user_id
      AND gr.verified = true
      AND (gr.expires_at IS NULL OR gr.expires_at > now())
      AND gr.access_level IN ('full', 'limited')
    )
  );

-- Drop existing INSERT policy for sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;

-- Create new INSERT policy that allows guardians with full access to create sessions
CREATE POLICY "Users and guardians can insert sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.guardian_relationships gr
      WHERE gr.guardian_user_id = auth.uid()
      AND gr.student_user_id = user_id
      AND gr.verified = true
      AND (gr.expires_at IS NULL OR gr.expires_at > now())
      AND gr.access_level = 'full'
    )
  );

-- Drop existing UPDATE policy for sessions
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;

-- Create new UPDATE policy that allows guardians with full access to modify sessions
CREATE POLICY "Users and guardians can update sessions"
  ON public.sessions FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.guardian_relationships gr
      WHERE gr.guardian_user_id = auth.uid()
      AND gr.student_user_id = sessions.user_id
      AND gr.verified = true
      AND (gr.expires_at IS NULL OR gr.expires_at > now())
      AND gr.access_level = 'full'
    )
  );

-- Drop existing DELETE policy for sessions  
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;

-- Create new DELETE policy that allows guardians with full access to cancel sessions
CREATE POLICY "Users and guardians can delete sessions"
  ON public.sessions FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.guardian_relationships gr
      WHERE gr.guardian_user_id = auth.uid()
      AND gr.student_user_id = sessions.user_id
      AND gr.verified = true
      AND (gr.expires_at IS NULL OR gr.expires_at > now())
      AND gr.access_level = 'full'
    )
  );
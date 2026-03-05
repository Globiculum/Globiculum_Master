-- =============================================
-- KNOWLEDGE GRAPH TABLES
-- =============================================

-- Curriculum nodes in the knowledge graph
CREATE TABLE public.curriculum_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type text NOT NULL CHECK (node_type IN ('curriculum', 'subject', 'topic', 'learning_outcome', 'skill', 'standard')),
  name text NOT NULL,
  description text,
  grade_level_min integer,
  grade_level_max integer,
  curriculum_system text, -- e.g., 'us-common-core', 'ib-pyp', 'cbse'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Relationships between curriculum nodes (edges in the graph)
CREATE TABLE public.curriculum_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id uuid NOT NULL REFERENCES public.curriculum_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.curriculum_nodes(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('contains', 'prerequisite', 'related_to', 'equivalent_to', 'maps_to', 'extends')),
  weight numeric DEFAULT 1.0, -- relationship strength
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_reference CHECK (source_node_id != target_node_id),
  UNIQUE (source_node_id, target_node_id, relationship_type)
);

-- Curriculum alignment mappings (cross-curriculum equivalence)
CREATE TABLE public.curriculum_alignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_curriculum text NOT NULL,
  target_curriculum text NOT NULL,
  source_node_id uuid NOT NULL REFERENCES public.curriculum_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.curriculum_nodes(id) ON DELETE CASCADE,
  alignment_score numeric NOT NULL CHECK (alignment_score >= 0 AND alignment_score <= 1),
  gap_type text CHECK (gap_type IN ('content', 'depth', 'timing', 'approach', 'none')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- SECURITY & CONSENT TABLES
-- =============================================

-- User consent records (GDPR/COPPA compliance)
CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('terms_of_service', 'privacy_policy', 'data_processing', 'marketing', 'analytics', 'child_data_coppa', 'data_export', 'data_deletion')),
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  version text NOT NULL DEFAULT '1.0', -- policy version consented to
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, consent_type, version)
);

-- Data deletion requests (GDPR right to erasure)
CREATE TABLE public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  reason text,
  completed_at timestamptz,
  processed_by uuid, -- admin who processed
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Parent/guardian access management (for minors)
CREATE TABLE public.guardian_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_user_id uuid NOT NULL,
  student_user_id uuid NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'guardian', 'authorized_adult')),
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  access_level text NOT NULL DEFAULT 'full' CHECK (access_level IN ('view_only', 'limited', 'full')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guardian_user_id, student_user_id),
  CONSTRAINT no_self_guardian CHECK (guardian_user_id != student_user_id)
);

-- Sensitive data encryption keys (key metadata, not actual keys)
CREATE TABLE public.encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_identifier text NOT NULL UNIQUE, -- for key rotation tracking
  algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  purpose text NOT NULL CHECK (purpose IN ('pii', 'documents', 'communications', 'backups')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  expires_at timestamptz
);

-- Data access logs (who accessed what sensitive data)
CREATE TABLE public.data_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_user_id uuid, -- whose data was accessed
  table_name text NOT NULL,
  record_id uuid,
  access_type text NOT NULL CHECK (access_type IN ('view', 'export', 'download', 'print', 'share')),
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- ENHANCED STUDENT VALIDATION TABLE
-- =============================================

-- Validation rules for student data
CREATE TABLE public.validation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  rule_type text NOT NULL CHECK (rule_type IN ('age_grade', 'curriculum_compatibility', 'document', 'timeline', 'location')),
  conditions jsonb NOT NULL, -- rule conditions in JSON format
  error_message text NOT NULL,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES FOR GRAPH TRAVERSAL
-- =============================================

CREATE INDEX idx_curriculum_nodes_type ON public.curriculum_nodes(node_type);
CREATE INDEX idx_curriculum_nodes_curriculum ON public.curriculum_nodes(curriculum_system);
CREATE INDEX idx_curriculum_nodes_grade ON public.curriculum_nodes(grade_level_min, grade_level_max);
CREATE INDEX idx_curriculum_edges_source ON public.curriculum_edges(source_node_id);
CREATE INDEX idx_curriculum_edges_target ON public.curriculum_edges(target_node_id);
CREATE INDEX idx_curriculum_edges_type ON public.curriculum_edges(relationship_type);
CREATE INDEX idx_curriculum_alignments_curricula ON public.curriculum_alignments(source_curriculum, target_curriculum);
CREATE INDEX idx_user_consents_user ON public.user_consents(user_id);
CREATE INDEX idx_data_access_logs_user ON public.data_access_logs(user_id);
CREATE INDEX idx_data_access_logs_accessed ON public.data_access_logs(accessed_user_id);
CREATE INDEX idx_guardian_relationships_guardian ON public.guardian_relationships(guardian_user_id);
CREATE INDEX idx_guardian_relationships_student ON public.guardian_relationships(student_user_id);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.curriculum_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Curriculum nodes: public read for authenticated users, admin write
CREATE POLICY "Authenticated users can view curriculum nodes"
  ON public.curriculum_nodes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage curriculum nodes"
  ON public.curriculum_nodes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Curriculum edges: same as nodes
CREATE POLICY "Authenticated users can view curriculum edges"
  ON public.curriculum_edges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage curriculum edges"
  ON public.curriculum_edges FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Curriculum alignments: same as nodes
CREATE POLICY "Authenticated users can view alignments"
  ON public.curriculum_alignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage alignments"
  ON public.curriculum_alignments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- User consents: users manage their own
CREATE POLICY "Users can view own consents"
  ON public.user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON public.user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON public.user_consents FOR UPDATE
  USING (auth.uid() = user_id);

-- Data deletion requests: users own, admins can view all
CREATE POLICY "Users can view own deletion requests"
  ON public.data_deletion_requests FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create deletion requests"
  ON public.data_deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update deletion requests"
  ON public.data_deletion_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Guardian relationships: guardians and students can view, guardians insert
CREATE POLICY "View guardian relationships"
  ON public.guardian_relationships FOR SELECT
  USING (auth.uid() = guardian_user_id OR auth.uid() = student_user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Guardians can create relationships"
  ON public.guardian_relationships FOR INSERT
  WITH CHECK (auth.uid() = guardian_user_id);

CREATE POLICY "Guardians and admins can update relationships"
  ON public.guardian_relationships FOR UPDATE
  USING (auth.uid() = guardian_user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete relationships"
  ON public.guardian_relationships FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Encryption keys: admin only
CREATE POLICY "Only admins can view encryption keys"
  ON public.encryption_keys FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage encryption keys"
  ON public.encryption_keys FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Data access logs: users see own, admins see all
CREATE POLICY "Users can view own access logs"
  ON public.data_access_logs FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = accessed_user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts access logs"
  ON public.data_access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Validation rules: all authenticated can read, admin write
CREATE POLICY "Authenticated users can view validation rules"
  ON public.validation_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage validation rules"
  ON public.validation_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- =============================================
-- GRAPH TRAVERSAL FUNCTIONS
-- =============================================

-- Find all related nodes (BFS traversal)
CREATE OR REPLACE FUNCTION public.traverse_curriculum_graph(
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
BEGIN
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
      gt.depth < max_depth
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

-- Find learning gaps between curricula
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

-- Get prerequisites for a topic
CREATE OR REPLACE FUNCTION public.get_prerequisites(topic_node_id uuid)
RETURNS TABLE (
  prerequisite_id uuid,
  prerequisite_name text,
  prerequisite_type text,
  depth integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    node_id AS prerequisite_id,
    name AS prerequisite_name,
    node_type AS prerequisite_type,
    depth
  FROM traverse_curriculum_graph(
    topic_node_id,
    5, -- max 5 levels of prerequisites
    ARRAY['prerequisite']
  )
  WHERE node_id != topic_node_id;
END;
$$;

-- =============================================
-- SEED VALIDATION RULES
-- =============================================

INSERT INTO public.validation_rules (rule_name, rule_type, conditions, error_message, severity) VALUES
('age_grade_elementary', 'age_grade', '{"min_age": 5, "max_age": 11, "grades": [1,2,3,4,5]}', 'Age does not match elementary school grade range (5-11 years for grades 1-5)', 'warning'),
('age_grade_middle', 'age_grade', '{"min_age": 10, "max_age": 14, "grades": [6,7,8]}', 'Age does not match middle school grade range (10-14 years for grades 6-8)', 'warning'),
('age_grade_high', 'age_grade', '{"min_age": 13, "max_age": 19, "grades": [9,10,11,12]}', 'Age does not match high school grade range (13-19 years for grades 9-12)', 'warning'),
('ib_pyp_grades', 'curriculum_compatibility', '{"curriculum": "ib-pyp", "valid_grades": [1,2,3,4,5]}', 'IB PYP is designed for elementary grades (1-5)', 'error'),
('ib_myp_grades', 'curriculum_compatibility', '{"curriculum": "ib-myp", "valid_grades": [6,7,8,9,10]}', 'IB MYP is designed for grades 6-10', 'error'),
('ib_dp_grades', 'curriculum_compatibility', '{"curriculum": "ib-dp", "valid_grades": [11,12]}', 'IB Diploma Programme is designed for grades 11-12', 'error'),
('ap_grades', 'curriculum_compatibility', '{"curriculum": "ap", "valid_grades": [10,11,12]}', 'AP courses are typically for grades 10-12', 'warning'),
('timeline_realistic', 'timeline', '{"min_months": 3, "max_months": 36}', 'Preparation timeline should be between 3 months and 3 years', 'info'),
('document_size_limit', 'document', '{"max_size_mb": 10, "allowed_types": ["pdf", "jpg", "jpeg", "png"]}', 'Document must be under 10MB and in PDF or image format', 'error');

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_curriculum_nodes_updated_at
  BEFORE UPDATE ON public.curriculum_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_deletion_requests_updated_at
  BEFORE UPDATE ON public.data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardian_relationships_updated_at
  BEFORE UPDATE ON public.guardian_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validation_rules_updated_at
  BEFORE UPDATE ON public.validation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
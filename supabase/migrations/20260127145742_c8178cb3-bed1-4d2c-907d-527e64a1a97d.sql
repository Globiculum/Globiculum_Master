-- =============================================================================
-- DATA LAYER ENHANCEMENTS: Soft Deletes, Status Fields, Vector Embeddings
-- =============================================================================

-- 1. Add soft delete columns to key tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.saved_reports 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.gap_reports 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.learning_pathways 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Add status fields where missing
-- ---------------------------------------------------------------------------

ALTER TABLE public.saved_reports 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed' 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'archived'));

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed' 
CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'failed'));

-- 3. Create projects table (missing from schema)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Create feedback table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  report_id UUID,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('rating', 'comment', 'bug_report', 'feature_request', 'accuracy')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT feedback_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.saved_reports(id) ON DELETE SET NULL
);

-- Enable RLS on feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Feedback RLS policies
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback" ON public.feedback
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feedback" ON public.feedback
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- 5. Create embeddings table for vector search (using pgvector)
-- ---------------------------------------------------------------------------

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.curriculum_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimension
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-ada-002',
  content_hash TEXT, -- For cache invalidation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT curriculum_embeddings_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.curriculum_nodes(id) ON DELETE CASCADE,
  CONSTRAINT curriculum_embeddings_node_id_unique UNIQUE (node_id)
);

-- Enable RLS on embeddings
ALTER TABLE public.curriculum_embeddings ENABLE ROW LEVEL SECURITY;

-- Embeddings RLS policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view embeddings" ON public.curriculum_embeddings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage embeddings" ON public.curriculum_embeddings
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS curriculum_embeddings_embedding_idx 
  ON public.curriculum_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 6. Create semantic search function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_curriculum_semantic(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  node_id UUID,
  node_name TEXT,
  node_type TEXT,
  curriculum_system TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cn.id AS node_id,
    cn.name AS node_name,
    cn.node_type,
    cn.curriculum_system,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM curriculum_embeddings ce
  JOIN curriculum_nodes cn ON cn.id = ce.node_id
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Create storage bucket for artifacts
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artifacts',
  'artifacts',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/json', 'text/plain', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for artifacts bucket
CREATE POLICY "Users can view own artifacts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'artifacts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own artifacts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'artifacts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own artifacts" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'artifacts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own artifacts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'artifacts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 8. Create report_artifacts junction table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.report_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  user_id UUID NOT NULL,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('pdf', 'json', 'image', 'document')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  CONSTRAINT report_artifacts_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.saved_reports(id) ON DELETE CASCADE,
  CONSTRAINT report_artifacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.report_artifacts ENABLE ROW LEVEL SECURITY;

-- Report artifacts RLS policies
CREATE POLICY "Users can view own report artifacts" ON public.report_artifacts
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own report artifacts" ON public.report_artifacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own report artifacts" ON public.report_artifacts
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. Create updated_at trigger for new tables
-- ---------------------------------------------------------------------------

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curriculum_embeddings_updated_at
  BEFORE UPDATE ON public.curriculum_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Create soft delete helper function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.soft_delete(
  table_name TEXT,
  record_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
    table_name
  ) USING record_id;
  
  RETURN FOUND;
END;
$$;

-- 11. Create indexes for performance
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_student_profiles_deleted_at ON public.student_profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_reports_deleted_at ON public.saved_reports(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_reports_status ON public.saved_reports(status);
CREATE INDEX IF NOT EXISTS idx_assessments_deleted_at ON public.assessments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_feedback_report_id ON public.feedback(report_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_report_artifacts_report_id ON public.report_artifacts(report_id);
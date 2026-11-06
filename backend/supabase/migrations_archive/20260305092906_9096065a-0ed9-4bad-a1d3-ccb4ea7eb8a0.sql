
-- Create diagnostic_results table
CREATE TABLE public.diagnostic_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  overall_score INTEGER NOT NULL DEFAULT 0,
  subject_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  strength_areas TEXT[] DEFAULT '{}',
  gap_areas TEXT[] DEFAULT '{}',
  readiness_level TEXT NOT NULL DEFAULT 'needs-bridging',
  recommendations TEXT[] DEFAULT '{}',
  diagnostic_type TEXT NOT NULL DEFAULT 'full',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own diagnostic results"
  ON public.diagnostic_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic results"
  ON public.diagnostic_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnostic results"
  ON public.diagnostic_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diagnostic results"
  ON public.diagnostic_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add UPDATE policy for assessments table
CREATE POLICY "Users can update own assessments" 
ON public.assessments 
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Add UPDATE policy for gap_reports table
CREATE POLICY "Users can update own gap reports" 
ON public.gap_reports 
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
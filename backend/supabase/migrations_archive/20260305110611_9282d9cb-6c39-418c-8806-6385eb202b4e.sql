
-- Create shared_reports table for public shareable report links
CREATE TABLE public.shared_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.saved_reports(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own shared links
CREATE POLICY "Users can insert own shared reports"
  ON public.shared_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view own shared reports
CREATE POLICY "Users can view own shared reports"
  ON public.shared_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete own shared reports
CREATE POLICY "Users can delete own shared reports"
  ON public.shared_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous users can view shared reports by token (for public access)
CREATE POLICY "Anyone can view shared report by token"
  ON public.shared_reports FOR SELECT
  TO anon
  USING (true);

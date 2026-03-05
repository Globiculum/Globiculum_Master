
-- Create enums for tutor sessions
CREATE TYPE public.tutor_session_type AS ENUM ('diagnostic', 'tutoring', 'consultation');
CREATE TYPE public.tutor_session_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Create tutor_sessions table
CREATE TABLE public.tutor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  session_type tutor_session_type NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  notes text,
  status tutor_session_status NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert own tutor sessions"
  ON public.tutor_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tutor sessions"
  ON public.tutor_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tutor sessions"
  ON public.tutor_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tutor sessions"
  ON public.tutor_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_tutor_sessions_updated_at
  BEFORE UPDATE ON public.tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

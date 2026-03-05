
-- Guardian invitations: email-based invites before guardian signs up
CREATE TABLE public.guardian_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL,
  guardian_email text NOT NULL,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(guardian_email, student_profile_id)
);

ALTER TABLE public.guardian_invitations ENABLE ROW LEVEL SECURITY;

-- Parents can create invitations for their students
CREATE POLICY "Parents can insert own invitations"
  ON public.guardian_invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_user_id);

-- Parents can view their sent invitations
CREATE POLICY "Parents can view own invitations"
  ON public.guardian_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_user_id);

-- Parents can cancel their invitations
CREATE POLICY "Parents can update own invitations"
  ON public.guardian_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_user_id);

-- Parents can delete their invitations
CREATE POLICY "Parents can delete own invitations"
  ON public.guardian_invitations FOR DELETE
  TO authenticated
  USING (auth.uid() = parent_user_id);

-- Anyone authenticated can view invitations for their email (for auto-accept)
CREATE POLICY "Guardians can view invitations for their email"
  ON public.guardian_invitations FOR SELECT
  TO authenticated
  USING (
    guardian_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Guardians can accept invitations addressed to them
CREATE POLICY "Guardians can accept their invitations"
  ON public.guardian_invitations FOR UPDATE
  TO authenticated
  USING (
    guardian_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Trigger to update updated_at
CREATE TRIGGER update_guardian_invitations_updated_at
  BEFORE UPDATE ON public.guardian_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

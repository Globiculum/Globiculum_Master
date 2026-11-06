-- Language starter resources (Hindi, Sanskrit) are pitched at a learner's
-- level, not a class: a Class 8 student new to Hindi needs a script primer, not
-- the Class 8 textbook. NULL = material for the class itself (every existing row).
ALTER TABLE public.learning_resources
  ADD COLUMN IF NOT EXISTS level TEXT
  CHECK (level IS NULL OR level IN ('beginner', 'intermediate'));

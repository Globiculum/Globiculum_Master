-- ICSE Classes IX-X have their own syllabus in the curriculum data (icse-cisce),
-- so their study material is catalogued under its own board. Widens the check;
-- every existing row ('cbse', 'isc', 'any') stays valid.
ALTER TABLE public.learning_resources DROP CONSTRAINT IF EXISTS learning_resources_board_check;
ALTER TABLE public.learning_resources
  ADD CONSTRAINT learning_resources_board_check CHECK (board IN ('cbse', 'isc', 'icse', 'any'));

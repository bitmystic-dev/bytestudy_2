
-- 1. Tests table
CREATE TABLE public.tests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  test_date timestamptz NOT NULL,
  subjects text[] NOT NULL DEFAULT '{}',
  syllabus text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'upcoming',
  score numeric,
  max_score numeric,
  notes text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tests" ON public.tests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tests_user_date ON public.tests(user_id, test_date);

CREATE TRIGGER tests_set_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. Institute test pattern on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS institute_tests_pattern text NOT NULL DEFAULT '';

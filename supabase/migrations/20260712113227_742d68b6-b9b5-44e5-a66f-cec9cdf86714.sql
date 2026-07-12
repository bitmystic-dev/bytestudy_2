-- ============ PROFILES ============
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  exam text NOT NULL DEFAULT 'JEE',
  class_level text CHECK (class_level IN ('11','12','dropper')),
  target_year integer,
  coaching text NOT NULL DEFAULT '',
  daily_goal_minutes integer NOT NULL DEFAULT 240,
  wake_time text NOT NULL DEFAULT '06:30',
  sleep_time text NOT NULL DEFAULT '23:00',
  weekly_off_day integer NOT NULL DEFAULT 0,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ MISSIONS ============
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL CHECK (subject IN ('physics','chemistry','mathematics')),
  chapter_key text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date date,
  notes text,
  pinned boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX missions_user_idx ON public.missions(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own missions all" ON public.missions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ FOCUS SESSIONS ============
CREATE TABLE public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text CHECK (subject IN ('physics','chemistry','mathematics')),
  chapter_key text,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_sec integer NOT NULL,
  mode text NOT NULL DEFAULT 'pomodoro' CHECK (mode IN ('pomodoro','custom')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX focus_sessions_user_idx ON public.focus_sessions(user_id, ended_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_sessions TO authenticated;
GRANT ALL ON public.focus_sessions TO service_role;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions all" ON public.focus_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CHAPTER META ============
CREATE TABLE public.chapter_meta (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_key text NOT NULL,
  override_name text,
  completion numeric NOT NULL DEFAULT 0,
  revision_count integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  confidence integer NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 5),
  module_progress numeric NOT NULL DEFAULT 0,
  dpp_progress numeric NOT NULL DEFAULT 0,
  pyq_progress numeric NOT NULL DEFAULT 0,
  estimated_hours numeric NOT NULL DEFAULT 0,
  actual_hours numeric NOT NULL DEFAULT 0,
  last_studied timestamptz,
  next_revision timestamptz,
  bookmarked boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_meta TO authenticated;
GRANT ALL ON public.chapter_meta TO service_role;
ALTER TABLE public.chapter_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chapter_meta all" ON public.chapter_meta FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER missions_updated BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER chapter_meta_updated BEFORE UPDATE ON public.chapter_meta FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Auto-create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

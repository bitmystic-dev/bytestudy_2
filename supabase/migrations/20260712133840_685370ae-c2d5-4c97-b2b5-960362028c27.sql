
CREATE TABLE public.chapter_customizations (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_level INTEGER NOT NULL CHECK (class_level IN (11, 12)),
  subject TEXT NOT NULL CHECK (subject IN ('physics','chemistry','mathematics')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, class_level, subject)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_customizations TO authenticated;
GRANT ALL ON public.chapter_customizations TO service_role;

ALTER TABLE public.chapter_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own chapter_customizations all"
  ON public.chapter_customizations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tg_chapter_customizations_updated_at
  BEFORE UPDATE ON public.chapter_customizations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

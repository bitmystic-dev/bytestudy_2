
-- 1) admin_rights on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_rights BOOLEAN NOT NULL DEFAULT false;

-- Seed: any current user with the designated admin email
UPDATE public.profiles p
SET admin_rights = true
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = 'saipranav033@gmail.com';

-- Ensure future signups with that email also get admin
CREATE OR REPLACE FUNCTION public.tg_grant_admin_by_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eml TEXT;
BEGIN
  SELECT lower(email) INTO eml FROM auth.users WHERE id = NEW.user_id;
  IF eml = 'saipranav033@gmail.com' THEN
    NEW.admin_rights := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_grant_admin ON public.profiles;
CREATE TRIGGER profiles_grant_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_grant_admin_by_email();

-- Helper: is caller admin?
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT admin_rights FROM public.profiles WHERE user_id = _user_id), false);
$$;

-- 2) ai_personalization
CREATE TABLE IF NOT EXISTS public.ai_personalization (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_personalization TO authenticated;
GRANT ALL ON public.ai_personalization TO service_role;
ALTER TABLE public.ai_personalization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own personalization" ON public.ai_personalization
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS ai_personalization_updated ON public.ai_personalization;
CREATE TRIGGER ai_personalization_updated
  BEFORE UPDATE ON public.ai_personalization
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3) allen_credentials (admin only)
CREATE TABLE IF NOT EXISTS public.allen_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id TEXT NOT NULL,
  password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allen_credentials TO authenticated;
GRANT ALL ON public.allen_credentials TO service_role;
ALTER TABLE public.allen_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin own allen creds" ON public.allen_credentials
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS allen_credentials_updated ON public.allen_credentials;
CREATE TRIGGER allen_credentials_updated
  BEFORE UPDATE ON public.allen_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4) allen_sync_state
CREATE TABLE IF NOT EXISTS public.allen_sync_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  homework_cursor JSONB NOT NULL DEFAULT '{}'::jsonb,
  tests_cursor JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allen_sync_state TO authenticated;
GRANT ALL ON public.allen_sync_state TO service_role;
ALTER TABLE public.allen_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin own allen sync" ON public.allen_sync_state
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS allen_sync_state_updated ON public.allen_sync_state;
CREATE TRIGGER allen_sync_state_updated
  BEFORE UPDATE ON public.allen_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5) Extend missions & tests with an external source id so ALLEN sync can dedupe
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS missions_user_source_external_uidx
  ON public.missions(user_id, source, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS tests_user_source_external_uidx
  ON public.tests(user_id, source, external_id)
  WHERE external_id IS NOT NULL;

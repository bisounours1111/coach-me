-- Migration: Refactor profiles and introduce coaches table
-- Description: Refactoring du schéma de données pour séparer les coachs de profiles et corriger le champ role
-- Issue: #30 - 2.4 Refactoring du schéma de données Supabase - Table profiles et gestion des coachs

-- 1) Création de la table coaches
CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  hourly_rate NUMERIC(10, 2),
  specializations TEXT[],
  coaching_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_profile_id ON public.coaches(profile_id);

-- Trigger pour updated_at sur coaches en réutilisant public.handle_updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_updated_at_coaches'
  ) THEN
    CREATE TRIGGER set_updated_at_coaches
      BEFORE UPDATE ON public.coaches
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;


-- 2) Migration des données existantes vers coaches
-- Crée une entrée de coach pour tous les profils existants avec is_coach = TRUE
INSERT INTO public.coaches (id, profile_id, is_active, coaching_since, created_at, updated_at)
SELECT
  p.id,
  p.id,
  TRUE,
  NOW(),
  NOW(),
  NOW()
FROM public.profiles p
LEFT JOIN public.coaches c ON c.id = p.id
WHERE p.is_coach = TRUE
  AND c.id IS NULL;


-- 3) Renommage des champs généraux dans profiles (coach_* -> génériques)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'coach_bio'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN coach_bio TO bio;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'coach_games'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN coach_games TO games;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'coach_ranks'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN coach_ranks TO ranks;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'coach_achievements'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN coach_achievements TO achievements;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'coach_social_links'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN coach_social_links TO social_links;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'coach_video_urls'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN coach_video_urls TO video_urls;
  END IF;
END $$;


-- 4) Mise à jour du champ role dans profiles
--    On remplace la contrainte existante (student/coach/both) par user/maintainer
--    IMPORTANT: on supprime d'abord l'ancienne contrainte, puis on met à jour les données
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL
   OR role IN ('student', 'coach', 'both');

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'maintainer'));


-- 5) Mise à jour des clés étrangères vers la nouvelle table coaches
-- D'abord, on enlève les contraintes existantes pointant vers public.profiles
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_coach_id_fkey;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_coach_id_fkey;

-- Puis on recrée les contraintes en pointant vers public.coaches(id)
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE;


-- 6) Suppression de la logique basée sur profiles.is_coach pour les sessions
--    (fonction + trigger check_coach_is_coach) et remplacement par une vérification sur coaches
DROP TRIGGER IF EXISTS check_coach_is_coach_trigger ON public.sessions;
DROP FUNCTION IF EXISTS public.check_coach_is_coach();

CREATE OR REPLACE FUNCTION public.check_session_coach_is_valid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.coaches c
    WHERE c.id = NEW.coach_id
      AND c.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Le coach doit exister dans public.coaches et être actif';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_session_coach_is_valid_trigger
  BEFORE INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_session_coach_is_valid();


-- 7) Suppression du champ is_coach dans profiles (devenu redondant)
--    On commence par mettre à jour les politiques RLS du bucket storage \"coach-videos\"
--    pour ne plus dépendre de profiles.is_coach, mais de la table coaches.
DROP POLICY IF EXISTS \"Coaches can delete own videos\" ON storage.objects;
DROP POLICY IF EXISTS \"Coaches can update own videos\" ON storage.objects;
DROP POLICY IF EXISTS \"Coaches can upload own videos\" ON storage.objects;

-- Les vidéos de coach restent visibles par tout le monde (politique déjà existante, on la laisse inchangée)
-- On recrée les politiques basées sur l'existence d'une entrée active dans public.coaches
CREATE POLICY \"Coaches can delete own videos\"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'coach-videos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = auth.uid()
        AND c.is_active = TRUE
    )
  );

CREATE POLICY \"Coaches can update own videos\"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'coach-videos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = auth.uid()
        AND c.is_active = TRUE
    )
  );

CREATE POLICY \"Coaches can upload own videos\"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'coach-videos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = auth.uid()
        AND c.is_active = TRUE
    )
  );

DROP INDEX IF EXISTS idx_profiles_is_coach;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS is_coach;


-- 8) Politiques RLS pour la table coaches
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les coachs (utile pour la découverte)
CREATE POLICY "Coaches are viewable by everyone"
  ON public.coaches
  FOR SELECT
  USING (true);

-- Un utilisateur peut gérer (INSERT/UPDATE/DELETE) son propre profil coach
CREATE POLICY "Users can manage own coach profile"
  ON public.coaches
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Les maintainers peuvent gérer tous les coachs
CREATE POLICY "Maintainers can manage all coaches"
  ON public.coaches
  FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'maintainer'
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'maintainer'
  ));


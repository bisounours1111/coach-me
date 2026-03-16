-- Migration: Multi-games coaching model (live schema)
-- Description: Ajoute games, profile_game_roles, coachings et migre les FKs
--              depuis public.coaches vers le nouveau modèle, en partant du
--              schéma actuel déjà refactoré (profiles + coaches).
-- Issue: #30 - 2.4 Refactoring du schéma de données Supabase - Gestion multi-jeux et coaching par jeu


-- 1) Table games
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 2) Table de liaison profile_game_roles
CREATE TABLE IF NOT EXISTS public.profile_game_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  is_coach BOOLEAN NOT NULL DEFAULT FALSE,
  player_rank TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_game_roles_unique
  ON public.profile_game_roles(profile_id, game_id);

CREATE INDEX IF NOT EXISTS idx_profile_game_roles_profile_id
  ON public.profile_game_roles(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_game_roles_game_id
  ON public.profile_game_roles(game_id);


-- 3) Table coachings
CREATE TABLE IF NOT EXISTS public.coachings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_game_role_id UUID NOT NULL REFERENCES public.profile_game_roles(id) ON DELETE CASCADE,
  description TEXT,
  video_urls TEXT[],
  hourly_rate NUMERIC(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coachings_profile_game_role_id
  ON public.coachings(profile_game_role_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_coachings'
  ) THEN
    CREATE TRIGGER set_updated_at_coachings
      BEFORE UPDATE ON public.coachings
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;


-- 4) Migration des données depuis public.coaches
DO $$
DECLARE
  generic_game_id UUID;
BEGIN
  -- Créer (ou récupérer) un jeu générique pour les coachs existants
  INSERT INTO public.games (slug, name)
  VALUES ('generic', 'Generic game')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO generic_game_id;

  -- Créer les lignes profile_game_roles pour chaque coach existant
  INSERT INTO public.profile_game_roles (profile_id, game_id, is_coach, player_rank)
  SELECT
    c.profile_id,
    generic_game_id,
    TRUE,
    NULL
  FROM public.coaches c
  LEFT JOIN public.profile_game_roles pgr
    ON pgr.profile_id = c.profile_id
   AND pgr.game_id = generic_game_id
  WHERE pgr.id IS NULL;

  -- Créer les offres de coaching de base à partir de public.coaches + profiles
  INSERT INTO public.coachings (profile_game_role_id, description, video_urls, hourly_rate, is_active)
  SELECT
    pgr.id,
    p.bio,
    p.video_urls,
    c.hourly_rate,
    c.is_active
  FROM public.coaches c
  JOIN public.profiles p ON p.id = c.profile_id
  JOIN public.profile_game_roles pgr
    ON pgr.profile_id = c.profile_id
   AND pgr.game_id = generic_game_id;
END $$;


-- 5) Mise à jour des FKs sessions / reviews pour pointer vers coachings.id
-- Mettre à jour les coach_id existants en se basant sur la relation profil -> coach -> coaching

DO $$
BEGIN
  UPDATE public.sessions s
  SET coach_id = cg.id
  FROM public.coaches c
  JOIN public.profile_game_roles pgr
    ON pgr.profile_id = c.profile_id
  JOIN public.coachings cg
    ON cg.profile_game_role_id = pgr.id
  WHERE s.coach_id = c.id;
END $$;

DO $$
BEGIN
  UPDATE public.reviews r
  SET coach_id = cg.id
  FROM public.coaches c
  JOIN public.profile_game_roles pgr
    ON pgr.profile_id = c.profile_id
  JOIN public.coachings cg
    ON cg.profile_game_role_id = pgr.id
  WHERE r.coach_id = c.id;
END $$;

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_coach_id_fkey;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_coach_id_fkey;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.coachings(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.coachings(id) ON DELETE CASCADE;


-- 6) Mise à jour des politiques RLS du bucket coach-videos pour utiliser coachings/profile_game_roles
DROP POLICY IF EXISTS "Coaches can delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update own videos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can upload own videos" ON storage.objects;

CREATE POLICY "Coaches can delete own videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'coach-videos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.coachings cg
      JOIN public.profile_game_roles pgr
        ON pgr.id = cg.profile_game_role_id
      WHERE pgr.profile_id = auth.uid()
        AND cg.is_active = TRUE
    )
  );

CREATE POLICY "Coaches can update own videos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'coach-videos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.coachings cg
      JOIN public.profile_game_roles pgr
        ON pgr.id = cg.profile_game_role_id
      WHERE pgr.profile_id = auth.uid()
        AND cg.is_active = TRUE
    )
  );

CREATE POLICY "Coaches can upload own videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'coach-videos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.coachings cg
      JOIN public.profile_game_roles pgr
        ON pgr.id = cg.profile_game_role_id
      WHERE pgr.profile_id = auth.uid()
        AND cg.is_active = TRUE
    )
  );


-- 7) RLS pour games, profile_game_roles, coachings (lecture globale + gestion par l'utilisateur)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_game_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coachings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are viewable by everyone"
  ON public.games
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own profile_game_roles"
  ON public.profile_game_roles
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Coachings are viewable by everyone"
  ON public.coachings
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own coachings"
  ON public.coachings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profile_game_roles pgr
      WHERE pgr.id = profile_game_role_id
        AND pgr.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profile_game_roles pgr
      WHERE pgr.id = profile_game_role_id
        AND pgr.profile_id = auth.uid()
    )
  );


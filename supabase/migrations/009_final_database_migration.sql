-- Migration: Final database migration - full schema with multi-games coaching model
-- Description: Crée l'ensemble du schéma fonctionnel (profiles, sessions, reviews,
--              storage/RLS, modèle multi-jeux) à partir d'une base vierge.
--              À utiliser comme migration de référence complète.
-- Issue principal: #30 - 2.4 Refactoring du schéma de données Supabase - Gestion multi-jeux et coaching par jeu


-- 0) Table profiles (version finale)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'maintainer')),

  -- Champs généraux (anciennement coach_*)
  bio TEXT,
  games TEXT[],
  ranks JSONB,
  achievements TEXT[],
  social_links JSONB,
  video_urls TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Fonction updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger updated_at sur profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_profiles'
  ) THEN
    CREATE TRIGGER set_updated_at_profiles
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger sur auth.users pour créer le profil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);


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
  player_rank TEXT, -- rang libre saisi par le joueur
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_game_roles_unique
  ON public.profile_game_roles(profile_id, game_id);

CREATE INDEX IF NOT EXISTS idx_profile_game_roles_profile_id
  ON public.profile_game_roles(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_game_roles_game_id
  ON public.profile_game_roles(game_id);


-- 3) Table coachings (offres de coaching par (profil, jeu))
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

-- Trigger updated_at pour coachings
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


-- 4) Table sessions (version finale, coach_id vers coachings)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Informations de la session
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'upcoming', 'done', 'canceled')),

  -- Paiement
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  currency TEXT DEFAULT 'EUR',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,

  -- Notes et détails
  student_notes TEXT,
  coach_notes TEXT,
  game TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT check_coach_student_different CHECK (coach_id != student_id)
);

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.coachings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON public.sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON public.sessions(start_at);
CREATE INDEX IF NOT EXISTS idx_sessions_stripe_payment_intent_id ON public.sessions(stripe_payment_intent_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_sessions'
  ) THEN
    CREATE TRIGGER set_updated_at_sessions
      BEFORE UPDATE ON public.sessions
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Students can view own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create sessions"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Coaches can update own sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Students can update own sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = student_id);


-- 5) Table reviews (version finale, coach_id vers coachings)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coachings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_coach_id ON public.reviews(coach_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON public.reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON public.reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_reviews'
  ) THEN
    CREATE TRIGGER set_updated_at_reviews
      BEFORE UPDATE ON public.reviews
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Students can create reviews for own sessions"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE id = session_id
        AND student_id = auth.uid()
        AND status = 'done'
    )
  );

CREATE POLICY "Students can update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Students can delete own reviews"
  ON public.reviews
  FOR DELETE
  USING (auth.uid() = student_id);

CREATE OR REPLACE FUNCTION public.check_session_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = NEW.session_id
      AND status = 'done'
  ) THEN
    RAISE EXCEPTION 'Un avis ne peut être créé que pour une session terminée (status = done)';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'check_session_completed_trigger'
  ) THEN
    CREATE TRIGGER check_session_completed_trigger
      BEFORE INSERT ON public.reviews
      FOR EACH ROW
      EXECUTE FUNCTION public.check_session_completed();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_student_coach_different'
      AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT check_student_coach_different
      CHECK (student_id != coach_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_coach_average_rating(coach_uuid UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(AVG(rating), 0)
  FROM public.reviews
  WHERE coach_id = coach_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_coach_review_count(coach_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.reviews
  WHERE coach_id = coach_uuid;
$$;


-- 6) Bucket storage coach-videos + RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-videos',
  'coach-videos',
  true,
  104857600,
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Politique: vidéos visibles par tout le monde
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Coach videos are viewable by everyone'
  ) THEN
    CREATE POLICY "Coach videos are viewable by everyone"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'coach-videos');
  END IF;
END $$;

-- Mise à jour des politiques RLS pour storage.objects (bucket coach-videos)
-- pour utiliser le modèle coachings/profile_game_roles
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


-- 7) RLS pour games, profile_game_roles, coachings
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_game_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coachings ENABLE ROW LEVEL SECURITY;

-- Games : lisibles par tout le monde
CREATE POLICY "Games are viewable by everyone"
  ON public.games
  FOR SELECT
  USING (true);

-- profile_game_roles : un utilisateur gère ses propres entrées
CREATE POLICY "Users can manage own profile_game_roles"
  ON public.profile_game_roles
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- coachings : un utilisateur gère ses propres offres, les autres peuvent les lire
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


-- 8) Note: le modèle historique public.coaches n'est plus nécessaire
--    et n'est pas recréé dans cette migration finale.



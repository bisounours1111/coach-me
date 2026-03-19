-- Consolidated migration for CoachMe
-- Generated from existing migrations


-- ============================================================================
-- SOURCE: 009_final_database_migration.sql
-- ============================================================================

-- Migration: Final database migration - full schema with multi-games coaching model
-- Description: CrÃ©e l'ensemble du schÃ©ma fonctionnel (profiles, sessions, reviews,
--              storage/RLS, modÃ¨le multi-jeux) Ã  partir d'une base vierge.
--              Ã€ utiliser comme migration de rÃ©fÃ©rence complÃ¨te.
-- Issue principal: #30 - 2.4 Refactoring du schÃ©ma de donnÃ©es Supabase - Gestion multi-jeux et coaching par jeu


-- 0) Table profiles (version finale)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'maintainer')),

  -- Champs gÃ©nÃ©raux (anciennement coach_*)
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

-- Fonction pour crÃ©er automatiquement un profil lors de l'inscription
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

-- Trigger sur auth.users pour crÃ©er le profil
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

  -- Notes et dÃ©tails
  student_notes TEXT,
  coach_notes TEXT,
  game TEXT,

  -- MÃ©tadonnÃ©es
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
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_stripe_payment_intent_id_key'
      AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);
  END IF;
END $$;

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
    RAISE EXCEPTION 'Un avis ne peut Ãªtre crÃ©Ã© que pour une session terminÃ©e (status = done)';
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

-- Politique: vidÃ©os visibles par tout le monde
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

-- Mise Ã  jour des politiques RLS pour storage.objects (bucket coach-videos)
-- pour utiliser le modÃ¨le coachings/profile_game_roles
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

-- profile_game_roles : un utilisateur gÃ¨re ses propres entrÃ©es
CREATE POLICY "Users can manage own profile_game_roles"
  ON public.profile_game_roles
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- coachings : un utilisateur gÃ¨re ses propres offres, les autres peuvent les lire
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


-- 8) Note: le modÃ¨le historique public.coaches n'est plus nÃ©cessaire
--    et n'est pas recrÃ©Ã© dans cette migration finale.



-- ============================================================================
-- SOURCE: 012_create_game_ranks_table.sql
-- ============================================================================

-- Migration: Create game_ranks table
-- Description: Rangs configurables par jeu pour onboarding/admin

CREATE TABLE IF NOT EXISTS public.game_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT game_ranks_unique_game_label UNIQUE (game_id, label)
);

CREATE INDEX IF NOT EXISTS idx_game_ranks_game_id ON public.game_ranks(game_id);
CREATE INDEX IF NOT EXISTS idx_game_ranks_sort_order ON public.game_ranks(sort_order);

CREATE TRIGGER set_updated_at_game_ranks
  BEFORE UPDATE ON public.game_ranks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.game_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game ranks are viewable by everyone"
  ON public.game_ranks
  FOR SELECT
  USING (true);

CREATE POLICY "Maintainers can manage game ranks"
  ON public.game_ranks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'maintainer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'maintainer'
    )
  );

-- ============================================================================
-- SOURCE: 013_link_profile_game_roles_to_game_ranks.sql
-- ============================================================================

-- Migration: Link profile_game_roles to game_ranks
-- Description: Remplace le rank texte libre par une relation vers game_ranks

ALTER TABLE public.profile_game_roles
ADD COLUMN IF NOT EXISTS player_rank_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_ranks_id_game_id_unique'
      AND conrelid = 'public.game_ranks'::regclass
  ) THEN
    ALTER TABLE public.game_ranks
    ADD CONSTRAINT game_ranks_id_game_id_unique UNIQUE (id, game_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profile_game_roles_player_rank_game_fkey'
      AND conrelid = 'public.profile_game_roles'::regclass
  ) THEN
    ALTER TABLE public.profile_game_roles
    ADD CONSTRAINT profile_game_roles_player_rank_game_fkey
    FOREIGN KEY (player_rank_id, game_id)
    REFERENCES public.game_ranks (id, game_id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profile_game_roles_player_rank_id
ON public.profile_game_roles (player_rank_id);

-- Backfill best-effort depuis l'ancien champ texte player_rank
UPDATE public.profile_game_roles AS pgr
SET player_rank_id = gr.id
FROM public.game_ranks AS gr
WHERE pgr.player_rank_id IS NULL
  AND pgr.player_rank IS NOT NULL
  AND pgr.game_id = gr.game_id
  AND lower(trim(pgr.player_rank)) = lower(trim(gr.label));

ALTER TABLE public.profile_game_roles
DROP COLUMN IF EXISTS player_rank;


-- Migration: Allow maintainers to manage games
-- Description: Ajoute la policy RLS manquante pour INSERT/UPDATE/DELETE sur public.games

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Maintainers can manage games'
  ) THEN
    CREATE POLICY "Maintainers can manage games"
      ON public.games
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'maintainer'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'maintainer'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- SOURCE: 014_allow_maintainers_manage_games.sql
-- ============================================================================

-- Migration: Allow maintainers to manage games
-- Description: Ajoute la policy RLS manquante pour INSERT/UPDATE/DELETE sur public.games

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Maintainers can manage games'
  ) THEN
    CREATE POLICY "Maintainers can manage games"
      ON public.games
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'maintainer'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'maintainer'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- SOURCE: 015_add_rank_icons_storage.sql
-- ============================================================================

-- Migration: Add rank icons support
-- Description: Ajoute icon_url sur game_ranks + bucket/public policies pour stocker les icones de rang

ALTER TABLE public.game_ranks
ADD COLUMN IF NOT EXISTS icon_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rank',
  'rank',
  true,
  5242880,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Rank icons are viewable by everyone'
  ) THEN
    CREATE POLICY "Rank icons are viewable by everyone"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'rank');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Maintainers can manage rank icons'
  ) THEN
    CREATE POLICY "Maintainers can manage rank icons"
      ON storage.objects
      FOR ALL
      USING (
        bucket_id = 'rank'
        AND EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'maintainer'
        )
      )
      WITH CHECK (
        bucket_id = 'rank'
        AND EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'maintainer'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- SOURCE: 016_create_avatars_bucket.sql
-- ============================================================================

-- 1. CrÃ©ation du bucket 'avatars' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Suppression des anciennes politiques pour repartir sur une base propre
DROP POLICY IF EXISTS "Avatars sont publics" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent uploader leur propre avatar" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre avatar" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leur propre avatar" ON storage.objects;

-- 3. Politique : Lecture publique
CREATE POLICY "Avatars sont publics"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Politique : Insertion (Upload)
-- Simplification maximale pour Ã©viter les erreurs de parsing du chemin
CREATE POLICY "Les utilisateurs peuvent uploader leur propre avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  (name LIKE 'pp/' || auth.uid()::text || '%')
);

-- 5. Politique : Mise Ã  jour (Update)
CREATE POLICY "Les utilisateurs peuvent modifier leur propre avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  (name LIKE 'pp/' || auth.uid()::text || '%')
);

-- 6. Politique : Suppression (Delete)
CREATE POLICY "Les utilisateurs peuvent supprimer leur propre avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  (name LIKE 'pp/' || auth.uid()::text || '%')
);

-- ============================================================================
-- SOURCE: 017_create_coach_availabilities.sql
-- ============================================================================

-- Migration: Create coach_availabilities table
-- Description: Table pour gÃ©rer les crÃ©neaux de disponibilitÃ© des coachs
-- Issue: #19 - 5.2 SystÃ¨me de rÃ©servations

-- CrÃ©er la table coach_availabilities
CREATE TABLE IF NOT EXISTS public.coach_availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Informations du crÃ©neau
  start_time TIME NOT NULL, -- Heure de dÃ©but (ex: '09:00:00')
  end_time TIME NOT NULL, -- Heure de fin (ex: '12:00:00')
  
  -- Alternative: CrÃ©neau spÃ©cifique (date prÃ©cise)
  specific_date DATE, -- Si NULL, c'est un crÃ©neau rÃ©current hebdomadaire
  
  -- MÃ©tadonnÃ©es
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte: start_time < end_time
  CONSTRAINT check_time_range CHECK (start_time < end_time)
);

-- Index pour amÃ©liorer les performances
CREATE INDEX IF NOT EXISTS idx_availabilities_coach_id ON public.coach_availabilities(coach_id);
CREATE INDEX IF NOT EXISTS idx_availabilities_specific_date ON public.coach_availabilities(specific_date);

-- Trigger pour updated_at
CREATE TRIGGER set_updated_at_availabilities
  BEFORE UPDATE ON public.coach_availabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.coach_availabilities ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut voir les disponibilitÃ©s des coachs
CREATE POLICY "Availabilities are viewable by everyone"
  ON public.coach_availabilities
  FOR SELECT
  USING (true);

-- Politique: Les coachs peuvent gÃ©rer leurs propres disponibilitÃ©s
CREATE POLICY "Coaches can manage own availabilities"
  ON public.coach_availabilities
  FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Ajouter une colonne 'negotiated_price' Ã  la table sessions pour la nÃ©gociation
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS negotiated_price NUMERIC(10, 2);

-- Mettre Ã  jour les statuts de sessions pour inclure 'negotiating' et 'rejected'
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions 
  ADD CONSTRAINT sessions_status_check 
  CHECK (status IN ('pending', 'negotiating', 'accepted', 'rejected', 'paid', 'upcoming', 'done', 'canceled'));

-- ============================================================================
-- SOURCE: 017_profile_game_roles_public_read.sql
-- ============================================================================

-- Allow everyone to read profile_game_roles (needed to list coaches by game)
-- Sans cette policy, les users ne voient que leurs propres lignes via "Users can manage own profile_game_roles"
CREATE POLICY "Profile game roles are viewable by everyone"
  ON public.profile_game_roles
  FOR SELECT
  USING (true);

-- ============================================================================
-- SOURCE: 018_add_icon_to_games.sql
-- ============================================================================

-- Migration: Add icon column to games table
-- Description: Ajoute une colonne icon_url Ã  la table games pour permettre l'affichage d'icÃ´nes personnalisÃ©es.

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Mise Ã  jour des politiques de stockage pour permettre aux maintainers de gÃ©rer les icÃ´nes de jeux
-- On suppose l'existence d'un bucket 'game-icons' ou on utilise un bucket existant.
-- Pour cet exercice, nous allons crÃ©er les politiques pour un bucket 'game-icons'.

INSERT INTO storage.buckets (id, name, public)
VALUES ('game-icons', 'game-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques pour le bucket game-icons
DROP POLICY IF EXISTS "Game icons are viewable by everyone" ON storage.objects;
CREATE POLICY "Game icons are viewable by everyone"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'game-icons');

DROP POLICY IF EXISTS "Maintainers can manage game icons" ON storage.objects;
CREATE POLICY "Maintainers can manage game icons"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'game-icons'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'maintainer'
    )
  )
  WITH CHECK (
    bucket_id = 'game-icons'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'maintainer'
    )
  );

-- ============================================================================
-- SOURCE: 018_upgrade_coach_availabilities_to_iso_slots.sql
-- ============================================================================

ALTER TABLE public.coach_availabilities
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;

ALTER TABLE public.coach_availabilities
ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

ALTER TABLE public.coach_availabilities
ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.coach_availabilities
SET status = 'available'
WHERE status IS NULL;

ALTER TABLE public.coach_availabilities
ALTER COLUMN status SET DEFAULT 'available';

ALTER TABLE public.coach_availabilities
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.coach_availabilities
DROP CONSTRAINT IF EXISTS coach_availabilities_status_check;

ALTER TABLE public.coach_availabilities
ADD CONSTRAINT coach_availabilities_status_check
CHECK (status IN ('available', 'booked'));

ALTER TABLE public.coach_availabilities
DROP CONSTRAINT IF EXISTS coach_availabilities_datetime_range_check;

ALTER TABLE public.coach_availabilities
ADD CONSTRAINT coach_availabilities_datetime_range_check
CHECK (
  start_at IS NULL
  OR end_at IS NULL
  OR start_at < end_at
);

CREATE INDEX IF NOT EXISTS idx_availabilities_coach_start_at
ON public.coach_availabilities (coach_id, start_at);

-- ============================================================================
-- SOURCE: 019_fix_coach_availabilities_rls.sql
-- ============================================================================

DROP POLICY IF EXISTS "Coaches can manage own availabilities"
ON public.coach_availabilities;

CREATE POLICY "Coaches can insert own availabilities"
  ON public.coach_availabilities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update own availabilities"
  ON public.coach_availabilities
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND coach_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND coach_id = auth.uid()
  );

CREATE POLICY "Coaches can delete own availabilities"
  ON public.coach_availabilities
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND coach_id = auth.uid()
  );

-- ============================================================================
-- SOURCE: 020_drop_legacy_availability_columns.sql
-- ============================================================================

ALTER TABLE public.coach_availabilities
DROP CONSTRAINT IF EXISTS check_time_range;

DROP INDEX IF EXISTS idx_availabilities_day_of_week;
DROP INDEX IF EXISTS idx_availabilities_specific_date;

ALTER TABLE public.coach_availabilities
DROP COLUMN IF EXISTS day_of_week,
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS specific_date;

-- ============================================================================
-- SOURCE: 021_create_conversations_and_messages.sql
-- ============================================================================

-- Migration: Create conversations and messages tables (messagerie coach)
-- Description: Tables pour la messagerie Ã©lÃ¨veâ€“coach avec historisation et RLS.
-- Issue: #51 - 2. Messagerie avec le coach - pop-up, historisation, bouton fixe

-- Table conversations : une conversation par paire (Ã©lÃ¨ve, coach)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_conversation_student_coach UNIQUE (student_id, coach_id),
  CONSTRAINT check_conversation_different CHECK (student_id != coach_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON public.conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Table messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(conversation_id, created_at ASC);

-- Trigger: mettre Ã  jour conversations.updated_at Ã  chaque nouveau message
CREATE OR REPLACE FUNCTION public.set_conversation_updated_at_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_created_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_conversation_updated_at_on_message();

-- RLS conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations as student or coach"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = student_id OR auth.uid() = coach_id
  );

CREATE POLICY "Students can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = student_id AND auth.uid() != coach_id);

-- RLS messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages of their conversation"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.student_id = auth.uid() OR c.coach_id = auth.uid())
    )
  );

CREATE POLICY "Participants can insert messages in their conversation"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.student_id = auth.uid() OR c.coach_id = auth.uid())
    )
  );

-- Realtime: permettre l'Ã©coute des nouveaux messages (optionnel, activÃ© cÃ´tÃ© dashboard Supabase si besoin)
-- Les politiques RLS ci-dessus s'appliquent aussi au Realtime.

-- ============================================================================
-- SOURCE: 021_stripe_connect_wallets_transactions.sql
-- ============================================================================

-- Migration: Stripe Connect + Wallets/Transactions
-- Description: Ajoute stripe_connect_id aux profils et crÃ©e un suivi interne via wallets/transactions.

-- 1) Ajout du stripe_connect_id sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;

-- Optionnel mais utile : Ã©viter 2 profils -> mÃªme compte Connect
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_connect_id_unique
  ON public.profiles(stripe_connect_id)
  WHERE stripe_connect_id IS NOT NULL;


-- 2) Table wallets (1 wallet par profil)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON public.wallets(profile_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_wallets'
  ) THEN
    CREATE TRIGGER set_updated_at_wallets
      BEFORE UPDATE ON public.wallets
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.wallets
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own wallet"
  ON public.wallets
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own wallet"
  ON public.wallets
  FOR UPDATE
  USING (auth.uid() = profile_id);


-- 3) Table transactions (ledger interne)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('credit', 'payout')),
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('pending', 'succeeded', 'failed')),

  -- Montants en devise majeure (EUR) pour cohÃ©rence avec sessions.price (NUMERIC)
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- IDs Stripe: payment_intent, transfer, payout, etc.
  stripe_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_id ON public.transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON public.transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Pas d'INSERT/UPDATE/DELETE cÃ´tÃ© client : uniquement via service role (Edge Functions)


-- ============================================================================
-- SOURCE: 022_enable_realtime_messages.sql
-- ============================================================================

-- Migration: Enable Realtime on messages table
-- Description: Ajoute public.messages Ã  la publication Realtime de Supabase.
-- Issue: #51 - Messagerie coach

DO $$
BEGIN
  -- La publication est gÃ©nÃ©ralement nommÃ©e 'supabase_realtime'
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Table dÃ©jÃ  ajoutÃ©e Ã  la publication
        NULL;
    END;
  END IF;
END $$;


-- ============================================================================
-- SOURCE: 023_conversations_unique_pair_any_order.sql
-- ============================================================================

-- Migration: Enforce unique conversation per pair (any order)
-- Description: EmpÃªche les doublons de conversation entre deux utilisateurs (Aâ†”B),
--              mÃªme si l'un initie avec (student_id=A, coach_id=B) et l'autre inverse.
-- Issue: #51 - Messagerie coach

-- Colonnes gÃ©nÃ©rÃ©es pour normaliser la paire
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS user_low_id UUID
    GENERATED ALWAYS AS (LEAST(student_id, coach_id)) STORED,
  ADD COLUMN IF NOT EXISTS user_high_id UUID
    GENERATED ALWAYS AS (GREATEST(student_id, coach_id)) STORED;

-- Index/contrainte d'unicitÃ© sur la paire normalisÃ©e
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_conversations_user_pair'
      AND conrelid = 'public.conversations'::regclass
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT uq_conversations_user_pair UNIQUE (user_low_id, user_high_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_user_pair
  ON public.conversations(user_low_id, user_high_id);

-- Politique INSERT : permettre Ã  un participant de crÃ©er la conversation
-- (on garde la rÃ¨gle "deux personnes diffÃ©rentes")
DROP POLICY IF EXISTS "Students can create conversations" ON public.conversations;
CREATE POLICY "Participants can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (student_id, coach_id)
    AND student_id != coach_id
  );


-- ============================================================================
-- SOURCE: 024_create_email_events_and_session_emails_trigger.sql
-- ============================================================================

-- Migration: Issue #68 - SystÃ¨me d'emails (Resend)
-- Table email_events (idempotence + audit), config trigger, pg_net, trigger sessions â†’ Edge Function

-- 1) Table email_events (idempotence + audit)
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  payload JSONB,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_id TEXT,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_session_event_unique
  ON public.email_events (session_id, event_type)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_events_session_id ON public.email_events (session_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON public.email_events (event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_sent_at ON public.email_events (sent_at);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- RLS: accÃ¨s rÃ©servÃ© au backend (service role bypass). Aucune policy = aucun accÃ¨s anon.
-- Les Edge Functions utilisent SUPABASE_SERVICE_ROLE_KEY donc bypass RLS.

COMMENT ON TABLE public.email_events IS 'Issue #68: idempotence et audit des envois email via Resend';

-- 2) Schema + config pour le trigger (secret et URL Edge Function)
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.edge_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- L'utilisateur doit dÃ©finir la valeur via Dashboard SQL ou une fois dÃ©ployÃ©.
INSERT INTO private.edge_config (key, value) VALUES
  ('email_webhook_secret', ''),
  ('edge_base_url', 'https://txlkkssylxpmkzistylw.supabase.co')
ON CONFLICT (key) DO NOTHING;

-- 3) Extension pg_net (appels HTTP async depuis Postgres; crÃ©e le schÃ©ma net)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4) Fonction trigger: aprÃ¨s changement de status sessions â†’ appeler Edge Function
CREATE OR REPLACE FUNCTION public.trigger_send_session_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  base_url TEXT;
  secret TEXT;
  req_url TEXT;
  req_body JSONB;
  req_headers JSONB;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('paid', 'upcoming', 'canceled') THEN
    RETURN NEW;
  END IF;

  SELECT value INTO base_url FROM private.edge_config WHERE key = 'edge_base_url' LIMIT 1;
  SELECT value INTO secret FROM private.edge_config WHERE key = 'email_webhook_secret' LIMIT 1;

  IF base_url IS NULL OR base_url = '' THEN
    RAISE WARNING 'edge_config.edge_base_url non configurÃ©, skip envoi email session %', NEW.id;
    RETURN NEW;
  END IF;

  req_url := base_url || '/functions/v1/send-session-emails';
  req_body := jsonb_build_object(
    'session_id', NEW.id,
    'old_status', OLD.status,
    'new_status', NEW.status
  );
  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-webhook-secret', COALESCE(secret, '')
  );

  PERFORM net.http_post(
    url := req_url,
    body := req_body,
    headers := req_headers
  );

  RETURN NEW;
END;
$$;

-- Trigger sur sessions (INSERT/UPDATE quand status devient paid/upcoming/canceled)
DROP TRIGGER IF EXISTS on_session_status_send_emails ON public.sessions;
CREATE TRIGGER on_session_status_send_emails
  AFTER INSERT OR UPDATE OF status ON public.sessions
  FOR EACH ROW
  WHEN (NEW.status IN ('paid', 'upcoming', 'canceled'))
  EXECUTE FUNCTION public.trigger_send_session_emails();

-- ============================================================================
-- SOURCE: 024_enable_pg_cron.sql
-- ============================================================================

-- Issue: purge automatique des messages aprÃ¨s 180 jours
-- Ã‰tape 1: activer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- SOURCE: 025_purge_old_messages_job.sql
-- ============================================================================

-- Issue: purge automatique des messages aprÃ¨s 180 jours
-- Ã‰tape 2: index de performance + fonction de purge + job cron quotidien

-- Index pour Ã©viter un seq scan sur messages Ã  chaque purge
CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON public.messages (created_at);

-- Fonction de purge (SECURITY DEFINER pour bypasser le RLS)
CREATE OR REPLACE FUNCTION public.purge_old_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_messages int;
  deleted_convs    int;
BEGIN
  -- Supprimer les messages de plus de 180 jours
  DELETE FROM public.messages
  WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;

  -- Supprimer les conversations sans aucun message restant
  DELETE FROM public.conversations c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.conversation_id = c.id
  );
  GET DIAGNOSTICS deleted_convs = ROW_COUNT;

  RAISE LOG 'purge_old_messages: % messages supprimÃ©s, % conversations vides supprimÃ©es',
    deleted_messages, deleted_convs;
END;
$$;

-- Job cron quotidien Ã  2h00 UTC
SELECT cron.schedule(
  'purge-old-messages',
  '0 2 * * *',
  'SELECT public.purge_old_messages()'
);

-- ============================================================================
-- SOURCE: 025_session_action_tokens.sql
-- ============================================================================

-- Tokens one-time pour les boutons Confirmer/Annuler du mail coach (ne dÃ©pend pas du secret partagÃ©)
CREATE TABLE IF NOT EXISTS public.session_action_tokens (
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('confirm', 'cancel')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, action)
);

CREATE INDEX IF NOT EXISTS idx_session_action_tokens_token_hash ON public.session_action_tokens (token_hash) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_action_tokens_expires_at ON public.session_action_tokens (expires_at);

ALTER TABLE public.session_action_tokens ENABLE ROW LEVEL SECURITY;
-- Aucune policy = accÃ¨s uniquement via service role (Edge Functions).

COMMENT ON TABLE public.session_action_tokens IS 'Tokens one-time pour liens Confirmer/Annuler dans le mail coach (issue #68).';

-- ============================================================================
-- SOURCE: 026_refactor_booking_statuses_issue_92.sql
-- ============================================================================

-- Issue: #92 - Refonte statuts rÃ©servation (upcoming/booked/confirmed/canceled)
-- Objectif:
-- - coach_availabilities.status devient la source de vÃ©ritÃ© cÃ´tÃ© dashboards (upcoming/booked/confirmed)
-- - sessions garde un statut transactionnel (paid/upcoming/done/canceled) + lien slot_id
-- - job pg_cron: auto-validation des crÃ©neaux passÃ©s (booked -> confirmed)

-- 1) S'assurer que sessions.slot_id existe et est liÃ© Ã  coach_availabilities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sessions'
      AND column_name = 'slot_id'
  ) THEN
    ALTER TABLE public.sessions
      ADD COLUMN slot_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_slot_id_fkey'
      AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_slot_id_fkey
      FOREIGN KEY (slot_id) REFERENCES public.coach_availabilities(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_slot_id ON public.sessions(slot_id);

-- 2) Ã‰tendre les statuts de coach_availabilities (rÃ©trocompat: pending/blocked)
ALTER TABLE public.coach_availabilities
  DROP CONSTRAINT IF EXISTS coach_availabilities_status_check;

ALTER TABLE public.coach_availabilities
  ADD CONSTRAINT coach_availabilities_status_check
  CHECK (status IN ('available', 'upcoming', 'booked', 'confirmed', 'canceled', 'pending', 'blocked'));

-- Backfill: pending -> upcoming (si existait)
UPDATE public.coach_availabilities
SET status = 'upcoming'
WHERE status = 'pending';

-- Backfill: blocked -> booked (si existait)
UPDATE public.coach_availabilities
SET status = 'booked'
WHERE status = 'blocked';

-- 3) Fonction: auto-confirmation des crÃ©neaux passÃ©s
-- - Une session est considÃ©rÃ©e "terminÃ©e" si end_at < now()
-- - On confirme le crÃ©neau si statut = blocked
CREATE OR REPLACE FUNCTION public.confirm_past_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Confirmer les crÃ©neaux passÃ©s
  UPDATE public.coach_availabilities ca
  SET status = 'confirmed'
  WHERE ca.status = 'booked'
    AND ca.end_at IS NOT NULL
    AND ca.end_at < now();

  -- Marquer les sessions comme done si elles Ã©taient upcoming et que le crÃ©neau est confirmÃ©
  UPDATE public.sessions s
  SET status = 'done',
      completed_at = COALESCE(s.completed_at, now())
  WHERE s.status = 'upcoming'
    AND s.end_at IS NOT NULL
    AND s.end_at < now()
    AND s.slot_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.coach_availabilities ca
      WHERE ca.id = s.slot_id
        AND ca.status = 'confirmed'
    );
END;
$$;

-- 4) Job cron (toutes les heures)
-- Remarque: pg_cron est activÃ© via 024_enable_pg_cron.sql
SELECT cron.schedule(
  'confirm-past-bookings',
  '0 * * * *',
  'SELECT public.confirm_past_bookings()'
);


-- ============================================================================
-- SOURCE: 027_issue_92_slot_status_upcoming.sql
-- ============================================================================

-- Issue #92: Statuts crÃ©neaux = upcoming/booked/confirmed (+ canceled + retro)
-- Objectif: upcoming = "en attente de confirmation coach"

ALTER TABLE public.coach_availabilities
  DROP CONSTRAINT IF EXISTS coach_availabilities_status_check;

ALTER TABLE public.coach_availabilities
  ADD CONSTRAINT coach_availabilities_status_check
  CHECK (
    status IN (
      'available',
      'upcoming',
      'booked',
      'confirmed',
      'canceled',
      -- rÃ©tro-compat
      'pending',
      'blocked'
    )
  );

-- Backfill: pending -> upcoming (si prÃ©sent)
UPDATE public.coach_availabilities
SET status = 'upcoming'
WHERE status = 'pending';


-- ============================================================================
-- SOURCE: 028_fix_booked_availability_trigger_issue_92.sql
-- ============================================================================

-- Issue #92: Autoriser les transitions lÃ©gitimes depuis 'booked'
-- - booked -> confirmed (post-session auto/manuel)
-- - booked -> upcoming uniquement si la session liÃ©e est encore en status 'paid' (rÃ©paration: booked mis trop tÃ´t)

CREATE OR REPLACE FUNCTION public.prevent_booked_availability_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Block deletes of booked slots
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'booked' THEN
      RAISE EXCEPTION 'Impossible de supprimer un crÃ©neau rÃ©servÃ©';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'booked' AND NEW.status <> 'booked' THEN
      -- Autoriser la validation post-session
      IF NEW.status = 'confirmed' THEN
        RETURN NEW;
      END IF;

      -- Autoriser la "rÃ©paration" booked -> upcoming si la session est encore payÃ©e (non confirmÃ©e coach)
      IF NEW.status = 'upcoming' AND EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.slot_id = OLD.id
          AND s.status = 'paid'
      ) THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'Impossible de modifier le statut d''un crÃ©neau rÃ©servÃ©';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;


-- ============================================================================
-- SOURCE: 029_sync_session_status_from_slot_issue_92.sql
-- ============================================================================

-- Issue #92 (complÃ©ment) : synchroniser sessions.status Ã  partir de coach_availabilities.status
-- Objectif (transactions coach) :
-- - slot.status = upcoming/pending  => session.status = upcoming
-- - slot.status = booked            => session.status = paid
-- - slot.status = confirmed         => session.status = done (+ completed_at)
-- - slot.status = canceled          => session.status = canceled
-- - slot supprimÃ© / slot_id NULL    => session.status = canceled
--
-- Notes :
-- - On n'Ã©crase jamais explicitement 'canceled' ou 'done' si dÃ©jÃ  demandÃ© par le code.
-- - On garde la rÃ©tro-compatibilitÃ© pending/blocked.

CREATE OR REPLACE FUNCTION public.map_slot_status_to_session_status(slot_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE slot_status
    WHEN 'booked' THEN 'paid'
    WHEN 'confirmed' THEN 'done'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'blocked' THEN 'paid'      -- rÃ©tro-compat
    WHEN 'pending' THEN 'upcoming'  -- rÃ©tro-compat
    WHEN 'upcoming' THEN 'upcoming'
    ELSE 'upcoming'
  END;
$$;

-- 1) Trigger cÃ´tÃ© sessions : garantit la cohÃ©rence mÃªme si une Edge Function tente un statut diffÃ©rent
CREATE OR REPLACE FUNCTION public.sync_session_status_from_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_status text;
  mapped_status text;
BEGIN
  -- Respecter un statut explicitement finalisÃ©
  IF NEW.status IN ('canceled', 'done') THEN
    RETURN NEW;
  END IF;

  -- Si plus de crÃ©neau associÃ© -> canceled
  IF NEW.slot_id IS NULL THEN
    NEW.status := 'canceled';
    RETURN NEW;
  END IF;

  SELECT ca.status
    INTO slot_status
  FROM public.coach_availabilities ca
  WHERE ca.id = NEW.slot_id;

  -- Si le crÃ©neau n'existe plus (FK ON DELETE SET NULL peut ne pas s'Ãªtre appliquÃ© Ã  temps) -> canceled
  IF slot_status IS NULL THEN
    NEW.status := 'canceled';
    RETURN NEW;
  END IF;

  mapped_status := public.map_slot_status_to_session_status(slot_status);

  -- Appliquer mapping
  NEW.status := mapped_status;

  IF NEW.status = 'done' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_session_status_from_slot ON public.sessions;
CREATE TRIGGER trg_sync_session_status_from_slot
BEFORE INSERT OR UPDATE OF slot_id, status ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_session_status_from_slot();

-- 2) Trigger cÃ´tÃ© coach_availabilities : propage immÃ©diatement les changements de statut du crÃ©neau vers la session
CREATE OR REPLACE FUNCTION public.propagate_slot_status_to_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mapped_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    mapped_status := public.map_slot_status_to_session_status(NEW.status);

    UPDATE public.sessions s
    SET status = mapped_status,
        completed_at = CASE WHEN mapped_status = 'done' THEN COALESCE(s.completed_at, now()) ELSE s.completed_at END
    WHERE s.slot_id = NEW.id
      AND s.status NOT IN ('canceled', 'done');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_slot_status_to_session ON public.coach_availabilities;
CREATE TRIGGER trg_propagate_slot_status_to_session
AFTER UPDATE OF status ON public.coach_availabilities
FOR EACH ROW
EXECUTE FUNCTION public.propagate_slot_status_to_session();

-- 3) Backfill (sÃ©curisÃ©) : rÃ©aligner l'existant
UPDATE public.sessions s
SET status = public.map_slot_status_to_session_status(ca.status),
    completed_at = CASE WHEN public.map_slot_status_to_session_status(ca.status) = 'done' THEN COALESCE(s.completed_at, now()) ELSE s.completed_at END
FROM public.coach_availabilities ca
WHERE s.slot_id = ca.id
  AND s.status NOT IN ('canceled', 'done');

UPDATE public.sessions s
SET status = 'canceled'
WHERE s.slot_id IS NULL
  AND s.status NOT IN ('canceled', 'done');


-- Audit table for deleted sessions
CREATE TABLE IF NOT EXISTS public.sessions_delete_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID,
  db_user TEXT,
  old_row JSONB NOT NULL
);

ALTER TABLE public.sessions_delete_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sessions_delete_audit'
      AND policyname = 'Maintainers can read sessions delete audit'
  ) THEN
    CREATE POLICY "Maintainers can read sessions delete audit"
      ON public.sessions_delete_audit
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'maintainer'
        )
      );
  END IF;
END $$;

-- Audit function + trigger before deleting sessions
CREATE OR REPLACE FUNCTION public.audit_sessions_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  jwt_sub text;
BEGIN
  jwt_sub := current_setting('request.jwt.claim.sub', true);

  INSERT INTO public.sessions_delete_audit (deleted_by, db_user, old_row)
  VALUES (
    CASE WHEN jwt_sub IS NULL OR jwt_sub = '' THEN NULL ELSE jwt_sub::uuid END,
    current_user,
    to_jsonb(OLD)
  );

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS audit_sessions_delete_trigger ON public.sessions;
CREATE TRIGGER audit_sessions_delete_trigger
BEFORE DELETE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.audit_sessions_delete();

-- Prevent deleting coaching offers that are referenced by sessions
CREATE OR REPLACE FUNCTION public.prevent_coaching_delete_when_sessions_exist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.coach_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Impossible de supprimer une offre de coaching liée à des sessions';
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS protect_coachings_from_delete_trigger ON public.coachings;
CREATE TRIGGER protect_coachings_from_delete_trigger
BEFORE DELETE ON public.coachings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_coaching_delete_when_sessions_exist();

-- Enforce protection of booked availability slots
DROP TRIGGER IF EXISTS protect_booked_availabilities_trigger ON public.coach_availabilities;
CREATE TRIGGER protect_booked_availabilities_trigger
BEFORE DELETE OR UPDATE ON public.coach_availabilities
FOR EACH ROW
EXECUTE FUNCTION public.prevent_booked_availability_mutations();


-- Migration: Drop legacy coaches table
-- Description: Supprime la table public.coaches devenue inutile
--              après le passage au modèle multi-jeux (coachings/profile_game_roles).
-- Issue: #30 - nettoyage du schéma

-- 1) Supprimer les politiques RLS liées à public.coaches si elles existent encore
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coaches'
  ) THEN
    DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON public.coaches;
    DROP POLICY IF EXISTS "Users can manage own coach profile" ON public.coaches;
    DROP POLICY IF EXISTS "Maintainers can manage all coaches" ON public.coaches;
  END IF;
END $$;

-- 2) Supprimer la table public.coaches (et ses contraintes FK)
DROP TABLE IF EXISTS public.coaches CASCADE;


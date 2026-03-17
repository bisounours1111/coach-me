-- Migration: Add icon column to games table
-- Description: Ajoute une colonne icon_url à la table games pour permettre l'affichage d'icônes personnalisées.

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Mise à jour des politiques de stockage pour permettre aux maintainers de gérer les icônes de jeux
-- On suppose l'existence d'un bucket 'game-icons' ou on utilise un bucket existant.
-- Pour cet exercice, nous allons créer les politiques pour un bucket 'game-icons'.

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

-- Migration: Create coach videos storage bucket
-- Description: Crée un bucket Supabase Storage pour stocker les vidéos de démonstration des coachs
-- Note: Limitation de stockage mentionnée dans le README - le bucket peut être limité en taille

-- Créer le bucket pour les vidéos des coachs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-videos',
  'coach-videos',
  true, -- Public pour permettre l'accès aux vidéos
  104857600, -- Limite de 100 MB par fichier (100 * 1024 * 1024)
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo' -- .avi
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) pour les objets du bucket
-- Les politiques RLS sont déjà activées par défaut sur storage.objects

-- Politique: Tout le monde peut lire les vidéos (bucket public)
CREATE POLICY "Coach videos are viewable by everyone"
ON storage.objects
FOR SELECT
USING (bucket_id = 'coach-videos');

-- Politique: Seuls les coachs authentifiés peuvent uploader leurs propres vidéos
CREATE POLICY "Coaches can upload own videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'coach-videos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_coach = TRUE
  )
);

-- Politique: Seuls les coachs peuvent mettre à jour leurs propres vidéos
CREATE POLICY "Coaches can update own videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'coach-videos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_coach = TRUE
  )
);

-- Politique: Seuls les coachs peuvent supprimer leurs propres vidéos
CREATE POLICY "Coaches can delete own videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'coach-videos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_coach = TRUE
  )
);

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

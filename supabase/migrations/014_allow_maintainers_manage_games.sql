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

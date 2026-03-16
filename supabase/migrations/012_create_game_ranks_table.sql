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

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

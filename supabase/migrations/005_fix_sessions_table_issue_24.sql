-- Migration: Fix sessions table to match issue #24 requirements
-- Description: Corrige les colonnes et statuts pour correspondre exactement à l'issue #24
-- Issue: #24

-- Renommer scheduled_at en start_at
ALTER TABLE public.sessions RENAME COLUMN scheduled_at TO start_at;

-- Ajouter end_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sessions' 
    AND column_name = 'end_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN end_at TIMESTAMPTZ;
  END IF;
END $$;

-- Supprimer l'ancienne contrainte sur price_cents
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_price_cents_check;

-- Changer le type et renommer price_cents en price
ALTER TABLE public.sessions ALTER COLUMN price_cents TYPE NUMERIC(10, 2) USING (price_cents::NUMERIC / 100.0);
ALTER TABLE public.sessions RENAME COLUMN price_cents TO price;

-- Ajouter la nouvelle contrainte sur price
ALTER TABLE public.sessions ADD CONSTRAINT sessions_price_check CHECK (price > 0);

-- Renommer l'index
DROP INDEX IF EXISTS idx_sessions_scheduled_at;
CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON public.sessions(start_at);

-- Ajouter stripe_session_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sessions' 
    AND column_name = 'stripe_session_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN stripe_session_id TEXT UNIQUE;
  END IF;
END $$;

-- Mettre à jour la contrainte CHECK pour les statuts
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE public.sessions 
  ADD CONSTRAINT sessions_status_check 
  CHECK (status IN ('pending', 'paid', 'upcoming', 'done', 'canceled'));

-- Mettre à jour les statuts existants (si des données existent)
UPDATE public.sessions 
SET status = CASE 
  WHEN status = 'confirmed' THEN 'upcoming'
  WHEN status = 'completed' THEN 'done'
  WHEN status = 'cancelled' THEN 'canceled'
  WHEN status = 'refunded' THEN 'canceled'
  ELSE status
END
WHERE status IN ('confirmed', 'completed', 'cancelled', 'refunded');

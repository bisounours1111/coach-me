-- Issue: #92 - Refonte statuts réservation (upcoming/booked/confirmed/canceled)
-- Objectif:
-- - coach_availabilities.status devient la source de vérité côté dashboards (upcoming/booked/confirmed)
-- - sessions garde un statut transactionnel (paid/upcoming/done/canceled) + lien slot_id
-- - job pg_cron: auto-validation des créneaux passés (booked -> confirmed)

-- 1) S'assurer que sessions.slot_id existe et est lié à coach_availabilities
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

-- 2) Étendre les statuts de coach_availabilities (rétrocompat: pending/blocked)
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

-- 3) Fonction: auto-confirmation des créneaux passés
-- - Une session est considérée "terminée" si end_at < now()
-- - On confirme le créneau si statut = blocked
CREATE OR REPLACE FUNCTION public.confirm_past_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Confirmer les créneaux passés
  UPDATE public.coach_availabilities ca
  SET status = 'confirmed'
  WHERE ca.status = 'booked'
    AND ca.end_at IS NOT NULL
    AND ca.end_at < now();

  -- Marquer les sessions comme done si elles étaient upcoming et que le créneau est confirmé
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
-- Remarque: pg_cron est activé via 024_enable_pg_cron.sql
SELECT cron.schedule(
  'confirm-past-bookings',
  '0 * * * *',
  'SELECT public.confirm_past_bookings()'
);


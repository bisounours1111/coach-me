-- Issue #92: Statuts créneaux = upcoming/booked/confirmed (+ canceled + retro)
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
      -- rétro-compat
      'pending',
      'blocked'
    )
  );

-- Backfill: pending -> upcoming (si présent)
UPDATE public.coach_availabilities
SET status = 'upcoming'
WHERE status = 'pending';


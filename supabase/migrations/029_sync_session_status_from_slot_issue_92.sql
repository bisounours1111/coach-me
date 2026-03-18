-- Issue #92 (complément) : synchroniser sessions.status à partir de coach_availabilities.status
-- Objectif (transactions coach) :
-- - slot.status = upcoming/pending  => session.status = upcoming
-- - slot.status = booked            => session.status = paid
-- - slot.status = confirmed         => session.status = done (+ completed_at)
-- - slot.status = canceled          => session.status = canceled
-- - slot supprimé / slot_id NULL    => session.status = canceled
--
-- Notes :
-- - On n'écrase jamais explicitement 'canceled' ou 'done' si déjà demandé par le code.
-- - On garde la rétro-compatibilité pending/blocked.

CREATE OR REPLACE FUNCTION public.map_slot_status_to_session_status(slot_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE slot_status
    WHEN 'booked' THEN 'paid'
    WHEN 'confirmed' THEN 'done'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'blocked' THEN 'paid'      -- rétro-compat
    WHEN 'pending' THEN 'upcoming'  -- rétro-compat
    WHEN 'upcoming' THEN 'upcoming'
    ELSE 'upcoming'
  END;
$$;

-- 1) Trigger côté sessions : garantit la cohérence même si une Edge Function tente un statut différent
CREATE OR REPLACE FUNCTION public.sync_session_status_from_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_status text;
  mapped_status text;
BEGIN
  -- Respecter un statut explicitement finalisé
  IF NEW.status IN ('canceled', 'done') THEN
    RETURN NEW;
  END IF;

  -- Si plus de créneau associé -> canceled
  IF NEW.slot_id IS NULL THEN
    NEW.status := 'canceled';
    RETURN NEW;
  END IF;

  SELECT ca.status
    INTO slot_status
  FROM public.coach_availabilities ca
  WHERE ca.id = NEW.slot_id;

  -- Si le créneau n'existe plus (FK ON DELETE SET NULL peut ne pas s'être appliqué à temps) -> canceled
  IF slot_status IS NULL THEN
    NEW.status := 'canceled';
    RETURN NEW;
  END IF;

  mapped_status := public.map_slot_status_to_session_status(slot_status);

  -- Appliquer mapping
  NEW.status := mapped_status;

  IF NEW.status = 'done' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_session_status_from_slot ON public.sessions;
CREATE TRIGGER trg_sync_session_status_from_slot
BEFORE INSERT OR UPDATE OF slot_id, status ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_session_status_from_slot();

-- 2) Trigger côté coach_availabilities : propage immédiatement les changements de statut du créneau vers la session
CREATE OR REPLACE FUNCTION public.propagate_slot_status_to_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mapped_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    mapped_status := public.map_slot_status_to_session_status(NEW.status);

    UPDATE public.sessions s
    SET status = mapped_status,
        completed_at = CASE WHEN mapped_status = 'done' THEN COALESCE(s.completed_at, now()) ELSE s.completed_at END
    WHERE s.slot_id = NEW.id
      AND s.status NOT IN ('canceled', 'done');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_slot_status_to_session ON public.coach_availabilities;
CREATE TRIGGER trg_propagate_slot_status_to_session
AFTER UPDATE OF status ON public.coach_availabilities
FOR EACH ROW
EXECUTE FUNCTION public.propagate_slot_status_to_session();

-- 3) Backfill (sécurisé) : réaligner l'existant
UPDATE public.sessions s
SET status = public.map_slot_status_to_session_status(ca.status),
    completed_at = CASE WHEN public.map_slot_status_to_session_status(ca.status) = 'done' THEN COALESCE(s.completed_at, now()) ELSE s.completed_at END
FROM public.coach_availabilities ca
WHERE s.slot_id = ca.id
  AND s.status NOT IN ('canceled', 'done');

UPDATE public.sessions s
SET status = 'canceled'
WHERE s.slot_id IS NULL
  AND s.status NOT IN ('canceled', 'done');


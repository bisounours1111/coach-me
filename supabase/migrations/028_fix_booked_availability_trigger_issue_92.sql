-- Issue #92: Autoriser les transitions légitimes depuis 'booked'
-- - booked -> confirmed (post-session auto/manuel)
-- - booked -> upcoming uniquement si la session liée est encore en status 'paid' (réparation: booked mis trop tôt)

CREATE OR REPLACE FUNCTION public.prevent_booked_availability_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Block deletes of booked slots
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'booked' THEN
      RAISE EXCEPTION 'Impossible de supprimer un créneau réservé';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'booked' AND NEW.status <> 'booked' THEN
      -- Autoriser la validation post-session
      IF NEW.status = 'confirmed' THEN
        RETURN NEW;
      END IF;

      -- Autoriser la "réparation" booked -> upcoming si la session est encore payée (non confirmée coach)
      IF NEW.status = 'upcoming' AND EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.slot_id = OLD.id
          AND s.status = 'paid'
      ) THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'Impossible de modifier le statut d''un créneau réservé';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;


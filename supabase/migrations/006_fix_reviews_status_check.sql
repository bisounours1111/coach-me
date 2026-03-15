-- Migration: Fix reviews to use 'done' status instead of 'completed'
-- Description: Corrige la fonction check_session_completed pour utiliser le statut 'done'
-- Issue: #23, #24

-- Corriger la fonction check_session_completed
CREATE OR REPLACE FUNCTION public.check_session_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = NEW.session_id
    AND status = 'done'
  ) THEN
    RAISE EXCEPTION 'Un avis ne peut être créé que pour une session terminée (status = done)';
  END IF;
  RETURN NEW;
END;
$$;

-- Mettre à jour la politique RLS pour utiliser 'done'
DROP POLICY IF EXISTS "Students can create reviews for own sessions" ON public.reviews;

CREATE POLICY "Students can create reviews for own sessions"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE id = session_id
      AND student_id = auth.uid()
      AND status = 'done'
    )
  );

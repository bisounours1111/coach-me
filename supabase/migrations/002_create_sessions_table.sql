-- Migration: Create sessions table
-- Description: Table pour gérer les réservations de sessions de coaching
-- Issue: #15 - 2.2 Création de la table sessions

-- Créer la table sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Informations de la session
  start_at TIMESTAMPTZ NOT NULL, -- Date/heure de début de la session
  end_at TIMESTAMPTZ, -- Date/heure de fin (calculée ou définie)
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0), -- Durée en minutes (alternative à end_at)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'upcoming', 'done', 'canceled')),
  
  -- Informations de paiement
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0), -- Prix en unité de currency
  currency TEXT DEFAULT 'EUR',
  stripe_session_id TEXT UNIQUE, -- Référence à Stripe Checkout Session
  stripe_payment_intent_id TEXT, -- Référence à Stripe Payment Intent (pour suivi)
  stripe_payment_status TEXT,
  
  -- Notes et détails
  student_notes TEXT, -- Notes de l'élève avant la session
  coach_notes TEXT, -- Notes du coach après la session
  game TEXT, -- Jeu concerné par la session
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON public.sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON public.sessions(start_at);
CREATE INDEX IF NOT EXISTS idx_sessions_stripe_payment_intent_id ON public.sessions(stripe_payment_intent_id);

-- Trigger pour updated_at
CREATE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Politique: Les coachs peuvent voir leurs propres sessions
CREATE POLICY "Coaches can view own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = coach_id);

-- Politique: Les élèves peuvent voir leurs propres sessions
CREATE POLICY "Students can view own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = student_id);

-- Politique: Les élèves peuvent créer des sessions (réserver)
CREATE POLICY "Students can create sessions"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Politique: Les coachs peuvent mettre à jour leurs sessions (confirmer, compléter, annuler)
CREATE POLICY "Coaches can update own sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = coach_id);

-- Politique: Les élèves peuvent mettre à jour leurs propres sessions (annuler, ajouter notes)
CREATE POLICY "Students can update own sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Contrainte: Un élève ne peut pas réserver une session avec lui-même
ALTER TABLE public.sessions
  ADD CONSTRAINT check_coach_student_different
  CHECK (coach_id != student_id);

-- Fonction pour vérifier qu'un coach a is_coach = true
CREATE OR REPLACE FUNCTION public.check_coach_is_coach()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.coach_id AND is_coach = TRUE
  ) THEN
    RAISE EXCEPTION 'Le coach doit avoir is_coach = TRUE';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger pour vérifier qu'un coach a is_coach = true
CREATE TRIGGER check_coach_is_coach_trigger
  BEFORE INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_coach_is_coach();

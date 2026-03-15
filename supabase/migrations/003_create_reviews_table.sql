-- Migration: Create reviews table
-- Description: Table pour stocker les avis des élèves sur les sessions de coaching
-- Issue: #15 - 2.3 Création de la table reviews

-- Créer la table reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Contenu de l'avis
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_reviews_coach_id ON public.reviews(coach_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON public.reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON public.reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Trigger pour updated_at
CREATE TRIGGER set_updated_at_reviews
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire les avis (pour voir la réputation des coachs)
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews
  FOR SELECT
  USING (true);

-- Politique: Les élèves peuvent créer des avis pour leurs propres sessions
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

-- Politique: Les élèves peuvent mettre à jour leurs propres avis
CREATE POLICY "Students can update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Politique: Les élèves peuvent supprimer leurs propres avis
CREATE POLICY "Students can delete own reviews"
  ON public.reviews
  FOR DELETE
  USING (auth.uid() = student_id);

-- Fonction pour vérifier qu'une session est complétée avant de créer un avis
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

-- Trigger pour vérifier qu'une session est complétée
CREATE TRIGGER check_session_completed_trigger
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_session_completed();

-- Contrainte: Un élève ne peut pas s'auto-évaluer
ALTER TABLE public.reviews
  ADD CONSTRAINT check_student_coach_different
  CHECK (student_id != coach_id);

-- Fonction pour calculer la note moyenne d'un coach (utile pour les requêtes)
CREATE OR REPLACE FUNCTION public.get_coach_average_rating(coach_uuid UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(AVG(rating), 0)
  FROM public.reviews
  WHERE coach_id = coach_uuid;
$$;

-- Fonction pour compter le nombre d'avis d'un coach
CREATE OR REPLACE FUNCTION public.get_coach_review_count(coach_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.reviews
  WHERE coach_id = coach_uuid;
$$;

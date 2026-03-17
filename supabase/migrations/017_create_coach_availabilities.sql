-- Migration: Create coach_availabilities table
-- Description: Table pour gérer les créneaux de disponibilité des coachs
-- Issue: #19 - 5.2 Système de réservations

-- Créer la table coach_availabilities
CREATE TABLE IF NOT EXISTS public.coach_availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Informations du créneau
  start_time TIME NOT NULL, -- Heure de début (ex: '09:00:00')
  end_time TIME NOT NULL, -- Heure de fin (ex: '12:00:00')
  
  -- Alternative: Créneau spécifique (date précise)
  specific_date DATE, -- Si NULL, c'est un créneau récurrent hebdomadaire
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte: start_time < end_time
  CONSTRAINT check_time_range CHECK (start_time < end_time)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_availabilities_coach_id ON public.coach_availabilities(coach_id);
CREATE INDEX IF NOT EXISTS idx_availabilities_specific_date ON public.coach_availabilities(specific_date);

-- Trigger pour updated_at
CREATE TRIGGER set_updated_at_availabilities
  BEFORE UPDATE ON public.coach_availabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.coach_availabilities ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut voir les disponibilités des coachs
CREATE POLICY "Availabilities are viewable by everyone"
  ON public.coach_availabilities
  FOR SELECT
  USING (true);

-- Politique: Les coachs peuvent gérer leurs propres disponibilités
CREATE POLICY "Coaches can manage own availabilities"
  ON public.coach_availabilities
  FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Ajouter une colonne 'negotiated_price' à la table sessions pour la négociation
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS negotiated_price NUMERIC(10, 2);

-- Mettre à jour les statuts de sessions pour inclure 'negotiating' et 'rejected'
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions 
  ADD CONSTRAINT sessions_status_check 
  CHECK (status IN ('pending', 'negotiating', 'accepted', 'rejected', 'paid', 'upcoming', 'done', 'canceled'));

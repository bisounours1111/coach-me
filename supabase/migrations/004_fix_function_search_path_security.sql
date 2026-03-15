-- Migration: Fix function search_path security
-- Description: Corrige les fonctions pour définir search_path et améliorer la sécurité
-- Issue: #15 - Correction de sécurité

-- Corriger handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Corriger handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Corriger check_coach_is_coach
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

-- Corriger check_session_completed
CREATE OR REPLACE FUNCTION public.check_session_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = NEW.session_id
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Un avis ne peut être créé que pour une session complétée';
  END IF;
  RETURN NEW;
END;
$$;

-- Corriger get_coach_average_rating
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

-- Corriger get_coach_review_count
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

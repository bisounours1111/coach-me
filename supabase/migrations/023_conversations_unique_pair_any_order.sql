-- Migration: Enforce unique conversation per pair (any order)
-- Description: Empêche les doublons de conversation entre deux utilisateurs (A↔B),
--              même si l'un initie avec (student_id=A, coach_id=B) et l'autre inverse.
-- Issue: #51 - Messagerie coach

-- Colonnes générées pour normaliser la paire
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS user_low_id UUID
    GENERATED ALWAYS AS (LEAST(student_id, coach_id)) STORED,
  ADD COLUMN IF NOT EXISTS user_high_id UUID
    GENERATED ALWAYS AS (GREATEST(student_id, coach_id)) STORED;

-- Index/contrainte d'unicité sur la paire normalisée
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_conversations_user_pair'
      AND conrelid = 'public.conversations'::regclass
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT uq_conversations_user_pair UNIQUE (user_low_id, user_high_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_user_pair
  ON public.conversations(user_low_id, user_high_id);

-- Politique INSERT : permettre à un participant de créer la conversation
-- (on garde la règle "deux personnes différentes")
DROP POLICY IF EXISTS "Students can create conversations" ON public.conversations;
CREATE POLICY "Participants can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (student_id, coach_id)
    AND student_id != coach_id
  );


-- Migration: Create conversations and messages tables (messagerie coach)
-- Description: Tables pour la messagerie élève–coach avec historisation et RLS.
-- Issue: #51 - 2. Messagerie avec le coach - pop-up, historisation, bouton fixe

-- Table conversations : une conversation par paire (élève, coach)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_conversation_student_coach UNIQUE (student_id, coach_id),
  CONSTRAINT check_conversation_different CHECK (student_id != coach_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON public.conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Table messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(conversation_id, created_at ASC);

-- Trigger: mettre à jour conversations.updated_at à chaque nouveau message
CREATE OR REPLACE FUNCTION public.set_conversation_updated_at_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_created_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_conversation_updated_at_on_message();

-- RLS conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations as student or coach"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = student_id OR auth.uid() = coach_id
  );

CREATE POLICY "Students can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = student_id AND auth.uid() != coach_id);

-- RLS messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages of their conversation"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.student_id = auth.uid() OR c.coach_id = auth.uid())
    )
  );

CREATE POLICY "Participants can insert messages in their conversation"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.student_id = auth.uid() OR c.coach_id = auth.uid())
    )
  );

-- Realtime: permettre l'écoute des nouveaux messages (optionnel, activé côté dashboard Supabase si besoin)
-- Les politiques RLS ci-dessus s'appliquent aussi au Realtime.

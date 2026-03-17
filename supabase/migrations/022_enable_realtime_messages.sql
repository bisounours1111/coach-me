-- Migration: Enable Realtime on messages table
-- Description: Ajoute public.messages à la publication Realtime de Supabase.
-- Issue: #51 - Messagerie coach

DO $$
BEGIN
  -- La publication est généralement nommée 'supabase_realtime'
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Table déjà ajoutée à la publication
        NULL;
    END;
  END IF;
END $$;


-- Issue: purge automatique des messages après 180 jours
-- Étape 2: index de performance + fonction de purge + job cron quotidien

-- Index pour éviter un seq scan sur messages à chaque purge
CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON public.messages (created_at);

-- Fonction de purge (SECURITY DEFINER pour bypasser le RLS)
CREATE OR REPLACE FUNCTION public.purge_old_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_messages int;
  deleted_convs    int;
BEGIN
  -- Supprimer les messages de plus de 180 jours
  DELETE FROM public.messages
  WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;

  -- Supprimer les conversations sans aucun message restant
  DELETE FROM public.conversations c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.conversation_id = c.id
  );
  GET DIAGNOSTICS deleted_convs = ROW_COUNT;

  RAISE LOG 'purge_old_messages: % messages supprimés, % conversations vides supprimées',
    deleted_messages, deleted_convs;
END;
$$;

-- Job cron quotidien à 2h00 UTC
SELECT cron.schedule(
  'purge-old-messages',
  '0 2 * * *',
  'SELECT public.purge_old_messages()'
);

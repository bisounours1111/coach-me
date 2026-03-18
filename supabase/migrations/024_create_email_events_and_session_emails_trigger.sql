-- Migration: Issue #68 - Système d'emails (Resend)
-- Table email_events (idempotence + audit), config trigger, pg_net, trigger sessions → Edge Function

-- 1) Table email_events (idempotence + audit)
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  payload JSONB,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_id TEXT,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_session_event_unique
  ON public.email_events (session_id, event_type)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_events_session_id ON public.email_events (session_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON public.email_events (event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_sent_at ON public.email_events (sent_at);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- RLS: accès réservé au backend (service role bypass). Aucune policy = aucun accès anon.
-- Les Edge Functions utilisent SUPABASE_SERVICE_ROLE_KEY donc bypass RLS.

COMMENT ON TABLE public.email_events IS 'Issue #68: idempotence et audit des envois email via Resend';

-- 2) Schema + config pour le trigger (secret et URL Edge Function)
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.edge_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- L'utilisateur doit définir la valeur via Dashboard SQL ou une fois déployé.
INSERT INTO private.edge_config (key, value) VALUES
  ('email_webhook_secret', ''),
  ('edge_base_url', 'https://txlkkssylxpmkzistylw.supabase.co')
ON CONFLICT (key) DO NOTHING;

-- 3) Extension pg_net (appels HTTP async depuis Postgres; crée le schéma net)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4) Fonction trigger: après changement de status sessions → appeler Edge Function
CREATE OR REPLACE FUNCTION public.trigger_send_session_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  base_url TEXT;
  secret TEXT;
  req_url TEXT;
  req_body JSONB;
  req_headers JSONB;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('paid', 'upcoming', 'canceled') THEN
    RETURN NEW;
  END IF;

  SELECT value INTO base_url FROM private.edge_config WHERE key = 'edge_base_url' LIMIT 1;
  SELECT value INTO secret FROM private.edge_config WHERE key = 'email_webhook_secret' LIMIT 1;

  IF base_url IS NULL OR base_url = '' THEN
    RAISE WARNING 'edge_config.edge_base_url non configuré, skip envoi email session %', NEW.id;
    RETURN NEW;
  END IF;

  req_url := base_url || '/functions/v1/send-session-emails';
  req_body := jsonb_build_object(
    'session_id', NEW.id,
    'old_status', OLD.status,
    'new_status', NEW.status
  );
  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-webhook-secret', COALESCE(secret, '')
  );

  PERFORM net.http_post(
    url := req_url,
    body := req_body,
    headers := req_headers
  );

  RETURN NEW;
END;
$$;

-- Trigger sur sessions (AFTER UPDATE, quand status change vers paid/upcoming/canceled)
DROP TRIGGER IF EXISTS on_session_status_send_emails ON public.sessions;
CREATE TRIGGER on_session_status_send_emails
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status IN ('paid', 'upcoming', 'canceled')
  )
  EXECUTE FUNCTION public.trigger_send_session_emails();

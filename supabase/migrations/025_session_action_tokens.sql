-- Tokens one-time pour les boutons Confirmer/Annuler du mail coach (ne dépend pas du secret partagé)
CREATE TABLE IF NOT EXISTS public.session_action_tokens (
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('confirm', 'cancel')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, action)
);

CREATE INDEX IF NOT EXISTS idx_session_action_tokens_token_hash ON public.session_action_tokens (token_hash) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_action_tokens_expires_at ON public.session_action_tokens (expires_at);

ALTER TABLE public.session_action_tokens ENABLE ROW LEVEL SECURITY;
-- Aucune policy = accès uniquement via service role (Edge Functions).

COMMENT ON TABLE public.session_action_tokens IS 'Tokens one-time pour liens Confirmer/Annuler dans le mail coach (issue #68).';

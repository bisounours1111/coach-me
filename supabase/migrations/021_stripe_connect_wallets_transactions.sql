-- Migration: Stripe Connect + Wallets/Transactions
-- Description: Ajoute stripe_connect_id aux profils et crée un suivi interne via wallets/transactions.

-- 1) Ajout du stripe_connect_id sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;

-- Optionnel mais utile : éviter 2 profils -> même compte Connect
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_connect_id_unique
  ON public.profiles(stripe_connect_id)
  WHERE stripe_connect_id IS NOT NULL;


-- 2) Table wallets (1 wallet par profil)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON public.wallets(profile_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_wallets'
  ) THEN
    CREATE TRIGGER set_updated_at_wallets
      BEFORE UPDATE ON public.wallets
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.wallets
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own wallet"
  ON public.wallets
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own wallet"
  ON public.wallets
  FOR UPDATE
  USING (auth.uid() = profile_id);


-- 3) Table transactions (ledger interne)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('credit', 'payout')),
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('pending', 'succeeded', 'failed')),

  -- Montants en devise majeure (EUR) pour cohérence avec sessions.price (NUMERIC)
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- IDs Stripe: payment_intent, transfer, payout, etc.
  stripe_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_id ON public.transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON public.transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Pas d'INSERT/UPDATE/DELETE côté client : uniquement via service role (Edge Functions)


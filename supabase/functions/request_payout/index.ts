import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getStripe } from "../_shared/stripe.ts";
import { getSupabaseAdmin, getUserIdFromAuthHeader } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getOrCreateWalletId(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, profileId: string) {
  const { data: existing } = await supabaseAdmin
    .from("wallets")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data: created, error: createError } = await supabaseAdmin
    .from("wallets")
    .insert({ profile_id: profileId, currency: "EUR" })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error("Impossible de créer le wallet");
  }

  return String(created.id);
}

function sumBalanceAmount(balanceItems: Array<{ amount: number; currency: string }>, currency: string): number {
  return balanceItems
    .filter((x) => String(x.currency).toLowerCase() === currency.toLowerCase())
    .reduce((acc, x) => acc + (typeof x.amount === "number" ? x.amount : 0), 0);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) throw new Error("Non authentifié");

    const { amountCents } = await req.json().catch(() => ({}));

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id")
      .eq("id", userId)
      .single();

    if (profileError) throw new Error("Impossible de lire le profil");
    if (!profile?.stripe_connect_id) throw new Error("Stripe Connect non configuré");

    const connectId = String(profile.stripe_connect_id);

    const balance = await stripe.balance.retrieve({ stripeAccount: connectId });
    const availableEur = sumBalanceAmount(balance.available || [], "eur");

    const requested = amountCents == null ? availableEur : Math.max(0, Math.floor(Number(amountCents)));
    if (!Number.isFinite(requested) || requested <= 0) {
      throw new Error("Montant de retrait invalide");
    }
    if (requested > availableEur) {
      throw new Error("Solde insuffisant");
    }

    const payout = await stripe.payouts.create(
      {
        amount: requested,
        currency: "eur",
      },
      { stripeAccount: connectId }
    );

    const walletId = await getOrCreateWalletId(supabaseAdmin, userId);

    await supabaseAdmin.from("transactions").insert({
      wallet_id: walletId,
      profile_id: userId,
      type: "payout",
      status: payout.status === "paid" ? "succeeded" : "pending",
      amount: (requested / 100).toFixed(2),
      fee: "0.00",
      currency: "EUR",
      stripe_id: payout.id,
    });

    return new Response(JSON.stringify({ payout }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


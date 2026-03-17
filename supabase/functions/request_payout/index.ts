import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getStripe } from "./_shared/stripe.ts";
import { getSupabaseAdmin, getUserIdFromAuthHeader } from "./_shared/supabase.ts";

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

function toCents(amountMajor: unknown): number {
  const n = typeof amountMajor === "number" ? amountMajor : Number(amountMajor);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

async function getWalletAvailableCents(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  profileId: string,
): Promise<number> {
  const walletId = await getOrCreateWalletId(supabaseAdmin, profileId);
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("type,status,amount")
    .eq("wallet_id", walletId);

  if (error) throw new Error("Impossible de lire les transactions");

  let credits = 0;
  let debits = 0;
  for (const t of data ?? []) {
    const status = String((t as any).status || "");
    if (status !== "succeeded" && status !== "pending") continue;

    const type = String((t as any).type || "");
    const cents = toCents((t as any).amount);
    if (type === "credit") credits += cents;
    if (type === "payout") debits += cents;
  }

  return Math.max(0, credits - debits);
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

    // Modèle "cagnotte interne": le solde vient de la DB, pas de la balance Stripe du compte connecté.
    const availableCents = await getWalletAvailableCents(supabaseAdmin, userId);

    const requested = amountCents == null
      ? availableCents
      : Math.max(0, Math.floor(Number(amountCents)));
    if (!Number.isFinite(requested) || requested <= 0) {
      throw new Error("Montant de retrait invalide");
    }
    if (requested > availableCents) {
      throw new Error("Solde insuffisant");
    }

    const walletId = await getOrCreateWalletId(supabaseAdmin, userId);

    // On transfère depuis la plateforme vers le compte Connect (cash-out).
    // Le compte Connect pourra ensuite payer vers la banque selon sa config.
    const transfer = await stripe.transfers.create({
      amount: requested,
      currency: "eur",
      destination: connectId,
      metadata: {
        profileId: userId,
      },
    });

    await supabaseAdmin.from("transactions").insert({
      wallet_id: walletId,
      profile_id: userId,
      type: "payout",
      status: transfer.reversed ? "failed" : "pending",
      amount: (requested / 100).toFixed(2),
      fee: "0.00",
      currency: "EUR",
      stripe_id: transfer.id,
    });

    return new Response(JSON.stringify({ transfer }), {
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


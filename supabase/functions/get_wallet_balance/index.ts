import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin, getUserIdFromAuthHeader } from "./_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toCents(amountMajor: unknown): number {
  const n = typeof amountMajor === "number" ? amountMajor : Number(amountMajor);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

async function getOrCreateWalletId(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  profileId: string,
) {
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) throw new Error("Non authentifié");

    const supabaseAdmin = getSupabaseAdmin();
    const walletId = await getOrCreateWalletId(supabaseAdmin, userId);

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("type,status,amount")
      .eq("wallet_id", walletId);

    if (error) throw new Error("Impossible de lire les transactions");

    let earnedCents = 0; // total revenus (crédits succeeded)
    let withdrawnCents = 0; // payouts succeeded
    let pendingPayoutCents = 0; // payouts pending
    for (const t of data ?? []) {
      const status = String((t as any).status || "");
      const type = String((t as any).type || "");
      const cents = toCents((t as any).amount);

      if (type === "credit" && status === "succeeded") {
        earnedCents += cents;
      }

      if (type === "payout" && status === "succeeded") {
        withdrawnCents += cents;
      }

      if (type === "payout" && status === "pending") {
        pendingPayoutCents += cents;
      }
    }

    const availableCents = Math.max(0, earnedCents - withdrawnCents - pendingPayoutCents);

    return new Response(
      JSON.stringify({
        walletId,
        currency: "EUR",
        earnedCents,
        withdrawnCents,
        pendingPayoutCents,
        availableCents,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


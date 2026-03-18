import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabaseAdmin,
  getUserIdFromAuthHeader,
} from "./_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const { data: txData, error } = await supabaseAdmin
      .from("transactions")
      .select("type,status,amount, stripe_id, session_id")
      .eq("wallet_id", walletId);

    if (error) throw new Error("Impossible de lire les transactions");

    // Récupérer les statuts des sessions séparément (plus fiable que la jointure PostgREST)
    const sessionIds = [...new Set((txData ?? []).map((t: any) => t.session_id).filter(Boolean))];
    const sessionStatusMap: Record<string, string> = {};
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabaseAdmin
        .from("sessions")
        .select("id, status")
        .in("id", sessionIds);
      for (const s of sessions ?? []) {
        sessionStatusMap[String((s as any).id)] = String((s as any).status || "");
      }
    }

    let earnedCents = 0;
    let withdrawnCents = 0;
    let pendingPayoutCents = 0;
    let refundCents = 0;

    for (const t of txData ?? []) {
      const status = String((t as any).status || "");
      const type = String((t as any).type || "");
      const cents = toCents((t as any).amount);
      const stripeId = String((t as any).stripe_id || "");
      const sessionStatus = (t as any).session_id
        ? sessionStatusMap[String((t as any).session_id)] ?? ""
        : "";

      if (type === "credit" && status === "succeeded") {
        if (sessionStatus !== "canceled") {
          earnedCents += cents;
        }
      }
      if (type === "payout") {
        const isRefund =
          stripeId.startsWith("refund_") ||
          stripeId.startsWith("manual_refund_") ||
          sessionStatus === "canceled";

        if (status === "succeeded") {
          if (isRefund) {
            refundCents += cents;
          } else {
            withdrawnCents += cents;
          }
        } else if (status === "pending" && !isRefund) {
          pendingPayoutCents += cents;
        }
      }
    }

    // Le solde disponible est : Revenus valides - Retraits confirmés - Retraits en attente - Remboursements effectués
    const availableCents = Math.max(
      0,
      earnedCents - withdrawnCents - pendingPayoutCents - refundCents,
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id")
      .eq("id", userId)
      .single();

    return new Response(
      JSON.stringify({
        walletId,
        currency: "EUR",
        earnedCents,
        withdrawnCents,
        pendingPayoutCents,
        availableCents,
        stripeConnectId: profile?.stripe_connect_id || null,
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

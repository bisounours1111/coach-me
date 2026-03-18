import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { getStripe } from "../_shared/stripe.ts";
import { verifySessionActionToken } from "../_shared/session_token.ts";

type ActionPayload = { session_id: string; action: "confirm" | "cancel" };

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Vérifie le token via la table session_action_tokens (one-time, ne dépend pas du secret). */
async function verifyDbSessionActionToken(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  token: string
): Promise<ActionPayload | null> {
  const tokenHash = await sha256Hex(token);
  const { data: row, error: fetchErr } = await supabase
    .from("session_action_tokens")
    .select("session_id, action")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();
  if (fetchErr || !row) return null;
  const { error: updateErr } = await supabase
    .from("session_action_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);
  if (updateErr) return null;
  return { session_id: row.session_id, action: row.action as "confirm" | "cancel" };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function appUrl(): string {
  const raw = (Deno.env.get("CLIENT_URL") || Deno.env.get("PUBLIC_APP_URL") || "").trim().replace(/\/$/, "");
  if (raw && !raw.includes("localhost")) return raw;
  return "https://coach-me-nine.vercel.app";
}

function htmlPage(title: string, message: string, linkText: string, linkHref: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:2rem auto;padding:1rem;text-align:center;">
  <h1>${title}</h1>
  <p>${message}</p>
  <p><a href="${linkHref}" style="color:#3b82f6;">${linkText}</a></p>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  let token = url.searchParams.get("token");
  if (!token) {
    return new Response(
      htmlPage("Lien invalide", "Paramètre token manquant.", "Retour à l'app", appUrl()),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }
  token = token.replace(/ /g, "+").trim();

  const supabase = getSupabaseAdmin();
  let payload: ActionPayload | null = await verifyDbSessionActionToken(supabase, token);
  if (!payload) {
    payload = await verifySessionActionToken(token);
  }
  if (!payload) {
    return new Response(
      htmlPage("Lien invalide ou expiré", "Ce lien a expiré ou a déjà été utilisé.", "Retour à l'app", appUrl()),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status, stripe_payment_intent_id")
    .eq("id", payload.session_id)
    .single();

  if (sessionError || !session) {
    return new Response(
      htmlPage("Session introuvable", "Cette session n'existe pas.", "Retour à l'app", appUrl()),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const redirectToApp = (result: "confirmed" | "canceled") =>
    new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: `${appUrl()}/session/action?result=${result}` },
    });

  if (payload.action === "confirm") {
    if (session.status !== "paid") {
      return new Response(
        htmlPage(
          "Déjà traitée",
          session.status === "upcoming" ? "Cette session a déjà été confirmée." : "Cette session n'est plus en attente de confirmation.",
          "Retour à l'app",
          appUrl()
        ),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "upcoming" })
      .eq("id", session.id);
    if (updateError) {
      console.error("session-action confirm update", updateError);
      return new Response(
        htmlPage("Erreur", "Impossible de confirmer la session.", "Retour à l'app", appUrl()),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    return redirectToApp("confirmed");
  }

  if (payload.action === "cancel") {
    if (session.status === "canceled") {
      return new Response(
        htmlPage("Déjà annulée", "Cette session a déjà été annulée.", "Retour à l'app", appUrl()),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "canceled" })
      .eq("id", session.id);
    if (updateError) {
      console.error("session-action cancel update", updateError);
      return new Response(
        htmlPage("Erreur", "Impossible d'annuler la session.", "Retour à l'app", appUrl()),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    if (session.stripe_payment_intent_id) {
      try {
        const stripe = getStripe();
        await stripe.refunds.create({ payment_intent: session.stripe_payment_intent_id });

        // Ledger interne: créer une transaction de débit pour annuler le crédit initial du coach
        // On récupère la transaction de crédit initiale pour avoir le montant exact (net)
        const { data: originalTx } = await supabase
          .from("transactions")
          .select("wallet_id, profile_id, amount, currency")
          .eq("session_id", session.id)
          .eq("type", "credit")
          .maybeSingle();

        if (originalTx) {
          await supabase.from("transactions").insert({
            wallet_id: originalTx.wallet_id,
            profile_id: originalTx.profile_id,
            session_id: session.id,
            type: "payout", // On utilise payout ou on pourrait créer un type 'refund'
            status: "succeeded",
            amount: originalTx.amount, // On débite le même montant net qui avait été crédité
            fee: "0.00",
            currency: originalTx.currency,
            stripe_id: `refund_${session.stripe_payment_intent_id}`,
          });
        }
      } catch (err) {
        console.error("session-action refund", (err as Error).message);
      }
    }
    return redirectToApp("canceled");
  }

  return new Response(
    htmlPage("Lien invalide", "Action inconnue.", "Retour à l'app", appUrl()),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
  );
});

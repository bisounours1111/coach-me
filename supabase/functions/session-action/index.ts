import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { getStripe } from "../_shared/stripe.ts";
import { verifySessionActionToken } from "../_shared/session_token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const appUrl = () =>
  (Deno.env.get("CLIENT_URL") || Deno.env.get("PUBLIC_APP_URL") || "http://localhost:3000").replace(/\/$/, "");

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
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response(
      htmlPage("Lien invalide", "Paramètre token manquant.", "Retour à l’app", appUrl()),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const payload = await verifySessionActionToken(token);
  if (!payload) {
    return new Response(
      htmlPage("Lien invalide ou expiré", "Ce lien a expiré ou a déjà été utilisé.", "Retour à l’app", appUrl()),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status, stripe_payment_intent_id")
    .eq("id", payload.session_id)
    .single();

  if (sessionError || !session) {
    return new Response(
      htmlPage("Session introuvable", "Cette session n’existe pas.", "Retour à l’app", appUrl()),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (payload.action === "confirm") {
    if (session.status !== "paid") {
      return new Response(
        htmlPage(
          "Déjà traitée",
          session.status === "upcoming" ? "Cette session a déjà été confirmée." : "Cette session n’est plus en attente de confirmation.",
          "Retour à l’app",
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
        htmlPage("Erreur", "Impossible de confirmer la session.", "Retour à l’app", appUrl()),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    return new Response(
      htmlPage(
        "Session confirmée",
        "Vous avez confirmé cette session. L’apprenti a été notifié par email.",
        "Retour au tableau de bord",
        `${appUrl()}/dashboard/coach`
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (payload.action === "cancel") {
    if (session.status === "canceled") {
      return new Response(
        htmlPage("Déjà annulée", "Cette session a déjà été annulée.", "Retour à l’app", appUrl()),
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
        htmlPage("Erreur", "Impossible d’annuler la session.", "Retour à l’app", appUrl()),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    if (session.stripe_payment_intent_id) {
      try {
        const stripe = getStripe();
        await stripe.refunds.create({ payment_intent: session.stripe_payment_intent_id });
      } catch (err) {
        console.error("session-action refund", (err as Error).message);
      }
    }
    return new Response(
      htmlPage(
        "Session annulée",
        "Vous avez annulé cette session. L’apprenti a été notifié et le paiement sera remboursé.",
        "Retour au tableau de bord",
        `${appUrl()}/dashboard/coach`
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return new Response(
    htmlPage("Lien invalide", "Action inconnue.", "Retour à l’app", appUrl()),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
  );
});

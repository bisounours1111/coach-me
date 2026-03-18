import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin, getUserIdFromAuthHeader } from "./_shared/supabase.ts";
import { getStripe } from "./_shared/stripe.ts";
import { verifySessionActionToken } from "./_shared/session_token.ts";

type ActionPayload = { session_id: string; action: "confirm" | "cancel" | "validate" };

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
  return {
    session_id: row.session_id,
    action: row.action as "confirm" | "cancel" | "validate",
  };
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

  const supabase = getSupabaseAdmin();
  const url = new URL(req.url);
  let token = url.searchParams.get("token");
  let payload: ActionPayload | null = null;
  let userId: string | null = null;

  // 1. Essayer par token (via email)
  if (token) {
    token = token.replace(/ /g, "+").trim();
    payload = await verifyDbSessionActionToken(supabase, token);
    if (!payload) {
      payload = await verifySessionActionToken(token);
    }
  } 
  // 2. Essayer par authentification (via app)
  else if (req.method === "POST") {
    userId = getUserIdFromAuthHeader(req);
    if (userId) {
      try {
        const body = await req.json();
        if (body.session_id && body.action) {
          payload = { session_id: body.session_id, action: body.action };
        }
      } catch (e) {
        console.error("Erreur lecture body POST", e);
      }
    }
  }

  if (!payload) {
    return new Response(
      token 
        ? htmlPage("Lien invalide ou expiré", "Ce lien a expiré ou a déjà été utilisé.", "Retour à l'app", appUrl())
        : JSON.stringify({ error: "Non autorisé ou paramètres manquants" }),
      { 
        status: token ? 400 : 401, 
        headers: { ...corsHeaders, "Content-Type": token ? "text/html; charset=utf-8" : "application/json" } 
      }
    );
  }

  // 3. Récupérer la session pour vérifier les droits et le statut actuel
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status, coach_id, student_id, stripe_payment_intent_id, slot_id")
    .eq("id", payload.session_id)
    .single();

  if (sessionError || !session) {
    return new Response(
      token 
        ? htmlPage("Session introuvable", "Cette session n'existe pas.", "Retour à l'app", appUrl())
        : JSON.stringify({ error: "Session introuvable" }),
      { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": token ? "text/html; charset=utf-8" : "application/json" } 
      }
    );
  }

  // Si appel authentifié (via l'app), vérifier si l'utilisateur a le droit
  if (userId) {
    // Le coach peut confirmer ou annuler
    // L'élève ne peut qu'annuler
    const { data: coachProfile } = await supabase
      .from("coachings")
      .select("profile_game_role_id")
      .eq("id", session.coach_id)
      .single();
    
    let coachUserId = null;
    if (coachProfile?.profile_game_role_id) {
      const { data: pgr } = await supabase
        .from("profile_game_roles")
        .select("profile_id")
        .eq("id", coachProfile.profile_game_role_id)
        .single();
      coachUserId = pgr?.profile_id;
    }

    const isCoach = userId === coachUserId;
    const isStudent = userId === session.student_id;

    if (!isCoach && !isStudent) {
      return new Response(JSON.stringify({ error: "Action non autorisée pour cet utilisateur" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "confirm" && !isCoach) {
      return new Response(JSON.stringify({ error: "Seul le coach peut confirmer la session" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "validate" && !isCoach) {
      return new Response(JSON.stringify({ error: "Seul le coach peut valider la session" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const respond = (
    status: number,
    success: boolean,
    message: string,
    result: "confirmed" | "canceled" | "validated" | "error",
  ) => {
    if (token) {
      if (success) return new Response(null, { status: 302, headers: { ...corsHeaders, Location: `${appUrl()}/session/action?result=${result}` } });
      return new Response(htmlPage("Erreur", message, "Retour à l'app", appUrl()), { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response(JSON.stringify({ success, message, result }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  };

  if (payload.action === "confirm") {
    if (session.status !== "paid" && session.status !== "pending") {
      return respond(
        200,
        false,
        "Cette session n'est plus en attente de confirmation.",
        session.status === "upcoming" ? "confirmed" : "error",
      );
    }

    // Slot: upcoming -> booked (verrouillé)
    if (session.slot_id) {
      const { data: slot } = await supabase
        .from("coach_availabilities")
        .select("status")
        .eq("id", session.slot_id)
        .maybeSingle();

      if (slot?.status === "canceled") {
        return respond(409, false, "Ce créneau a déjà été annulé.", "error");
      }
      if (slot?.status === "booked") {
        return respond(200, true, "Ce créneau est déjà confirmé.", "confirmed");
      }
      if (slot?.status !== "upcoming" && slot?.status !== "pending") {
        return respond(409, false, "Ce créneau n'est plus confirmable.", "error");
      }

      const { error: slotError } = await supabase
        .from("coach_availabilities")
        .update({ status: "booked" })
        .eq("id", session.slot_id);

      if (slotError) {
        console.error("session-action confirm slot", slotError);
        return respond(500, false, "Impossible de bloquer le créneau.", "error");
      }
    }

    // Session: paid -> upcoming (pour emails + cohérence historique)
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "upcoming" })
      .eq("id", session.id);
    
    if (updateError) {
      console.error("session-action confirm update", updateError);
      return respond(500, false, "Impossible de confirmer la session.", "error");
    }
    return respond(200, true, "Session confirmée avec succès.", "confirmed");
  }

  if (payload.action === "cancel") {
    if (session.status === "canceled") {
      return respond(200, true, "Cette session a déjà été annulée.", "canceled");
    }

    // Interdit si le créneau est déjà booked (confirmé par le coach)
    if (session.slot_id) {
      const { data: slot } = await supabase
        .from("coach_availabilities")
        .select("status")
        .eq("id", session.slot_id)
        .maybeSingle();
      if (slot?.status === "booked" || slot?.status === "confirmed") {
        return respond(
          409,
          false,
          "Cette réservation a déjà été confirmée par le coach et ne peut plus être annulée.",
          "error",
        );
      }
      // Autoriser seulement tant que upcoming/pending
      if (slot?.status && slot.status !== "upcoming" && slot.status !== "pending") {
        return respond(409, false, "Ce créneau ne peut plus être annulé.", "error");
      }
    }

    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "canceled" })
      .eq("id", session.id);
    
    if (updateError) {
      console.error("session-action cancel update", updateError);
      return respond(500, false, "Impossible d'annuler la session.", "error");
    }

    // Remboursement Stripe si paiement effectué
    if (session.stripe_payment_intent_id) {
      try {
        const stripe = getStripe();
        await stripe.refunds.create({ payment_intent: session.stripe_payment_intent_id });

        // Ledger interne: créer une transaction de débit pour annuler le crédit initial du coach
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
            type: "payout",
            status: "succeeded",
            amount: originalTx.amount,
            fee: "0.00",
            currency: originalTx.currency,
            stripe_id: `refund_${session.stripe_payment_intent_id}`,
          });
        }
      } catch (err) {
        console.error("session-action refund", (err as Error).message);
      }
    }

    // Slot: suppression du créneau (demandé par #92).
    // On fait d'abord un UPDATE en canceled (audit), puis on delete.
    if (session.slot_id) {
      await supabase
        .from("coach_availabilities")
        .update({ status: "canceled" })
        .eq("id", session.slot_id);

      const { error: delErr } = await supabase
        .from("coach_availabilities")
        .delete()
        .eq("id", session.slot_id);
      if (delErr) {
        console.error("session-action cancel delete slot", delErr);
      }
    }
    return respond(200, true, "Session annulée avec succès.", "canceled");
  }

  if (payload.action === "validate") {
    if (session.status !== "upcoming") {
      return respond(200, false, "Cette session n'est pas confirmée.", "error");
    }

    if (session.slot_id) {
      const { error: slotError } = await supabase
        .from("coach_availabilities")
        .update({ status: "confirmed" })
        .eq("id", session.slot_id);
      if (slotError) {
        console.error("session-action validate slot", slotError);
        return respond(500, false, "Impossible de valider le créneau.", "error");
      }
    }

    const { error: updateErr } = await supabase
      .from("sessions")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", session.id);
    if (updateErr) {
      console.error("session-action validate session", updateErr);
      return respond(500, false, "Impossible de valider la session.", "error");
    }

    return respond(200, true, "Créneau validé.", "validated");
  }

  return respond(400, false, "Action inconnue.", "error");
});

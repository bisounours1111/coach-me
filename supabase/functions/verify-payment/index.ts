import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID manquant");
    }

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      throw new Error("STRIPE_SECRET_KEY manquante côté Edge Function");
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new Error("Le paiement n'a pas été validé");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: existingSession } = await supabaseAdmin
      .from("sessions")
      .select("id,status,slot_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingSession) {
      if (existingSession.status === "paid") {
        return new Response(
          JSON.stringify({ success: true, alreadyProcessed: true }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
    }

    const { offerId, coachId, studentId, gameName, hourlyRate, slotId } =
      session.metadata || {};

    if (!slotId) {
      throw new Error("Slot ID manquant dans les métadonnées Stripe");
    }

    if (!offerId) {
      throw new Error(
        "offerId manquant dans les métadonnées Stripe (coachings.id attendu)",
      );
    }

    if (!studentId) {
      throw new Error("studentId manquant dans les métadonnées Stripe");
    }

    const finalSlotId = existingSession?.slot_id || slotId;
    if (!finalSlotId) {
      throw new Error("slotId manquant (metadata Stripe ou session pending)");
    }

    // 1. Récupérer les détails du créneau
    const { data: slot, error: slotError } = await supabaseAdmin
      .from("coach_availabilities")
      .select("start_at, end_at")
      .eq("id", finalSlotId)
      .single();

    if (slotError || !slot) {
      console.error("Slot error:", slotError);
      throw new Error("Créneau introuvable dans la base de données");
    }

    // 2. Créer ou finaliser la session (idempotent)
    if (existingSession) {
      const { error: updateError } = await supabaseAdmin
        .from("sessions")
        .update({
          // NB: coach_id référence public.coachings(id) (pas profiles / coaches)
          coach_id: offerId,
          student_id: studentId,
          slot_id: finalSlotId,
          game: gameName,
          price: parseFloat(hourlyRate || "0"),
          // Transaction validée (Stripe payé), mais réservation en attente côté créneau
          status: "paid",
          stripe_payment_status: session.payment_status,
          start_at: slot.start_at,
          end_at: slot.end_at,
          duration_minutes: 60,
        })
        .eq("id", existingSession.id);

      if (updateError) {
        console.error("Update session error:", updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("sessions")
        .insert({
          // NB: coach_id référence public.coachings(id) (pas profiles / coaches)
          coach_id: offerId,
          student_id: studentId,
          slot_id: finalSlotId,
          game: gameName,
          price: parseFloat(hourlyRate || "0"),
          status: "paid",
          stripe_session_id: sessionId,
          stripe_payment_status: session.payment_status,
          start_at: slot.start_at,
          end_at: slot.end_at,
          duration_minutes: 60,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    // 3. Marquer le créneau comme "upcoming" (en attente de confirmation du coach)
    const { error: updateSlotError } = await supabaseAdmin
      .from("coach_availabilities")
      .update({ status: "upcoming" })
      .eq("id", slotId);

    if (updateSlotError) {
      console.error("Update slot error:", updateSlotError);
      throw updateSlotError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Verify payment error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

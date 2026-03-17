import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getUserIdFromAuthHeader(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1];
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadJson = atob(parts[1]);
    const payload = JSON.parse(payloadJson);
    return typeof payload?.sub === "string" && payload.sub.trim() ? payload.sub : null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      throw new Error("STRIPE_SECRET_KEY manquante côté Edge Function");
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { coachId, offerId, gameName, hourlyRate, studentId, slotId } = await req.json();
    const resolvedStudentId = studentId ?? getUserIdFromAuthHeader(req);

    const missing =
      coachId == null ||
      offerId == null ||
      hourlyRate == null ||
      slotId == null ||
      resolvedStudentId == null ||
      String(coachId).trim() === "" ||
      String(offerId).trim() === "" ||
      String(slotId).trim() === "" ||
      String(resolvedStudentId).trim() === "";

    const rate = Number(hourlyRate);
    if (missing || !Number.isFinite(rate) || rate <= 0) {
      throw new Error("Paramètres manquants (coachId, offerId, hourlyRate, studentId ou slotId)");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes côté Edge Function");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Session de coaching ${gameName}`,
              description: `Coaching avec un expert sur CoachMe`,
            },
            unit_amount: Math.round(rate * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${Deno.env.get("CLIENT_URL")}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get("CLIENT_URL")}/profile/${coachId}`,
      metadata: {
        coachId: String(coachId),
        offerId: String(offerId),
        gameName: gameName ? String(gameName) : "",
        studentId: String(resolvedStudentId),
        slotId: String(slotId),
        hourlyRate: String(rate),
      },
    });

    // Créer une session "pending" dès la création du checkout (trace DB + lien au créneau)
    const { data: slot, error: slotError } = await supabaseAdmin
      .from("coach_availabilities")
      .select("start_at, end_at")
      .eq("id", String(slotId))
      .single();

    if (slotError || !slot) {
      throw new Error("Créneau introuvable (slotId) au moment de créer la session pending");
    }

    const { error: insertError } = await supabaseAdmin.from("sessions").insert({
      coach_id: String(offerId), // FK -> coachings.id
      student_id: String(resolvedStudentId),
      slot_id: String(slotId),
      game: gameName ? String(gameName) : null,
      price: rate,
      status: "pending",
      stripe_session_id: session.id,
      stripe_payment_status: session.payment_status,
      start_at: slot.start_at,
      end_at: slot.end_at,
      duration_minutes: 60,
    });

    if (insertError) {
      // Si déjà insérée (retry) on laisse passer, sinon on bloque
      if (!String(insertError.message || "").toLowerCase().includes("duplicate key")) {
        throw new Error(`Erreur DB lors de l'insertion pending: ${insertError.message}`);
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

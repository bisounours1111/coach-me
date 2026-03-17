import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getStripe } from "./_shared/stripe.ts";
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

async function resolveCoachProfileId(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  offerId: string,
) {
  const { data: coaching, error: coachingError } = await supabaseAdmin
    .from("coachings")
    .select("profile_game_role_id")
    .eq("id", offerId)
    .single();

  if (coachingError || !coaching?.profile_game_role_id) {
    throw new Error("Offre introuvable (offerId / coachings.id)");
  }

  const { data: pgr, error: pgrError } = await supabaseAdmin
    .from("profile_game_roles")
    .select("profile_id")
    .eq("id", coaching.profile_game_role_id)
    .single();

  if (pgrError || !pgr?.profile_id) {
    throw new Error(
      "Impossible de résoudre le coach (profile_game_roles.profile_id)",
    );
  }

  return String(pgr.profile_id);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    const { coachId, offerId, gameName, hourlyRate, studentId, slotId } =
      await req.json();
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
      throw new Error(
        "Paramètres manquants (coachId, offerId, hourlyRate, studentId ou slotId)",
      );
    }

    const coachProfileId = await resolveCoachProfileId(
      supabaseAdmin,
      String(offerId),
    );

    const { data: coachProfile, error: coachProfileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id")
      .eq("id", coachProfileId)
      .single();

    if (coachProfileError) {
      throw new Error("Impossible de lire le profil coach (profiles)");
    }

    const connectId = coachProfile?.stripe_connect_id
      ? String(coachProfile.stripe_connect_id)
      : null;
    if (!connectId) {
      throw new Error(
        "Ce coach n'a pas finalisé Stripe Connect (stripe_connect_id manquant)",
      );
    }

    // NOTE: Modèle "cagnotte interne": on encaisse sur la plateforme (Checkout standard),
    // puis on crédite le wallet interne du coach lors de `verify_payment`.
    // Stripe Connect n'est requis qu'au moment du retrait (cash-out), pas au paiement.

    const successUrl =
      Deno.env.get("STRIPE_SUCCESS_URL") ||
      `${Deno.env.get("CLIENT_URL")}/booking/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      Deno.env.get("STRIPE_CANCEL_URL") ||
      `${Deno.env.get("CLIENT_URL")}/profile/${coachId}`;

    if (!successUrl.includes("{CHECKOUT_SESSION_ID}")) {
      throw new Error("STRIPE_SUCCESS_URL doit contenir {CHECKOUT_SESSION_ID}");
    }

    const amountCents = Math.round(rate * 100);

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
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        coachId: String(coachId),
        offerId: String(offerId),
        coachProfileId,
        gameName: gameName ? String(gameName) : "",
        studentId: String(resolvedStudentId),
        slotId: String(slotId),
        hourlyRate: String(rate),
      },
    });

    const { data: slot, error: slotError } = await supabaseAdmin
      .from("coach_availabilities")
      .select("start_at, end_at")
      .eq("id", String(slotId))
      .single();

    if (slotError || !slot) {
      throw new Error(
        "Créneau introuvable (slotId) au moment de créer la session pending",
      );
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
      if (
        !String(insertError.message || "")
          .toLowerCase()
          .includes("duplicate key")
      ) {
        throw new Error(
          `Erreur DB lors de l'insertion pending: ${insertError.message}`,
        );
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { computeFeeAmountCents, getPlatformFeeBps, getStripe } from "./_shared/stripe.ts";
import { getSupabaseAdmin } from "./_shared/supabase.ts";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID manquant");

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      throw new Error("Le paiement n'a pas été validé");
    }

    const paymentIntent = session.payment_intent;
    const paymentIntentId =
      typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ? String(paymentIntent.id) : null;

    const metadata = session.metadata || {};
    const offerId = metadata.offerId;
    const studentId = metadata.studentId;
    const gameName = metadata.gameName;
    const hourlyRate = metadata.hourlyRate;
    const slotId = metadata.slotId;
    const coachProfileId = metadata.coachProfileId;

    if (!slotId) throw new Error("Slot ID manquant dans les métadonnées Stripe");
    if (!offerId) throw new Error("offerId manquant dans les métadonnées Stripe (coachings.id attendu)");
    if (!studentId) throw new Error("studentId manquant dans les métadonnées Stripe");
    if (!coachProfileId) throw new Error("coachProfileId manquant dans les métadonnées Stripe");

    const { data: existingSession } = await supabaseAdmin
      .from("sessions")
      .select("id,status,slot_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingSession?.status === "paid") {
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: slot, error: slotError } = await supabaseAdmin
      .from("coach_availabilities")
      .select("start_at, end_at")
      .eq("id", existingSession?.slot_id || slotId)
      .single();

    if (slotError || !slot) {
      throw new Error("Créneau introuvable dans la base de données");
    }

    const price = parseFloat(hourlyRate || "0");

    let sessionRowId: string | null = existingSession?.id ? String(existingSession.id) : null;

    if (existingSession) {
      const { error: updateError } = await supabaseAdmin
        .from("sessions")
        .update({
          coach_id: offerId,
          student_id: studentId,
          slot_id: existingSession.slot_id || slotId,
          game: gameName,
          price,
          status: "paid",
          stripe_payment_status: session.payment_status,
          stripe_payment_intent_id: paymentIntentId,
          start_at: slot.start_at,
          end_at: slot.end_at,
          duration_minutes: 60,
        })
        .eq("id", existingSession.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseAdmin.from("sessions").insert({
        coach_id: offerId,
        student_id: studentId,
        slot_id: slotId,
        game: gameName,
        price,
        status: "paid",
        stripe_session_id: sessionId,
        stripe_payment_status: session.payment_status,
        stripe_payment_intent_id: paymentIntentId,
        start_at: slot.start_at,
        end_at: slot.end_at,
        duration_minutes: 60,
      });

      if (insertError) throw insertError;

      const { data: inserted } = await supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      sessionRowId = inserted?.id ? String(inserted.id) : null;
    }

    const { error: updateSlotError } = await supabaseAdmin
      .from("coach_availabilities")
      // upcoming = en attente de confirmation coach
      .update({ status: "upcoming" })
      .eq("id", slotId);

    if (updateSlotError) throw updateSlotError;

    // Ledger interne: créditer le wallet du coach (net après commission)
    const amountCents = typeof session.amount_total === "number" ? session.amount_total : Math.round(price * 100);
    const feeBps = getPlatformFeeBps();
    const feeCents = computeFeeAmountCents(amountCents, feeBps);
    const netCents = Math.max(0, amountCents - feeCents);

    const walletId = await getOrCreateWalletId(supabaseAdmin, String(coachProfileId));

    await supabaseAdmin.from("transactions").insert({
      wallet_id: walletId,
      profile_id: String(coachProfileId),
      session_id: sessionRowId,
      type: "credit",
      status: "succeeded",
      amount: (netCents / 100).toFixed(2),
      fee: (feeCents / 100).toFixed(2),
      currency: "EUR",
      stripe_id: paymentIntentId,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Verify payment error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});


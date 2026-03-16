import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    throw createError({ statusCode: 503, message: "Stripe non configuré" });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
  const sig = getHeader(event, "stripe-signature");
  const rawBody = await readRawBody(event);

  if (!sig || !rawBody) {
    throw createError({ statusCode: 400, message: "Signature manquante" });
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    throw createError({ statusCode: 400, message: "Signature invalide" });
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const { coaching_id, profile_id, game_name } = session.metadata ?? {};

    if (!coaching_id || !profile_id) return { received: true };

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );

    // Récupérer l'ID de l'élève depuis l'email Stripe
    let studentId: string | null = null;
    if (session.customer_email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", session.customer_email)
        .single();
      studentId = profile?.id ?? null;
    }

    if (!studentId) return { received: true };

    // Créer la session en base
    await supabase.from("sessions").insert({
      coach_id: coaching_id,
      student_id: studentId,
      status: "upcoming",
      price: (session.amount_total ?? 0) / 100,
      currency: session.currency?.toUpperCase() ?? "EUR",
      game: game_name ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      stripe_payment_status: "paid",
      start_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 jours par défaut
      duration_minutes: 60,
    });
  }

  return { received: true };
});

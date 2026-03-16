import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw createError({
      statusCode: 503,
      message: "Stripe non configuré. Ajoutez STRIPE_SECRET_KEY dans .env",
    });
  }

  const body = await readBody(event);
  const { coachingId, profileId, gameName } = body as {
    coachingId: string;
    profileId: string;
    gameName: string;
  };

  if (!coachingId || !profileId) {
    throw createError({ statusCode: 400, message: "Paramètres manquants" });
  }

  // Récupérer l'offre de coaching depuis Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const { data: coaching, error } = await supabase
    .from("coachings")
    .select(
      "id, hourly_rate, description, profile_game_roles(profiles(id, full_name))",
    )
    .eq("id", coachingId)
    .single();

  if (error || !coaching) {
    throw createError({ statusCode: 404, message: "Offre introuvable" });
  }

  if (!coaching.hourly_rate) {
    throw createError({
      statusCode: 400,
      message: "Cette offre n'a pas de tarif défini",
    });
  }

  const coachName =
    (coaching as any).profile_game_roles?.profiles?.full_name || "Coach";
  const priceInCents = Math.round(coaching.hourly_rate * 100);
  const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: priceInCents,
          product_data: {
            name: `Session de coaching ${gameName} avec ${coachName}`,
            description: coaching.description || undefined,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      coaching_id: coachingId,
      profile_id: profileId,
      game_name: gameName,
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/profile/${profileId}`,
  });

  return { url: session.url };
});

import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";

export function getStripe(): Stripe {
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecret) {
    throw new Error("STRIPE_SECRET_KEY manquante côté Edge Function");
  }

  return new Stripe(stripeSecret, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  });
}


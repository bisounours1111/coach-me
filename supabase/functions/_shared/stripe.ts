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

export function getPlatformFeeBps(): number {
  const raw = Deno.env.get("STRIPE_PLATFORM_FEE_BPS")?.trim();
  if (!raw) return 1500; // 15%
  const bps = Number(raw);
  if (!Number.isFinite(bps) || bps < 0 || bps > 10_000) {
    throw new Error("STRIPE_PLATFORM_FEE_BPS invalide (0..10000)");
  }
  return Math.round(bps);
}

export function computeFeeAmountCents(totalAmountCents: number, feeBps: number): number {
  return Math.round((totalAmountCents * feeBps) / 10_000);
}


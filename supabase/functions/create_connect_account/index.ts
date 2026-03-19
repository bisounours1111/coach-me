import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getStripe } from "../_shared/stripe.ts";
import { getSupabaseAdmin, getUserIdFromAuthHeader } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getUrl(name: "STRIPE_CONNECT_REFRESH_URL" | "STRIPE_CONNECT_RETURN_URL", fallback: string) {
  const v = Deno.env.get(name)?.trim();
  return v && v.length > 0 ? v : fallback;
}

function getClientBaseUrl(): string {
  const direct = Deno.env.get("CLIENT_URL")?.trim();
  if (direct) return direct;

  const success = Deno.env.get("STRIPE_SUCCESS_URL")?.trim();
  if (!success) {
    throw new Error("CLIENT_URL manquante (ou STRIPE_SUCCESS_URL pour fallback)");
  }
  try {
    const u = new URL(success);
    return `${u.protocol}//${u.host}`;
  } catch {
    throw new Error("STRIPE_SUCCESS_URL invalide (fallback CLIENT_URL)");
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) throw new Error("Non authentifié");

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    const clientUrl = getClientBaseUrl();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,stripe_connect_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) throw new Error("Profil introuvable");

    const { return_url } = await req.json().catch(() => ({}));

    let connectId = profile.stripe_connect_id ? String(profile.stripe_connect_id) : null;

    if (!connectId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
        },
      });

      connectId = account.id;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_connect_id: connectId })
        .eq("id", userId);

      if (updateError) throw new Error("Impossible de sauvegarder stripe_connect_id");
    }

    const refreshUrl = getUrl("STRIPE_CONNECT_REFRESH_URL", return_url || `${clientUrl}/dashboard/coach/wallet?onboarding=refresh`);
    const finalReturnUrl = getUrl("STRIPE_CONNECT_RETURN_URL", return_url || `${clientUrl}/dashboard/coach/wallet?onboarding=success`);

    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: refreshUrl,
      return_url: finalReturnUrl,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url, stripe_connect_id: connectId }), {
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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getStripe } from "../_shared/stripe.ts";
import { getSupabaseAdmin, getUserIdFromAuthHeader } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) throw new Error("Non authentifié");

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id")
      .eq("id", userId)
      .single();

    if (profileError) throw new Error("Impossible de lire le profil");
    if (!profile?.stripe_connect_id) throw new Error("Stripe Connect non configuré");

    const balance = await stripe.balance.retrieve({
      stripeAccount: String(profile.stripe_connect_id),
    });

    return new Response(JSON.stringify({ balance }), {
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


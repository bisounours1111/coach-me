import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_URL = "https://api.resend.com/emails";

function getEmailFrom(): string {
  const from = Deno.env.get("EMAIL_FROM");
  if (from) return from;
  return "Coach-me <onboarding@resend.dev>";
}

async function sendResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ id?: string; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { error: "RESEND_API_KEY manquante" };

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: data?.message || data?.error || String(res.status) };
  }
  return { id: data?.id };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as { email?: string };
    const email = body?.email?.trim();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "email requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // URL de l'app pour le redirect après reset : jamais localhost en prod (sinon le lien du mail renvoie vers localhost)
    const fromClient = (Deno.env.get("CLIENT_URL") || "").trim().replace(/\/$/, "");
    const fromPublic = (Deno.env.get("PUBLIC_APP_URL") || "").trim().replace(/\/$/, "");
    const appUrl =
      (fromClient && !fromClient.includes("localhost") ? fromClient : null) ??
      (fromPublic && !fromPublic.includes("localhost") ? fromPublic : null) ??
      "https://coach-me-nine.vercel.app";
    const redirectTo = `${appUrl}/auth/reset`;

    const supabase = getSupabaseAdmin();
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkError) {
      console.error("generateLink recovery", linkError.message);
      return new Response(
        JSON.stringify({
          message:
            "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const actionLink =
      (linkData?.properties as { action_link?: string } | undefined)?.action_link ?? null;

    if (!actionLink) {
      return new Response(
        JSON.stringify({
          message:
            "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const privacyUrl = `${appUrl.replace(/\/$/, "")}/privacy`;
    const html = `
      <h2>Réinitialisation de votre mot de passe</h2>
      <p>Vous avez demandé à réinitialiser votre mot de passe sur Coach-me.</p>
      <p><a href="${actionLink}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;">Définir un nouveau mot de passe</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      <p style="color:#888;font-size:12px;margin-top:24px;">Conformément au RGPD, vos données sont utilisées pour cette communication. <a href="${privacyUrl}">Politique de confidentialité</a>.</p>
    `;

    const { id: providerId, error: sendError } = await sendResend(
      email,
      "Réinitialisation de votre mot de passe – Coach-me",
      html,
    );

    await supabase.from("email_events").insert({
      session_id: null,
      event_type: "password_recovery",
      to_email: email,
      payload: {},
      provider: "resend",
      provider_id: providerId ?? null,
      sent_at: sendError ? null : new Date().toISOString(),
      error: sendError ?? null,
    });

    return new Response(
      JSON.stringify({
        message:
          "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-password-recovery", (err as Error).message);
    return new Response(
      JSON.stringify({
        message:
          "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

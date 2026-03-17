import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_URL = "https://api.resend.com/emails";

type SessionPayload = {
  session_id: string;
  old_status: string;
  new_status: string;
};

function getEmailFrom(): string {
  const from = Deno.env.get("EMAIL_FROM");
  if (from) return from;
  return "Coach-me <onboarding@resend.dev>";
}

function buildSessionPayload(session: Record<string, unknown>, student: { full_name?: string | null; email?: string | null }, coach: { full_name?: string | null; email?: string | null }): Record<string, unknown> {
  const startAt = session.start_at as string | undefined;
  const formatted = startAt
    ? new Date(startAt).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
    : "";
  return {
    start_at: formatted,
    duration_minutes: session.duration_minutes ?? 60,
    game: session.game ?? "",
    price: session.price,
    currency: session.currency ?? "EUR",
    student_name: student?.full_name ?? "Élève",
    coach_name: coach?.full_name ?? "Coach",
  };
}

function htmlFooter(): string {
  const baseUrl =
    Deno.env.get("CLIENT_URL") ||
    Deno.env.get("PUBLIC_APP_URL") ||
    "";
  const privacyUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/privacy` : "#";
  return `<p style="color:#888;font-size:12px;margin-top:24px;">Conformément au RGPD, vos données sont utilisées pour cette communication. <a href="${privacyUrl}">Politique de confidentialité</a>.</p>`;
}

function buildConfirmationHtml(payload: Record<string, unknown>, isCoach: boolean): string {
  const who = isCoach ? "Un élève a réservé une session avec vous." : "Votre réservation est confirmée.";
  return `
    <h2>Session de coaching confirmée</h2>
    <p>${who}</p>
    <ul>
      <li><strong>Date / heure :</strong> ${payload.start_at}</li>
      <li><strong>Durée :</strong> ${payload.duration_minutes} min</li>
      <li><strong>Jeu :</strong> ${payload.game}</li>
      <li><strong>Tarif :</strong> ${payload.price} ${payload.currency}</li>
    </ul>
    ${htmlFooter()}
  `;
}

function buildCanceledHtml(payload: Record<string, unknown>, isCoach: boolean): string {
  const who = isCoach ? "Une session avec un élève a été annulée." : "Votre session de coaching a été annulée.";
  return `
    <h2>Session annulée</h2>
    <p>${who}</p>
    <p>Session prévue le ${payload.start_at} (${payload.game}).</p>
    ${htmlFooter()}
  `;
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

  const secret = req.headers.get("x-webhook-secret");
  const expected = Deno.env.get("EMAIL_WEBHOOK_SECRET");
  if (expected && secret !== expected) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = (await req.json()) as SessionPayload;
    const { session_id, new_status } = body;
    if (!session_id || !new_status) {
      throw new Error("session_id et new_status requis");
    }

    const supabase = getSupabaseAdmin();

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, coach_id, student_id, start_at, duration_minutes, game, price, currency")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      throw new Error("Session introuvable");
    }

    const { data: student } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", session.student_id)
      .single();

    const { data: coaching } = await supabase
      .from("coachings")
      .select("profile_game_role_id")
      .eq("id", session.coach_id)
      .single();

    let coachProfile: { email?: string | null; full_name?: string | null } = {};
    if (coaching?.profile_game_role_id) {
      const { data: pgr } = await supabase
        .from("profile_game_roles")
        .select("profile_id")
        .eq("id", coaching.profile_game_role_id)
        .single();
      if (pgr?.profile_id) {
        const { data: coachRow } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", pgr.profile_id)
          .single();
        coachProfile = coachRow ?? {};
      }
    }

    const studentEmail = student?.email?.trim();
    const coachEmail = coachProfile?.email?.trim();
    if (!studentEmail && !coachEmail) {
      return new Response(
        JSON.stringify({ ok: true, message: "Aucun email à envoyer" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = buildSessionPayload(
      session as Record<string, unknown>,
      student ?? {},
      coachProfile,
    );

    const events: { event_type: string; to_email: string; subject: string; html: string }[] = [];

    if (new_status === "paid" || new_status === "upcoming") {
      if (studentEmail) {
        events.push({
          event_type: "session_paid_student",
          to_email: studentEmail,
          subject: "Réservation confirmée – Coach-me",
          html: buildConfirmationHtml(payload, false),
        });
      }
      if (coachEmail) {
        events.push({
          event_type: "session_paid_coach",
          to_email: coachEmail,
          subject: "Nouvelle réservation – Coach-me",
          html: buildConfirmationHtml(payload, true),
        });
      }
    } else if (new_status === "canceled") {
      if (studentEmail) {
        events.push({
          event_type: "session_canceled_student",
          to_email: studentEmail,
          subject: "Session annulée – Coach-me",
          html: buildCanceledHtml(payload, false),
        });
      }
      if (coachEmail) {
        events.push({
          event_type: "session_canceled_coach",
          to_email: coachEmail,
          subject: "Session annulée – Coach-me",
          html: buildCanceledHtml(payload, true),
        });
      }
    }

    for (const ev of events) {
      const { error: insertErr } = await supabase.from("email_events").insert({
        session_id: session_id,
        event_type: ev.event_type,
        to_email: ev.to_email,
        payload: payload,
        provider: "resend",
      });
      const isConflict = (insertErr as { code?: string } | null)?.code === "23505";
      if (insertErr && !isConflict) {
        console.error("email_events insert", insertErr);
      }
    }

    const { data: pending } = await supabase
      .from("email_events")
      .select("id, event_type, to_email")
      .eq("session_id", session_id)
      .is("sent_at", null);

    const eventMap = new Map(events.map((e) => [e.event_type, e]));
    const sent: string[] = [];

    for (const row of pending ?? []) {
      const ev = eventMap.get(row.event_type);
      if (!ev) continue;

      const { id: providerId, error: sendError } = await sendResend(
        row.to_email,
        ev.subject,
        ev.html,
      );

      if (sendError) {
        await supabase
          .from("email_events")
          .update({ error: sendError })
          .eq("id", row.id);
        continue;
      }

      await supabase
        .from("email_events")
        .update({
          provider_id: providerId ?? null,
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);

      sent.push(row.event_type);
    }

    return new Response(
      JSON.stringify({ ok: true, sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-session-emails", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

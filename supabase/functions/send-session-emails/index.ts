import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { generateSessionActionToken } from "../_shared/session_token.ts";

const TOKEN_EXPIRY_DAYS = 7;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomBase64url(bytesLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(bytesLength));
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Génère un token one-time stocké en DB (ne dépend pas du secret partagé). */
async function generateDbSessionActionToken(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sessionId: string,
  action: "confirm" | "cancel"
): Promise<string> {
  const plainToken = randomBase64url(32);
  const tokenHash = await sha256Hex(plainToken);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("session_action_tokens").upsert(
    { session_id: sessionId, action, token_hash: tokenHash, expires_at: expiresAt },
    { onConflict: "session_id,action" }
  );
  if (error) throw new Error(error.message);
  return plainToken;
}

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

/** URL de l'app pour les liens dans les emails. N'utilise jamais localhost (évite spam / avertissements Resend). */
function getAppUrl(): string {
  const raw = (Deno.env.get("CLIENT_URL") || Deno.env.get("PUBLIC_APP_URL") || "").trim().replace(/\/$/, "");
  if (raw && !raw.includes("localhost")) return raw;
  const fallback = (Deno.env.get("PUBLIC_APP_URL") || "").trim().replace(/\/$/, "");
  return fallback && !fallback.includes("localhost") ? fallback : "";
}

function buildSessionPayload(
  session: Record<string, unknown>,
  student: { full_name?: string | null; email?: string | null },
  coach: { full_name?: string | null; email?: string | null }
): Record<string, unknown> {
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
    student_email: student?.email ?? "",
    coach_name: coach?.full_name ?? "Coach",
  };
}

function htmlFooter(): string {
  const privacyUrl = getAppUrl() ? `${getAppUrl()}/privacy` : "#";
  return `<p style="color:#888;font-size:12px;margin-top:24px;">Conformément au RGPD, vos données sont utilisées pour cette communication. <a href="${privacyUrl}">Politique de confidentialité</a>.</p>`;
}

/** Mail apprenti quand le paiement est reçu (en attente de confirmation du coach) */
function buildStudentPaidHtml(payload: Record<string, unknown>): string {
  return `
    <h2>Réservation reçue</h2>
    <p>Votre réservation a bien été enregistrée et est en attente de confirmation par le coach.</p>
    <ul>
      <li><strong>Date / heure :</strong> ${payload.start_at}</li>
      <li><strong>Durée :</strong> ${payload.duration_minutes} min</li>
      <li><strong>Jeu :</strong> ${payload.game}</li>
      <li><strong>Tarif :</strong> ${payload.price} ${payload.currency}</li>
      <li><strong>Coach :</strong> ${payload.coach_name}</li>
    </ul>
    <p><strong>Le coach te contactera le jour de ta session sur le chat de l’application.</strong></p>
    <p>Tu recevras un email de confirmation une fois que le coach aura accepté la session.</p>
    ${htmlFooter()}
  `;
}

/** Mail coach quand une réservation est payée : infos + élève + liens confirmer / annuler */
function buildCoachPaidHtml(
  payload: Record<string, unknown>,
  confirmUrl: string,
  cancelUrl: string
): string {
  return `
    <h2>Nouvelle réservation</h2>
    <p>Un élève a réservé une session avec vous.</p>
    <ul>
      <li><strong>Date / heure :</strong> ${payload.start_at}</li>
      <li><strong>Durée :</strong> ${payload.duration_minutes} min</li>
      <li><strong>Jeu :</strong> ${payload.game}</li>
      <li><strong>Tarif :</strong> ${payload.price} ${payload.currency}</li>
      <li><strong>Apprenti :</strong> ${payload.student_name}</li>
      <li><strong>Email apprenti :</strong> ${payload.student_email}</li>
    </ul>
    <p><strong>Confirmer ou annuler la session :</strong></p>
    <p style="margin:20px 0;">
      <a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;background:#0d9488;color:#fff;text-decoration:none;border-radius:12px;margin-right:12px;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(13,148,136,0.3);">Confirmer la session</a>
      <a href="${cancelUrl}" style="display:inline-block;padding:14px 28px;background:transparent;color:#94a3b8;text-decoration:none;border-radius:12px;border:2px solid #475569;font-weight:600;font-size:15px;">Annuler la session</a>
    </p>
    <p style="color:#666;font-size:14px;">En annulant, l’apprenti sera notifié et le paiement sera remboursé.</p>
    ${htmlFooter()}
  `;
}

/** Mail apprenti quand le coach a confirmé (status → upcoming) */
function buildStudentUpcomingHtml(payload: Record<string, unknown>): string {
  return `
    <h2>Session confirmée par le coach</h2>
    <p>Le coach ${payload.coach_name} a confirmé votre session.</p>
    <ul>
      <li><strong>Date / heure :</strong> ${payload.start_at}</li>
      <li><strong>Durée :</strong> ${payload.duration_minutes} min</li>
      <li><strong>Jeu :</strong> ${payload.game}</li>
    </ul>
    <p><strong>Le coach te contactera le jour de la session sur le chat de l’application.</strong></p>
    ${htmlFooter()}
  `;
}

/** Mail coach quand il a confirmé (récap) */
function buildCoachUpcomingHtml(payload: Record<string, unknown>): string {
  return `
    <h2>Session confirmée</h2>
    <p>Vous avez confirmé la session avec ${payload.student_name}.</p>
    <ul>
      <li><strong>Date / heure :</strong> ${payload.start_at}</li>
      <li><strong>Jeu :</strong> ${payload.game}</li>
    </ul>
    ${htmlFooter()}
  `;
}

function buildCanceledHtml(payload: Record<string, unknown>, isCoach: boolean): string {
  const who = isCoach
    ? "Une session avec un élève a été annulée."
    : "Votre session de coaching a été annulée.";
  return `
    <h2>Session annulée</h2>
    <p>${who}</p>
    <p>Session prévue le ${payload.start_at} (${payload.game}).</p>
    ${htmlFooter()}
  `;
}

/** Mail apprenti quand le coach annule (session non confirmée + remboursement) */
function buildStudentCanceledByCoachHtml(payload: Record<string, unknown>): string {
  return `
    <h2>Session non confirmée</h2>
    <p>Le coach n’a pas pu confirmer votre session prévue le ${payload.start_at} (${payload.game}).</p>
    <p><strong>Votre paiement a été remboursé.</strong></p>
    <p>Tu peux réserver une autre session avec un autre coach sur l’application.</p>
    ${htmlFooter()}
  `;
}

async function sendResend(
  to: string,
  subject: string,
  html: string
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
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as SessionPayload;
    const { session_id, new_status, old_status } = body;
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
        if (!coachProfile?.email?.trim()) {
          const { data: authUser } = await supabase.auth.admin.getUserById(pgr.profile_id);
          if (authUser?.user?.email) {
            coachProfile = { ...coachProfile, email: authUser.user.email, full_name: coachProfile?.full_name ?? authUser.user.user_metadata?.full_name };
          }
        }
      }
    }

    const studentEmail = student?.email?.trim();
    const coachEmail = coachProfile?.email?.trim();
    if (!studentEmail && !coachEmail) {
      return new Response(
        JSON.stringify({ ok: true, message: "Aucun email à envoyer" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = buildSessionPayload(
      session as Record<string, unknown>,
      student ?? {},
      coachProfile
    );

    const functionsBaseUrl = `${Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "")}/functions/v1`;
    let confirmUrl = "";
    let cancelUrl = "";
    try {
      confirmUrl = `${functionsBaseUrl}/session-action?token=${encodeURIComponent(await generateDbSessionActionToken(supabase, session_id, "confirm"))}`;
      cancelUrl = `${functionsBaseUrl}/session-action?token=${encodeURIComponent(await generateDbSessionActionToken(supabase, session_id, "cancel"))}`;
    } catch (e) {
      try {
        confirmUrl = `${functionsBaseUrl}/session-action?token=${encodeURIComponent(await generateSessionActionToken(session_id, "confirm"))}`;
        cancelUrl = `${functionsBaseUrl}/session-action?token=${encodeURIComponent(await generateSessionActionToken(session_id, "cancel"))}`;
      } catch (e2) {
        console.warn("session_action tokens skipped", (e2 as Error).message);
      }
    }

    const events: { event_type: string; to_email: string; subject: string; html: string }[] = [];

    if (new_status === "paid") {
      if (studentEmail) {
        events.push({
          event_type: "session_paid_student",
          to_email: studentEmail,
          subject: "Réservation reçue – Coach-me",
          html: buildStudentPaidHtml(payload),
        });
      }
      if (coachEmail && confirmUrl && cancelUrl) {
        events.push({
          event_type: "session_paid_coach",
          to_email: coachEmail,
          subject: "Nouvelle réservation – Coach-me",
          html: buildCoachPaidHtml(payload, confirmUrl, cancelUrl),
        });
      } else if (coachEmail) {
        events.push({
          event_type: "session_paid_coach",
          to_email: coachEmail,
          subject: "Nouvelle réservation – Coach-me",
          html: buildCoachPaidHtml(
            payload,
            `${getAppUrl()}/dashboard/coach`,
            `${getAppUrl()}/dashboard/coach`
          ),
        });
      }
    } else if (new_status === "upcoming") {
      if (studentEmail) {
        events.push({
          event_type: "session_upcoming_student",
          to_email: studentEmail,
          subject: "Session confirmée par le coach – Coach-me",
          html: buildStudentUpcomingHtml(payload),
        });
      }
      if (coachEmail) {
        events.push({
          event_type: "session_upcoming_coach",
          to_email: coachEmail,
          subject: "Session confirmée – Coach-me",
          html: buildCoachUpcomingHtml(payload),
        });
      }
    } else if (new_status === "canceled") {
      const canceledByCoach = old_status === "paid";
      if (studentEmail) {
        events.push({
          event_type: "session_canceled_student",
          to_email: studentEmail,
          subject: canceledByCoach ? "Session non confirmée – Coach-me" : "Session annulée – Coach-me",
          html: canceledByCoach
            ? buildStudentCanceledByCoachHtml(payload)
            : buildCanceledHtml(payload, false),
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

      const { id: providerId, error: sendError } = await sendResend(row.to_email, ev.subject, ev.html);

      if (sendError) {
        await supabase.from("email_events").update({ error: sendError }).eq("id", row.id);
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

    return new Response(JSON.stringify({ ok: true, sent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-session-emails", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

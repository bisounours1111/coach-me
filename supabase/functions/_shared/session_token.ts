/**
 * Tokens sécurisés pour les actions coach (confirmer / annuler une session).
 * Format: base64url(payload).base64url(hmac)
 */

const ALG = { name: "HMAC", hash: "SHA-256" };
const EXPIRY_DAYS = 7;

export type ActionPayload = { session_id: string; action: "confirm" | "cancel"; exp: number };

function getSecret(): string {
  const s = Deno.env.get("SESSION_ACTION_SECRET") || Deno.env.get("EMAIL_WEBHOOK_SECRET");
  if (!s) throw new Error("SESSION_ACTION_SECRET ou EMAIL_WEBHOOK_SECRET requis");
  return s;
}

function base64urlEncode(bytes: ArrayBuffer): string {
  const b = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (3 - (str.length % 3)) % 3);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function generateSessionActionToken(sessionId: string, action: "confirm" | "cancel"): Promise<string> {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + EXPIRY_DAYS * 24 * 60 * 60;
  const payload: ActionPayload = { session_id: sessionId, action, exp };
  const payloadStr = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadStr);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    ALG,
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(ALG, key, payloadBytes);
  return base64urlEncode(payloadBytes) + "." + base64urlEncode(sig);
}

export async function verifySessionActionToken(token: string): Promise<ActionPayload | null> {
  try {
    const secret = getSecret();
    const [payloadPart, sigPart] = token.split(".");
    if (!payloadPart || !sigPart) return null;

    const payloadBytes = base64urlDecode(payloadPart);
    const sigBytes = base64urlDecode(sigPart);

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      ALG,
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify(ALG, key, sigBytes, payloadBytes);
    if (!ok) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as ActionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.action !== "confirm" && payload.action !== "cancel") return null;
    if (!payload.session_id) return null;
    return payload;
  } catch {
    return null;
  }
}

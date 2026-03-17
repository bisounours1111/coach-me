import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) manquantes côté Edge Function");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export function getUserIdFromAuthHeader(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1];
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadJson = atob(parts[1]);
    const payload = JSON.parse(payloadJson);
    return typeof payload?.sub === "string" && payload.sub.trim() ? payload.sub : null;
  } catch {
    return null;
  }
}


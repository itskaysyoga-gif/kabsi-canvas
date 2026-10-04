// Audit log request context (P0.1-10, K-17, K-43).
// Edge Functions write as the service role, so the database cannot see the owner's request. These headers carry it:
// the triggers behind public.audit_events read them through PostgREST's request.headers, and only for the service
// role (private.audit_request). Never put review text, names or tokens in them.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function auditHeaders(req: Request, actorId?: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  const requestId = (req.headers.get("x-request-id") ?? req.headers.get("sb-request-id") ?? crypto.randomUUID())
    .replace(/[^\w.:-]/g, "").slice(0, 100);
  if (requestId) h["x-kabsi-request-id"] = requestId;
  const country = (req.headers.get("cf-ipcountry") ?? req.headers.get("x-country") ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(country) && country !== "XX") h["x-kabsi-ip-country"] = country;
  const ua = (req.headers.get("user-agent") ?? "").replace(/[^\x20-\x7e]/g, "").trim().slice(0, 300);
  if (ua) h["x-kabsi-user-agent"] = ua;
  if (actorId && UUID.test(actorId)) h["x-kabsi-actor-id"] = actorId;
  return h;
}

// A service-role client whose every request carries the audit headers. One per incoming request; the shared
// admin() client stays header-free so cron work is recorded as the system.
export function auditedAdmin(headers: Record<string, string>): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
    global: { headers },
  });
}

// auth-code: sends the 6-digit sign-in code after Turnstile, the throwaway-domain check and the limits (P0.4-02).
// The logic and its limits are in _shared/auth-code.ts. Supabase Auth is called with the service key, so its own
// captcha check (when switched on in the dashboard) is skipped for this caller only; the visitor's IP goes along in
// Sb-Forwarded-For so Auth's own per-IP limits still see the real visitor.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { captureError, CORS, rateLimit, sha256Hex, verifyTurnstile } from "../_shared/kabsi.ts";
import { makeHandler } from "../_shared/auth-code.ts";

Deno.serve(makeHandler({
  env: (name) => Deno.env.get(name),
  ip: (req) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown",
  sha256Hex,
  rateLimit,
  verifyTurnstile,
  sendCode: async (email, ip) => {
    const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: ip !== "unknown" ? { "sb-forwarded-for": ip } : {} },
    }).auth;
    const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? error.message : null;
  },
  captureError,
  cors: CORS,
}));

// holiday: the holiday hours links (/h/:token). Public: the token is the credential, plus a signed-in session for the two
// answers that publish hours (K-17). The rules are in _shared/holiday-link.ts and the database (public.holiday_link_view,
// public.use_holiday_link, public.undo_holiday_link); this file wires them to Supabase.
import { clientIp } from "../_shared/client-ip.ts";
import { admin, captureError, CORS, currentUser, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";
import { auditedAdmin, auditHeaders } from "../_shared/audit.ts";
import { type HolidayLinkDeps, holidayRequest, type HolidayResult, type HolidayView, LINK_HEADERS } from "../_shared/holiday-link.ts";

function deps(req: Request): HolidayLinkDeps {
  let session: Promise<string | null> | null = null;
  return {
    sessionUser: () => (session ??= currentUser(req).then((u) => u?.id ?? null)),
    view: async (hash) => {
      const { data, error } = await admin().rpc("holiday_link_view", { p_token_hash: hash });
      if (error) throw error;
      return data as HolidayView;
    },
    use: async (hash, input) => {
      const { data, error } = await auditedAdmin(auditHeaders(req, input.session)).rpc("use_holiday_link", {
        p_token_hash: hash, p_answer: input.answer, p_open: input.open ?? null, p_close: input.close ?? null, p_from: input.from ?? null,
        p_to: input.to ?? null, p_session_user: input.session,
      });
      if (error) throw new Error(error.message);
      return data as HolidayResult;
    },
    undo: async (hash, user) => {
      const { error } = await auditedAdmin(auditHeaders(req, user)).rpc("undo_holiday_link", { p_token_hash: hash, p_user: user });
      if (error) throw new Error(error.message);
    },
  };
}

export async function holiday(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ip = clientIp(req);
  // The token-guessing surface (public, unauthenticated): fail closed if the limiter breaks.
  if (!(await rateLimit(`holiday:${await sha256Hex(ip + new Date().toISOString().slice(0, 10))}`, 60, 600, { failClosed: true }))) return json({ error: "rate_limited", message: "Too many tries." }, 429, LINK_HEADERS);
  try {
    const r = await holidayRequest(req, deps(req));
    return json(r.body, r.status, LINK_HEADERS);
  } catch (e) {
    await captureError("holiday", e);
    return json({ error: "internal", message: "Something went wrong. Nothing was changed. Answer in Kabsi, under Hours." }, 500, LINK_HEADERS);
  }
}

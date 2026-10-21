// holiday: the holiday hours links (/h/:token). Public: the token is the credential, plus a signed-in session for the two
// answers that publish hours (K-17). The rules are in _shared/holiday-link.ts and the database (public.holiday_link_view,
// public.use_holiday_link, public.undo_holiday_link); this file wires them to Supabase.
import { admin, captureError, CORS, currentUser, fail, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";
import { auditedAdmin, auditHeaders } from "../_shared/audit.ts";
import { type HolidayLinkDeps, type HolidayResult, type HolidayView, holidayGet, holidayPost } from "../_shared/holiday-link.ts";

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
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // The token-guessing surface (public, unauthenticated): fail closed if the limiter breaks.
  if (!(await rateLimit(`holiday:${await sha256Hex(ip + new Date().toISOString().slice(0, 10))}`, 60, 600, { failClosed: true }))) return fail("rate_limited", "Too many tries.", 429);
  try {
    if (req.method === "GET") {
      const r = await holidayGet(new URL(req.url).searchParams.get("t"), deps(req));
      return json(r.body, r.status);
    }
    if (req.method !== "POST") return fail("method_not_allowed", "Use GET or POST.", 405);
    const r = await holidayPost(await req.json().catch(() => ({})) as Record<string, unknown>, deps(req));
    return json(r.body, r.status);
  } catch (e) {
    await captureError("holiday", e);
    return fail("internal", "Something went wrong. Nothing was changed. Answer in Kabsi, under Hours.", 500);
  }
}

// resume: the onboarding resume link (V4, master plan 30.16 section 3). One link opens the next unfinished step on any device.
// The code finds the business; the person must be signed in as one of its members, so the link never signs anyone in and a
// forwarded link shows a stranger nothing. GET /api/resume?code=<20 hex> with the user's JWT answers the step and its page.
import { admin, CORS, currentUser, fail, json, rateLimit } from "../_shared/kabsi.ts";
import { accessOf, type Facts, RESUME_CODE, STAGE_PATH, stageOf } from "../_shared/onboarding/stages.ts";

export async function resume(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return fail("method_not_allowed", "Use GET.", 405);
  const code = new URL(req.url).searchParams.get("code") ?? "";
  if (!RESUME_CODE.test(code)) return fail("bad_code", "That link is not right.", 400);
  const user = await currentUser(req);
  if (!user) return json({ sign_in: true }, 401);
  if (!(await rateLimit(`resume:${user.id}`, 30, 3600, { failClosed: true }))) return fail("rate_limited", "Too many tries. Try again later.", 429);
  const { data: loc } = await admin().rpc("onboarding_resume", { p_code: code });
  if (!loc) return fail("not_found", "That link is not right.", 404);
  const { data: member } = await admin().from("location_members").select("role").eq("location_id", loc).eq("user_id", user.id).maybeSingle();
  if (!member) return fail("not_found", "That link is not right.", 404);
  const { data: f, error } = await admin().rpc("onboarding_facts", { p_location: loc });
  if (error || !f) return fail("server_error", "Something went wrong. Try again.", 500);
  const facts = f as Facts;
  const stage = stageOf(facts);
  return json({ location_id: loc, business: facts.business, stage, access: accessOf(facts), path: STAGE_PATH[stage] });
}

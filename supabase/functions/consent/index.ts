// consent: proof of a privacy banner choice (P0.6-01, G-18, G-21, R-04).
// POST { visitor_id, country?, country_source, tz?, action, analytics, advertising, version, page }
// The browser sends the country it applied (read on kabsi.co from the network) and its time zone; the rule is worked
// out here again and the exact wording stored is this function's own copy for that version, never text from the browser.
// One row per choice. The signed-in user is attached when the call carries their session. No IP, email or name is kept.
import { clientIp } from "../_shared/client-ip.ts";
import { admin, captureError, CORS, currentUser, fail, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";
import { type ConsentInput, consentRow } from "../_shared/consent-row.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);

  const b = await req.json().catch(() => ({})) as ConsentInput;
  const built = consentRow(b);
  if ("error" in built) return fail(built.error, "Your choice could not be saved.");

  const ip = clientIp(req);
  const day = new Date().toISOString().slice(0, 10);
  if (!(await rateLimit(`consent:${await sha256Hex(`${ip}|${day}`)}`, 30, 3600))) {
    return fail("rate_limited", "Too many requests. Try again later.", 429);
  }

  try {
    const user = await currentUser(req).catch(() => null);
    const { data, error } = await admin().from("consent_records")
      .insert({ ...built.row, user_id: user?.id ?? null }).select("id").single();
    if (error) throw error;
    return json({ ok: true, id: data.id, rule: built.row.rule });
  } catch (e) {
    await captureError("consent", e);
    return fail("internal", "Your choice could not be saved.", 500);
  }
});

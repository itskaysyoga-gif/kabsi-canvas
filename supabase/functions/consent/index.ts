// consent: proof of a privacy banner choice (P0.6-01, G-18, G-21, R-04).
// POST { visitor_id, country?, country_source, tz?, action, analytics, advertising, version, page }
// The browser sends the country it applied (read on kabsi.co from the network) and its time zone; the rule is worked
// out here again and the exact wording stored is this function's own copy for that version, never text from the browser.
// One row per choice. The signed-in user is attached when the call carries their session. No IP, email or name is kept.
// Launch 2 part A (30.36 item 4): POST /consent/meta { visitor_id, event_name, event_id, event_source_url, fbp?, fbc?,
// content_name? } sends the server copy of Lead or FreeScanCompleted with the browser's event id, only when this visitor's
// stored choice allows ad measurement (_shared/meta-capi-web.ts). It answers 200 { ok, result } either way.
import { serve } from "../_shared/kabsi.ts";
import { clientIp } from "../_shared/client-ip.ts";
import { admin, captureError, CORS, currentUser, fail, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";
import { type ConsentInput, consentRow } from "../_shared/consent-row.ts";
import { BODY_LIMITS, capBody } from "../_shared/body-cap.ts";
import { readWebEvent, sendWebCapi } from "../_shared/meta-capi-web.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Sec 2: the body is capped before anything reads it (413 past BODY_LIMITS.small).
  const capped = await capBody(req, BODY_LIMITS.small, CORS);
  if (capped instanceof Response) return capped;
  req = capped;
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);

  const b = await req.json().catch(() => ({})) as ConsentInput;
  if (new URL(req.url).pathname.replace(/\/+$/, "").endsWith("/meta")) return metaEvent(req, b);
  const built = consentRow(b);
  if ("error" in built) return fail(built.error, "Your choice could not be saved.");

  const ip = clientIp(req);
  const day = new Date().toISOString().slice(0, 10);
  if (!(await rateLimit(`consent:${await sha256Hex(`${ip}|${day}`)}`, 30, 3600, { failClosed: true }))) {
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

// The server copy of a browser event (Launch 2 part A). The stored choice decides, never the browser's word.
async function metaEvent(req: Request, b: ConsentInput): Promise<Response> {
  const ev = readWebEvent(b);
  if ("error" in ev) return fail(ev.error, "The event could not be read.");
  const day = new Date().toISOString().slice(0, 10);
  if (!(await rateLimit(`metaweb:${await sha256Hex(`${clientIp(req)}|${day}`)}`, 60, 3600, { failClosed: true }))) {
    return fail("rate_limited", "Too many requests. Try again later.", 429);
  }
  // A real visitor sends a handful of these a day; a made-up visitor id cannot be used to flood Meta with conversions.
  if (!(await rateLimit(`metawebv:${await sha256Hex(`${ev.visitorId}|${day}`)}`, 6, 86400, { failClosed: true }))) {
    return fail("rate_limited", "Too many requests. Try again later.", 429);
  }
  try {
    const result = await sendWebCapi(ev, async (visitor) => {
      const { data, error } = await admin().from("consent_records").select("advertising, created_at")
        .eq("visitor_id", visitor).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as { advertising: boolean; created_at: string } | null;
    });
    return json({ ok: true, result });
  } catch (e) {
    await captureError("consent", e, { step: "meta" });
    return fail("internal", "The event could not be sent.", 500);
  }
}

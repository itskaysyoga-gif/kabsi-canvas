// tap — called only by the go.kabsi.co Worker (header x-kabsi-secret = TAP_SECRET).
//   GET  ?code=ABC234  → { status, destination, business_id }   (KV miss: database is the source of truth)
//   POST { code, source, country, device, is_bot }  → 204, one row in public.taps
// No IP address is ever received or stored.
import { admin, captureError, json, log, timingSafeEqual } from "../_shared/kabsi.ts";

const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;

Deno.serve(async (req) => {
  const secret = Deno.env.get("TAP_SECRET");
  if (!secret) return json({ error: "not_configured" }, 503);
  if (!timingSafeEqual(req.headers.get("x-kabsi-secret") ?? "", secret)) return json({ error: "forbidden" }, 403);

  const db = admin();
  try {
    if (req.method === "GET") {
      const code = (new URL(req.url).searchParams.get("code") ?? "").toUpperCase();
      if (!CODE_RE.test(code)) return json({ status: "unknown" }, 404);
      const { data } = await db.from("cards").select("status, destination, location_id").eq("code", code).maybeSingle();
      if (!data) return json({ status: "unknown" }, 404);
      return json({ status: data.status, destination: data.destination, business_id: data.location_id });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null) as Record<string, unknown> | null;
      const code = String(body?.code ?? "").toUpperCase();
      if (!CODE_RE.test(code)) return json({ error: "bad_code" }, 400);
      const source = body?.source === "qr" ? "qr" : "nfc";
      const device = ["ios", "android"].includes(String(body?.device)) ? String(body?.device) : "other";
      const country = typeof body?.country === "string" && /^[A-Z]{2}$/.test(body.country) ? body.country : null;
      const { data: card } = await db.from("cards").select("location_id").eq("code", code).maybeSingle();
      const { error } = await db.from("taps").insert({
        code, location_id: card?.location_id ?? null, source, device, country, is_bot: body?.is_bot === true,
      });
      if (error) throw error;
      log("tap", { ok: true, code, source, country });
      return new Response(null, { status: 204 });
    }

    return json({ error: "method_not_allowed" }, 405);
  } catch (e) {
    await captureError("tap", e);
    return json({ error: "internal" }, 500);
  }
});

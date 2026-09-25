// kabsi-go — the card Worker on go.kabsi.co (SPEC §7, D212, D213, D227, D231).
// Deployed on its own (never by the app's GitHub build). Bindings: KV `STICKERS`.
// Vars: TAP_FUNCTION_URL, APP_ORIGIN. Secret: TAP_SECRET.
//   GET /{CODE}      NFC tap  → 302 to the business's Google review page
//   GET /{CODE}?s=q  QR scan  → same, logged as source=qr
// Every visitor goes straight to Google: no rating screen, ever (D212). No IP is stored.

const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|curl|wget|python|headless/i;
const GOOGLE_RE = /^https:\/\/(search\.google\.com|g\.page|www\.google\.com|maps\.google\.com|maps\.app\.goo\.gl)\//;
const CACHE_TTL = 86400; // kv-sync deletes the key whenever a card changes, so a long TTL is safe

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const app = (env.APP_ORIGIN || "https://kabsi-app.lovable.app").replace(/\/$/, "");
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    if (!path) return Response.redirect("https://kabsi.co", 302);

    const code = path.toUpperCase();
    if (!CODE_RE.test(code)) return Response.redirect(`${app}/`, 302);

    const card = await lookup(code, env, ctx);
    if (card && card.a && card.d && GOOGLE_RE.test(card.d)) {
      const ua = request.headers.get("user-agent") || "";
      const body = {
        code,
        source: url.searchParams.get("s") === "q" ? "qr" : "nfc",
        country: request.cf && request.cf.country ? String(request.cf.country) : null,
        device: /iphone|ipad|ios/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "other",
        is_bot: BOT_RE.test(ua) || (request.cf && request.cf.botManagement && request.cf.botManagement.verifiedBot) === true,
      };
      // D213: log with waitUntil so the redirect is never delayed and the log is never dropped.
      ctx.waitUntil(
        fetch(env.TAP_FUNCTION_URL, {
          method: "POST",
          headers: { "content-type": "application/json", "x-kabsi-secret": env.TAP_SECRET },
          body: JSON.stringify(body),
        }).catch(() => {}),
      );
      return new Response(null, { status: 302, headers: { location: card.d, "cache-control": "no-store" } });
    }
    if (card && card.b) return Response.redirect(`${app}/?sticker=disabled`, 302); // linked to a business but switched off
    return Response.redirect(`${app}/activate/${code}`, 302); // unknown or not linked yet
  },
};

// KV first (`s:{CODE}` → {d: destination, b: location_id, a: active}); on a miss, ask the database.
async function lookup(code, env, ctx) {
  const key = `s:${code}`;
  if (env.STICKERS) {
    const cached = await env.STICKERS.get(key, "json").catch(() => null);
    if (cached) return cached;
  }
  let res;
  try {
    res = await fetch(`${env.TAP_FUNCTION_URL}?code=${code}`, { headers: { "x-kabsi-secret": env.TAP_SECRET } });
  } catch {
    return null;
  }
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data) return null;
  const card = { d: data.destination || null, b: data.business_id || null, a: data.status === "active" };
  if (env.STICKERS) ctx.waitUntil(env.STICKERS.put(key, JSON.stringify(card), { expirationTtl: CACHE_TTL }));
  return card;
}

// kabsi-go: the card Worker on go.kabsi.co (SPEC §7, D212, D213, D227, D231).
// Deployed on its own (never by the app's GitHub build). Bindings: KV `STICKERS`.
// Vars: TAP_FUNCTION_URL, APP_ORIGIN. Secret: TAP_SECRET.
//   GET /{CODE}      NFC tap  → 302 to the business's Google review page
//   GET /{CODE}?s=q  QR scan  → same, logged as source=qr
// Every visitor goes straight to Google: no rating screen, ever (D212). No IP is stored.

const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|curl|wget|python|headless/i;
const GOOGLE_RE = /^https:\/\/(search\.google\.com|g\.page|www\.google\.com|maps\.google\.com|maps\.app\.goo\.gl)\//;
const DEDUPE_TTL = 600; // D271: one tap per visitor per card per 10 minutes

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
      ctx.waitUntil(logTap(body, request, env));
      return new Response(null, { status: 302, headers: { location: card.d, "cache-control": "no-store" } });
    }
    if (card && card.b) return Response.redirect(`${app}/?sticker=disabled`, 302); // linked to a business but switched off
    return Response.redirect(`${app}/activate/${code}`, 302); // unknown or not linked yet
  },
};

// D271: repeat taps by the same visitor on the same card within 10 minutes count once. The visitor key is a
// SHA-256 of the IP, the code, the UTC date and the tap secret (a salt that changes daily), so no IP is stored.
async function logTap(body, request, env) {
  try {
    if (env.STICKERS) {
      const ip = request.headers.get("cf-connecting-ip") || "";
      if (ip) {
        const day = new Date().toISOString().slice(0, 10);
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${env.TAP_SECRET}|${day}|${body.code}|${ip}`));
        const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
        const key = `d:${body.code}:${hash}`;
        if (await env.STICKERS.get(key)) return;
        await env.STICKERS.put(key, "1", { expirationTtl: DEDUPE_TTL });
      }
    }
    await fetch(env.TAP_FUNCTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-kabsi-secret": env.TAP_SECRET },
      body: JSON.stringify(body),
    });
  } catch {
    // never let logging break a tap
  }
}

// KV first (`s:{CODE}` → {d: destination, b: location_id, a: active}, no expiry: kv-sync writes it whenever a
// card changes, D271); on a miss, ask the database.
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
  if (env.STICKERS) ctx.waitUntil(env.STICKERS.put(key, JSON.stringify(card)));
  return card;
}

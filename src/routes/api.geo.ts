import { createFileRoute } from "@tanstack/react-router";

// The visitor's country for the privacy banner (P0.6-01). Cloudflare's cf-ipcountry when kabsi.co is proxied, else
// Vercel's x-vercel-ip-country. Nothing is stored and the answer is never cached.
// Signup 1 (30.50 item 3): GET /api/geo?sign=1 also answers a short signed token with the approximate city and country
// (Vercel's x-vercel-ip-city and x-vercel-ip-country, never the address), valid 5 minutes, for Continue with WhatsApp. The
// auth-whatsapp function checks the signature with the same key: GEO_SIGN_KEY when set, else an HMAC of a fixed label under
// SUGGEST_ROUTE_KEY (the route key Vault already shares with this server). Without either there is no token and the WhatsApp
// message leaves the city out.
const TOKEN_LIFE_MS = 5 * 60_000;

async function hmacHex(key: string, text: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cityOf(raw: string | null): string {
  if (!raw) return "";
  try {
    const v = decodeURIComponent(raw).replace(/\s+/g, " ").trim();
    return /^[\p{L}][\p{L} .'-]{0,59}$/u.test(v) ? v : "";
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/api/geo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw =
          request.headers.get("cf-ipcountry") ?? request.headers.get("x-vercel-ip-country") ?? "";
        const cc = raw.trim().toUpperCase();
        const country = /^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1" ? cc : null;
        let token: string | null = null;
        const direct = process.env["GEO_SIGN_KEY"]?.trim();
        const route = process.env["SUGGEST_ROUTE_KEY"]?.trim();
        // The same key the auth-whatsapp function derives (geoSignKey): no new secret to paste.
        const key = direct || (route ? await hmacHex(route, "kabsi geo sign v1") : "");
        if (key && new URL(request.url).searchParams.get("sign") === "1") {
          const city = cityOf(request.headers.get("x-vercel-ip-city"));
          const body = `${encodeURIComponent(city)}|${country ?? ""}|${Date.now() + TOKEN_LIFE_MS}`;
          token = `${body}.${await hmacHex(key, body)}`;
        }
        return new Response(JSON.stringify(token ? { country, token } : { country }), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
            "x-robots-tag": "noindex",
          },
        });
      },
    },
  },
});

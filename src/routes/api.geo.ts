import { createFileRoute } from "@tanstack/react-router";

// The visitor's country for the privacy banner (P0.6-01). Cloudflare's cf-ipcountry when kabsi.co is proxied, else
// Vercel's x-vercel-ip-country. Nothing is stored and the answer is never cached.
export const Route = createFileRoute("/api/geo")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const raw =
          request.headers.get("cf-ipcountry") ?? request.headers.get("x-vercel-ip-country") ?? "";
        const cc = raw.trim().toUpperCase();
        const country = /^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1" ? cc : null;
        return new Response(JSON.stringify({ country }), {
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

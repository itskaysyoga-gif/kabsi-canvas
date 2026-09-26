// cron-tick: retired 26 Sep 2026. The 5-minute job runs as /api/cron-tick (D229). This stub replaces the
// old code so nothing stale can run; the function can be deleted from the Supabase dashboard at any time.
Deno.serve(() => new Response(JSON.stringify({ error: "gone", use: "/functions/v1/api/cron-tick" }), {
  status: 410,
  headers: { "content-type": "application/json" },
}));

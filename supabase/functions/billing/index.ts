// billing: retired 21 Oct 2026 (K-124, P0.8-01). The crypto payment provider and every crypto route are gone; card
// payments come through Creem (billing-creem, P0.4-07). This stub replaces the old code so nothing stale can run, and
// answers the old provider's webhook with 410; the function can be deleted from the Supabase dashboard at any time.
Deno.serve(() => new Response(JSON.stringify({ error: "gone" }), {
  status: 410,
  headers: { "content-type": "application/json" },
}));

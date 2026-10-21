// partner: retired 21 Oct 2026 (K-127, P0.8-01). The old partner model (reselling, partner invites, partner
// invoices, crypto payment claims) is gone; Kabsi Partners (P0.8-12) is a separate program. This stub replaces the old code so nothing
// stale can run; the function can be deleted from the Supabase dashboard at any time.
Deno.serve(() => new Response(JSON.stringify({ error: "gone" }), {
  status: 410,
  headers: { "content-type": "application/json" },
}));

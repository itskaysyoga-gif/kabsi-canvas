// posts-weekly: retired 21 Oct 2026 (P0.5-02). The posts care routine replaced it: the `care_posts` job, offered once
// a day per business by private.offer_care_posts (_shared/posts/plan.ts). The kabsi_posts_weekly schedule is gone.
Deno.serve(() => new Response(JSON.stringify({ error: "gone", use: "care_posts job" }), {
  status: 410, headers: { "content-type": "application/json" },
}));

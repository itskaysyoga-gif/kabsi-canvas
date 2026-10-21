// P0.8-07 (K-134, K-126): the graphic is made only for a signed-in owner or manager of the review's business, only on
// Pro, only for a 4 or 5 star review with words. The renderer is the real one; the database is stubbed.
import { assertEquals } from "jsr:@std/assert@1";
import { type Deps, makeHandler, type ReviewForGraphic } from "./handler.ts";
import { renderGraphic } from "./render.ts";

const REVIEW_ID = "11111111-1111-4111-8111-111111111111";
const review = (over: Partial<ReviewForGraphic> = {}): ReviewForGraphic => ({
  location_id: "loc-1",
  location_name: "Yawmiyati",
  star_rating: 5,
  comment: "Friendly team and the best bread in the neighbourhood.",
  reviewer_name: "Maria Khoury",
  ...over,
});

function setup(o: { user?: boolean; role?: string | null; pro?: boolean; review?: ReviewForGraphic | null; limited?: boolean } = {}) {
  const calls = { render: 0, logged: [] as Record<string, unknown>[] };
  const deps: Deps = {
    getUser: () => Promise.resolve(o.user === false ? null : { id: "user-1" }),
    loadReview: () => Promise.resolve(o.review === undefined ? review() : o.review),
    memberRole: () => Promise.resolve(o.role === undefined ? "owner" : o.role),
    featureAccess: () => Promise.resolve({ pro: o.pro ?? true }),
    rateLimit: () => Promise.resolve(!o.limited),
    render: (input, size) => {
      calls.render++;
      return renderGraphic(input, size);
    },
    log: (f) => calls.logged.push(f),
    captureError: () => Promise.resolve(),
    cors: { "access-control-allow-origin": "*" },
  };
  const post = (body: unknown) =>
    makeHandler(deps)(new Request("https://x.test/review-graphic", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
  return { post, calls };
}

for (const size of ["square", "story"] as const) {
  Deno.test(`a Pro owner gets the ${size} PNG`, async () => {
    const { post, calls } = setup();
    const res = await post({ review_id: REVIEW_ID, size });
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("content-type"), "image/png");
    assertEquals(res.headers.get("cache-control"), "no-store");
    const png = new Uint8Array(await res.arrayBuffer());
    assertEquals(Array.from(png.slice(0, 4)), [137, 80, 78, 71]);
    assertEquals(calls.render, 1);
    // The log line carries no review text, no name and no business.
    assertEquals(calls.logged, [{ ok: true, size }]);
  });
}

Deno.test("a manager may make one", async () => {
  assertEquals((await setup({ role: "manager" }).post({ review_id: REVIEW_ID, size: "square" })).status, 200);
});

Deno.test("an Essentials, trial-ended or no-plan business is told it is a Pro feature and nothing is rendered", async () => {
  const { post, calls } = setup({ pro: false });
  const res = await post({ review_id: REVIEW_ID, size: "square" });
  assertEquals(res.status, 403);
  const j = await res.json();
  assertEquals(j.error, "pro_required");
  assertEquals(j.message, "Review graphics are part of Pro.");
  assertEquals(calls.render, 0);
});

Deno.test("a 3 star review is refused", async () => {
  const { post, calls } = setup({ review: review({ star_rating: 3 }) });
  const res = await post({ review_id: REVIEW_ID, size: "square" });
  assertEquals(res.status, 422);
  assertEquals((await res.json()).error, "rating");
  assertEquals(calls.render, 0);
});

Deno.test("no words and an unsupported script are refused with plain messages", async () => {
  const none = await setup({ review: review({ comment: null }) }).post({ review_id: REVIEW_ID, size: "story" });
  assertEquals((await none.json()).error, "no_text");
  const ar = await setup({ review: review({ comment: "خدمة ممتازة" }) }).post({ review_id: REVIEW_ID, size: "story" });
  assertEquals((await ar.json()).error, "unsupported_script");
});

Deno.test("signed out, staff, a stranger and a missing review are all turned away", async () => {
  assertEquals((await setup({ user: false }).post({ review_id: REVIEW_ID, size: "square" })).status, 401);
  assertEquals((await setup({ role: "staff" }).post({ review_id: REVIEW_ID, size: "square" })).status, 404);
  assertEquals((await setup({ role: null }).post({ review_id: REVIEW_ID, size: "square" })).status, 404);
  assertEquals((await setup({ review: null }).post({ review_id: REVIEW_ID, size: "square" })).status, 404);
});

Deno.test("a bad request and the rate limit", async () => {
  assertEquals((await setup().post({ review_id: "nope", size: "square" })).status, 400);
  assertEquals((await setup().post({ review_id: REVIEW_ID, size: "banner" })).status, 400);
  assertEquals((await setup({ limited: true }).post({ review_id: REVIEW_ID, size: "square" })).status, 429);
});

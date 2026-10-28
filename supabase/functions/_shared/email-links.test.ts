// P0.2-05: the email link handler (K-17, K-38, K-70). The database side (one use, 72 hours, sign-in, the audit
// channel) is proven in supabase/tests/email_approvals.sql; these tests prove the Edge Function's part.
// Run with: deno test --no-check _shared/ (scripts/deno-check.sh).
import assert from "node:assert/strict";
import { type EmailLinkDeps, hashToken, linkGet, linkPost, linkRefusal, type LinkResult, type LinkView, type UseInput } from "./email-links.ts";

const TOKEN = "a".repeat(43);
const OWNER = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";
const PUB = "00000000-0000-4000-8000-000000000901";

function world(o: { view?: Partial<LinkView>; session?: string | null; use?: (input: UseInput) => LinkResult } = {}) {
  const calls = { view: [] as { hash: string; session: string | null }[], details: 0, use: [] as { hash: string; input: UseInput; recipient: string | null }[] };
  const deps: EmailLinkDeps = {
    sessionUser: () => Promise.resolve(o.session ?? null),
    view: (hash, session) => {
      calls.view.push({ hash, session });
      return Promise.resolve({ status: "ok", action: "post", target_type: "review", target_id: "r1", user_id: OWNER, sign_in: false,
        signed_in: session === OWNER, other_account: session !== null && session !== OWNER, result: null, ...o.view });
    },
    details: () => {
      calls.details++;
      return Promise.resolve({ business: "QA Bakery", review: { id: "r1" }, draft: "Thank you." });
    },
    mode: () => Promise.resolve("mock"),
    use: (hash, input, recipient) => {
      calls.use.push({ hash, input, recipient });
      return Promise.resolve(o.use ? o.use(input) : { done: "approved", state: "approved", publication_id: PUB, publish_after: "2026-10-12T10:00:10Z" });
    },
  };
  return { deps, calls };
}

Deno.test("email link: GET shows the link and never performs anything", async () => {
  const { deps, calls } = world();
  const r = await linkGet(TOKEN, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "ok");
  assert.equal(r.body.draft, "Thank you.");
  assert.equal(r.body.sign_in, false);
  assert.equal(calls.use.length, 0, "GET never calls use_action_link");
  assert.equal(calls.view[0].hash, await hashToken(TOKEN), "only the hash leaves the function");
});

Deno.test("email link: GET of a used, expired or unknown link performs nothing either", async () => {
  for (const status of ["used", "expired", "invalid"] as const) {
    const { deps, calls } = world({ view: { status, result: status === "used" ? { done: "approved", publication_id: PUB } : null } });
    const r = await linkGet(TOKEN, deps);
    assert.equal(r.status, status === "invalid" ? 404 : 200);
    assert.equal(calls.use.length, 0);
    if (status === "used") assert.deepEqual(r.body.result, { done: "approved" }, "the page learns what happened, not the ids");
    if (status === "expired") assert.equal(calls.details, 0, "an expired link shows nothing of the review");
  }
  const { deps, calls } = world();
  assert.equal((await linkGet("short", deps)).status, 404);
  assert.equal(calls.view.length, 0, "a malformed token is not even looked up");
});

Deno.test("email link: GET tells the page to sign in, and hides the item from another account", async () => {
  const signedOut = world({ view: { sign_in: true } });
  const r1 = await linkGet(TOKEN, signedOut.deps);
  assert.equal(r1.body.sign_in, true);
  assert.equal(r1.body.signed_in, false);
  assert.equal(r1.body.draft, "Thank you.", "the recipient sees the exact text before signing in");
  const other = world({ view: { sign_in: true }, session: OTHER });
  const r2 = await linkGet(TOKEN, other.deps);
  assert.equal(r2.body.other_account, true);
  assert.equal(other.calls.details, 0, "another account sees nothing of the review");
  assert.equal(r2.body.draft, undefined);
  const owner = world({ view: { sign_in: true }, session: OWNER });
  assert.equal((await linkGet(TOKEN, owner.deps)).body.signed_in, true);
});

Deno.test("email link: POST performs once, as the recipient, with the session passed through", async () => {
  const { deps, calls } = world({ session: OWNER });
  const r = await linkPost({ t: TOKEN, do: "post", text: "Thank you so much." }, deps);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, done: "approved", state: "approved", publication: PUB, publish_after: "2026-10-12T10:00:10Z", repeat: false });
  assert.equal(calls.use.length, 1);
  assert.deepEqual(calls.use[0].input, { do: "post", text: "Thank you so much.", session: OWNER, publication: undefined, version: undefined });
  assert.equal(calls.use[0].recipient, OWNER, "the audit headers name the link's recipient");
});

Deno.test("email link: a second POST returns the existing result", async () => {
  const { deps } = world({ use: () => ({ done: "approved", state: "published", publication_id: PUB, publish_after: null, repeat: true }) });
  const r = await linkPost({ t: TOKEN, do: "post", text: "x" }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.publication, PUB);
  assert.equal(r.body.repeat, true);
});

Deno.test("email link: undo needs the publication id; refusals become owner-facing words", async () => {
  const { deps, calls } = world();
  assert.equal((await linkPost({ t: TOKEN, do: "undo" }, deps)).body.error, "not_allowed");
  assert.equal((await linkPost({ t: TOKEN, do: "undo", publication: "not-a-uuid" }, deps)).body.error, "not_allowed");
  assert.equal((await linkPost({ t: TOKEN, do: "publish_everything" }, deps)).body.error, "not_allowed");
  assert.equal(calls.use.length, 0, "nothing reached the database");
  const undo = world({ use: (input) => ({ done: input.do === "undo" ? "undone" : "approved", state: "cancelled" }) });
  const r = await linkPost({ t: TOKEN, do: "undo", publication: PUB }, undo.deps);
  assert.equal(r.body.done, "undone");
  assert.equal(undo.calls.use[0].input.publication, PUB);

  for (const [message, code, status] of [
    ["link_expired", "expired", 410], ["link_used", "used", 409], ["wrong_account", "wrong_account", 403],
    ["sign_in_required", "sign_in_required", 401], ["too_late", "too_late", 409], ["invalid_link", "invalid", 404],
  ] as const) {
    const failing = world({ use: () => { throw new Error(message); } });
    const r2 = await linkPost({ t: TOKEN, do: "post", text: "x" }, failing.deps);
    assert.equal(r2.status, status, message);
    assert.equal(r2.body.error, code, message);
  }
  const crash = world({ use: () => { throw new Error("connection reset"); } });
  await assert.rejects(linkPost({ t: TOKEN, do: "post", text: "x" }, crash.deps), /connection reset/, "an unexpected failure is reported, not hidden");
});

Deno.test("email link: refusal words follow the house rules", () => {
  for (const m of ["invalid_link", "link_expired", "link_used", "wrong_account", "sign_in_required", "not_member", "not_allowed",
    "already_handled", "already_posted", "bad_reply_text", "too_late", "location_not_active", "already_decided", "owner_only",
    "not_confirmed", "values_cleared", "high_risk_wait 2026-10-19T05:00Z"]) {
    const r = linkRefusal(m);
    assert.ok(r, m);
    assert.doesNotMatch(String(r.body.message), /[!–—]/, `${m}: no exclamation marks or dashes`);
  }
  assert.equal(linkRefusal("something else"), null);
});

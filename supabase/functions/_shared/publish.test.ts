// Run: deno test supabase/functions/_shared/publish.test.ts
// The publish and reconcile jobs (P0.1-13a, P0.1-13b) against an in-memory ledger that follows the database rules
// (approve_publication, undo_publication, claim_publication, record_publication in
// 20261007190000_publication_pipeline.sql and 20261007210000_publication_pipeline_content.sql; the same rules are
// tested in SQL in supabase/tests/publication_pipeline.sql and publication_content.sql) and a mock Google with a
// counter of write calls. Replies use the mock reviews API's outcomes; the other kinds play the same modes.
import assert from "node:assert/strict";
import { RetryLater } from "./jobs.ts";
import {
  type Claim, type CheckClaim, type Item, NotSent, type Outcome, type PublishDeps, publishOne, reconcileOne, replySeen, type Seen,
  type TargetType,
} from "./publish.ts";
import { mockReplyOutcome } from "./google/reviews/mock.ts";

type Row = { id: string; target: string; state: string; publishAfter: number; text: string; nextCheck: number; reason?: string; error?: string; ref?: string | null };

function world(mode: "ok" | "pending" | "timeout" | "reject" | "busy" | "nofile" = "ok", kind: TargetType = "review_reply") {
  const rows = new Map<string, Row>();
  const google = { mode, calls: 0, reads: 0, shown: null as string | null, pending: null as string | null };
  let n = 0;
  const open = ["approved", "publishing", "published", "checking", "verifying", "verified"];

  // approve_publication: one open publication per review, whoever approves first.
  const approve = (target: string, text: string, now = Date.now()) => {
    const found = [...rows.values()].find((r) => r.target === target && open.includes(r.state));
    if (found) return { id: found.id, created: false };
    const id = `p${++n}`;
    rows.set(id, { id, target, state: "approved", publishAfter: now + 10_000, text, nextCheck: 0 });
    return { id, created: true };
  };
  const undo = (id: string, now = Date.now()) => {
    const r = rows.get(id)!;
    if (r.state !== "approved" || now >= r.publishAfter) throw new Error("too_late");
    r.state = "cancelled";
  };
  const item = (r: Row): Item => ({
    publication_id: r.id, target_type: kind, target_id: r.target, text: kind === "review_reply" ? r.text : null,
    payload: kind === "review_reply" ? { text: r.text } : { target: r.target, value: r.text }, google_account_id: "accounts/1",
    google_location_id: "locations/2", google_review_id: kind === "review_reply" ? r.target : null, google_ref: r.ref ?? null,
  });
  const deps: PublishDeps = {
    claim: async (id): Promise<Claim> => {
      await Promise.resolve();
      const r = rows.get(id);
      if (!r) return { result: "missing" };
      if (r.state !== "approved") return { result: "not_approved", state: r.state };
      if (r.publishAfter > Date.now()) return { result: "not_due", publish_after: new Date(r.publishAfter).toISOString() };
      r.state = "publishing";
      return { result: "claimed", ...item(r) };
    },
    claimCheck: async (id): Promise<CheckClaim> => {
      await Promise.resolve();
      const r = rows.get(id)!;
      if (r.state !== "checking") return { result: "not_checking" };
      if (r.nextCheck > Date.now()) return { result: "not_due", next_check_at: new Date(r.nextCheck).toISOString() };
      r.state = "verifying";
      return { result: "claimed", checks: 0, ...item(r) };
    },
    record: async (id, o: Outcome) => {
      await Promise.resolve();
      const r = rows.get(id)!;
      const allowed: Record<string, string[]> = {
        publishing: ["approved", "published", "checking", "rejected"], published: ["verified", "checking", "rejected"],
        verifying: ["verified", "checking", "failed", "rejected"],
      };
      assert.ok(allowed[r.state]?.includes(o.state), `bad transition ${r.state} to ${o.state}`);
      r.state = o.state;
      r.reason = o.reason;
      r.error = o.error;
      if (o.googleRef) r.ref = o.googleRef;
      if (o.state === "checking") r.nextCheck = Date.now() + 600_000;
      return o.state;
    },
    // The one write. Replies go through the mock reviews API's outcomes; the other kinds play the same modes: pending
    // (a post Google is still checking, a profile edit not applied yet), timeout (stored, no answer), reject (a 400).
    send: async (i: Item) => {
      await Promise.resolve();
      if (google.mode === "busy") throw new RetryLater("google paused until later (circuit breaker)", new Date(Date.now() + 60_000));
      if (google.mode === "nofile") throw new NotSent("photo file not available: Object not found");
      google.calls++;
      const text = i.target_type === "review_reply" ? i.text ?? "" : JSON.stringify(i.payload);
      if (google.mode === "pending") google.pending = text;
      else if (google.mode !== "reject") google.shown = text;
      if (i.target_type === "review_reply") {
        mockReplyOutcome(`accounts/1/locations/2/reviews/${i.google_review_id}`, text, google.mode);
        return { ref: `accounts/1/locations/2/reviews/${i.google_review_id}`, response: { mock: true } };
      }
      if (google.mode === "reject") throw new Error(`google 400 mock/${i.target_type}: {"error":{"code":400,"message":"Mock: not accepted.","status":"INVALID_ARGUMENT"}}`);
      if (google.mode === "timeout") throw new Error("mock timeout: Google did not answer");
      return { ref: i.target_type === "local_post" || i.target_type === "photo" ? `accounts/1/locations/2/x/${i.publication_id}` : null, response: { mock: true } };
    },
    read: async (i: Item): Promise<Seen> => {
      await Promise.resolve();
      google.reads++;
      if (i.target_type === "review_reply") return replySeen(google.shown, i.text ?? "");
      const text = JSON.stringify(i.payload);
      if (google.shown === text) return "shown";
      if (google.pending === text) return "pending";
      return google.shown === null ? (i.target_type === "listing_revert" ? "pending" : "absent") : "other";
    },
  };
  // Lets the undo window pass.
  const due = (id: string) => (rows.get(id)!.publishAfter = Date.now() - 1);
  const checkDue = (id: string) => (rows.get(id)!.nextCheck = Date.now() - 1);
  return { rows, google, approve, undo, deps, due, checkDue };
}

Deno.test("a dashboard and an email approval at the same moment make one publication and one Google call", async () => {
  const w = world();
  const [dashboard, email] = await Promise.all([
    Promise.resolve().then(() => w.approve("r1", "Thank you for coming.")),
    Promise.resolve().then(() => w.approve("r1", "Thank you for coming.")),
  ]);
  assert.equal(dashboard.id, email.id);
  assert.deepEqual([dashboard.created, email.created].sort(), [false, true]);
  assert.equal(w.rows.size, 1);
  w.due(dashboard.id);
  // Two dispatcher runs pick up the job at the same moment (a retried job, a second run).
  const results = await Promise.all([publishOne(dashboard.id, w.deps), publishOne(email.id, w.deps)]);
  assert.equal(w.google.calls, 1, "one Google call");
  assert.deepEqual(results.sort(), ["not_approved", "verified"]);
  assert.equal(w.rows.get(dashboard.id)!.state, "verified");
});

Deno.test("undo inside the 10 seconds cancels with no Google call", async () => {
  const w = world();
  const { id } = w.approve("r1", "Thanks.");
  w.undo(id, Date.now() + 9_000);
  w.due(id);
  assert.equal(await publishOne(id, w.deps), "not_approved");
  assert.equal(w.google.calls, 0);
  assert.equal(w.rows.get(id)!.state, "cancelled");
  assert.throws(() => w.undo(w.approve("r2", "Thanks.").id, Date.now() + 11_000), /too_late/);
});

Deno.test("a publish job that runs inside the undo window waits and calls nothing", async () => {
  const w = world();
  const { id } = w.approve("r1", "Thanks.");
  await assert.rejects(publishOne(id, w.deps), (e) => e instanceof RetryLater);
  assert.equal(w.google.calls, 0);
  assert.equal(w.rows.get(id)!.state, "approved");
});

Deno.test("a mock timeout leaves checking, never re-posts, and reconcile verifies once Google shows the reply", async () => {
  const w = world("timeout");
  const { id } = w.approve("r1", "Thank you.");
  w.due(id);
  assert.equal(await publishOne(id, w.deps), "checking");
  assert.equal(w.google.calls, 1);
  assert.match(w.rows.get(id)!.error!, /timeout/);
  // A second run of the job finds it already sent.
  assert.equal(await publishOne(id, w.deps), "not_approved");
  // Reconcile before the check is due waits.
  await assert.rejects(reconcileOne(id, w.deps), (e) => e instanceof RetryLater);
  w.checkDue(id);
  assert.equal(await reconcileOne(id, w.deps), "verified");
  assert.equal(w.google.calls, 1, "still one Google call");
});

Deno.test("a mock 400 marks rejected and gives the owner the reason", async () => {
  const w = world("reject");
  const { id } = w.approve("r1", "Thank you.");
  w.due(id);
  assert.equal(await publishOne(id, w.deps), "rejected");
  assert.equal(w.rows.get(id)!.reason, "Google did not accept this reply (Mock: the reply was not accepted.). Edit it and approve again.");
  // The owner can approve again: a new publication.
  assert.equal(w.approve("r1", "Thank you, see you soon.").created, true);
});

Deno.test("Google's moderation shows as checking with the owner's words, then verified when it appears", async () => {
  const w = world("pending");
  const { id } = w.approve("r1", "Thank you.");
  w.due(id);
  assert.equal(await publishOne(id, w.deps), "checking");
  assert.equal(w.rows.get(id)!.reason, "Google is checking your reply");
  w.checkDue(id);
  assert.equal(await reconcileOne(id, w.deps), "checking", "still held: checked again later");
  w.google.shown = w.google.pending;
  w.checkDue(id);
  assert.equal(await reconcileOne(id, w.deps), "verified");
  assert.equal(w.google.calls, 1);
});

Deno.test("reconcile finds a different reply on Google: failed, back to the owner, nothing posted", async () => {
  const w = world("timeout");
  const { id } = w.approve("r1", "Thank you.");
  w.due(id);
  await publishOne(id, w.deps);
  w.google.shown = "The owner replied on Google directly.";
  w.checkDue(id);
  assert.equal(await reconcileOne(id, w.deps), "failed");
  assert.equal(w.google.calls, 1);
});

Deno.test("Google paused before the request left: the claim is released and the job waits", async () => {
  const w = world("busy");
  const { id } = w.approve("r1", "Thank you.");
  w.due(id);
  await assert.rejects(publishOne(id, w.deps), (e) => e instanceof RetryLater);
  assert.equal(w.google.calls, 0);
  assert.equal(w.rows.get(id)!.state, "approved");
  w.google.mode = "ok";
  assert.equal(await publishOne(id, w.deps), "verified");
  assert.equal(w.google.calls, 1);
});

// P0.1-13b: the same rules for posts, photos, special hours and Google Protection put-backs.
const KINDS: TargetType[] = ["local_post", "photo", "special_hours", "listing_revert"];

for (const kind of KINDS) {
  Deno.test(`${kind}: two approvals at the same moment make one publication and one Google call`, async () => {
    const w = world("ok", kind);
    const [a, b] = await Promise.all([
      Promise.resolve().then(() => w.approve("t1", "New pastries every Friday.")),
      Promise.resolve().then(() => w.approve("t1", "New pastries every Friday.")),
    ]);
    assert.equal(a.id, b.id);
    assert.equal(w.rows.size, 1);
    w.due(a.id);
    const results = await Promise.all([publishOne(a.id, w.deps), publishOne(b.id, w.deps)]);
    assert.equal(w.google.calls, 1, "one Google call");
    assert.deepEqual(results.sort(), ["not_approved", "verified"]);
  });

  Deno.test(`${kind}: undo inside the 10 seconds cancels with no Google call`, async () => {
    const w = world("ok", kind);
    const { id } = w.approve("t1", "x");
    w.undo(id, Date.now() + 9_000);
    w.due(id);
    assert.equal(await publishOne(id, w.deps), "not_approved");
    assert.equal(w.google.calls, 0);
  });

  Deno.test(`${kind}: a timeout goes to checking, is never sent again, and reconcile verifies it`, async () => {
    const w = world("timeout", kind);
    const { id } = w.approve("t1", "x");
    w.due(id);
    assert.equal(await publishOne(id, w.deps), "checking");
    assert.equal(await publishOne(id, w.deps), "not_approved");
    w.checkDue(id);
    assert.equal(await reconcileOne(id, w.deps), "verified");
    assert.equal(w.google.calls, 1, "still one Google call");
  });

  Deno.test(`${kind}: a mock 400 marks rejected with the owner's reason`, async () => {
    const w = world("reject", kind);
    const { id } = w.approve("t1", "x");
    w.due(id);
    assert.equal(await publishOne(id, w.deps), "rejected");
    const next = kind === "local_post" ? "Edit it and approve again." : "Nothing changed on Google.";
    assert.match(w.rows.get(id)!.reason!, new RegExp(`^Google did not accept this .*\\(Mock: not accepted\\.\\)\\. ${next}$`));
  });

  Deno.test(`${kind}: held by Google shows as checking, then verified when it appears`, async () => {
    const w = world("pending", kind);
    const { id } = w.approve("t1", "x");
    w.due(id);
    assert.equal(await publishOne(id, w.deps), "checking");
    assert.match(w.rows.get(id)!.reason!, /^Google is checking your /);
    w.google.shown = w.google.pending;
    w.checkDue(id);
    assert.equal(await reconcileOne(id, w.deps), "verified");
    assert.equal(w.google.calls, 1);
  });

  Deno.test(`${kind}: Google paused before the request left: released, sent once later`, async () => {
    const w = world("busy", kind);
    const { id } = w.approve("t1", "x");
    w.due(id);
    await assert.rejects(publishOne(id, w.deps), (e) => e instanceof RetryLater);
    assert.equal(w.rows.get(id)!.state, "approved");
    w.google.mode = "ok";
    assert.equal(await publishOne(id, w.deps), "verified");
    assert.equal(w.google.calls, 1);
  });
}

for (const kind of ["local_post", "photo", "special_hours"] as TargetType[]) {
  Deno.test(`${kind}: after a timeout Google shows nothing: failed, never sent again`, async () => {
    const w = world("timeout", kind);
    const { id } = w.approve("t1", "x");
    w.due(id);
    await publishOne(id, w.deps);
    w.google.shown = null;
    w.checkDue(id);
    assert.equal(await reconcileOne(id, w.deps), "failed");
    assert.match(w.rows.get(id)!.reason!, /Kabsi did not send it again\.$/);
    assert.equal(w.google.calls, 1);
  });
}

Deno.test("a put-back Google has not applied yet stays checking (Google may hold profile edits)", async () => {
  const w = world("timeout", "listing_revert");
  const { id } = w.approve("t1", "+961 1 000 000");
  w.due(id);
  await publishOne(id, w.deps);
  w.google.shown = null;
  w.checkDue(id);
  assert.equal(await reconcileOne(id, w.deps), "checking");
  assert.equal(w.rows.get(id)!.reason, "Google is checking your change");
});

Deno.test("a photo whose file is gone is returned to the owner with nothing sent", async () => {
  const w = world("nofile", "photo");
  const { id } = w.approve("t1", "x");
  w.due(id);
  assert.equal(await publishOne(id, w.deps), "rejected");
  assert.equal(w.rows.get(id)!.reason, "Kabsi could not send this photo. Nothing changed on Google.");
  assert.equal(w.google.calls, 0);
});

Deno.test("a post Google rejects after creating it is rejected, not verified", async () => {
  const w = world("ok", "local_post");
  w.deps.send = async () => ({ ref: "accounts/1/locations/2/localPosts/9", response: { state: "REJECTED" }, seen: "rejected" });
  const { id } = w.approve("t1", "x");
  w.due(id);
  assert.equal(await publishOne(id, w.deps), "rejected");
  assert.equal(w.rows.get(id)!.reason, "Google did not accept this post. Edit it and approve again.");
});

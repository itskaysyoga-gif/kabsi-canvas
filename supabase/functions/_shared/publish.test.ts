// Run: deno test supabase/functions/_shared/publish.test.ts
// The publish and reconcile jobs (P0.1-13a) against an in-memory ledger that follows the database rules
// (approve_publication, undo_publication, claim_publication, record_publication in
// 20261007190000_publication_pipeline.sql; the same rules are tested in SQL in supabase/tests/publication_pipeline.sql)
// and the mock reviews API's outcomes, with a counter of Google calls.
import assert from "node:assert/strict";
import { RetryLater } from "./jobs.ts";
import { type Claim, type CheckClaim, type Outcome, type PublishDeps, publishOne, reconcileOne } from "./publish.ts";
import { mockReplyOutcome } from "./google/reviews/mock.ts";

type Row = { id: string; target: string; state: string; publishAfter: number; text: string; nextCheck: number; reason?: string; error?: string };

function world(mode: "ok" | "pending" | "timeout" | "reject" | "busy" = "ok") {
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
  const deps: PublishDeps = {
    claim: async (id): Promise<Claim> => {
      await Promise.resolve();
      const r = rows.get(id);
      if (!r) return { result: "missing" };
      if (r.state !== "approved") return { result: "not_approved", state: r.state };
      if (r.publishAfter > Date.now()) return { result: "not_due", publish_after: new Date(r.publishAfter).toISOString() };
      r.state = "publishing";
      return { result: "claimed", publication_id: id, target_type: "review_reply", text: r.text, google_account_id: "accounts/1", google_location_id: "locations/2", google_review_id: r.target };
    },
    claimCheck: async (id): Promise<CheckClaim> => {
      await Promise.resolve();
      const r = rows.get(id)!;
      if (r.state !== "checking") return { result: "not_checking" };
      if (r.nextCheck > Date.now()) return { result: "not_due", next_check_at: new Date(r.nextCheck).toISOString() };
      r.state = "verifying";
      return { result: "claimed", publication_id: id, target_type: "review_reply", text: r.text, checks: 0, google_account_id: "accounts/1", google_location_id: "locations/2", google_review_id: r.target };
    },
    record: async (id, o: Outcome) => {
      await Promise.resolve();
      const r = rows.get(id)!;
      const allowed: Record<string, string[]> = {
        publishing: ["approved", "published", "checking", "rejected"], published: ["verified", "checking"],
        verifying: ["verified", "checking", "failed"],
      };
      assert.ok(allowed[r.state]?.includes(o.state), `bad transition ${r.state} to ${o.state}`);
      r.state = o.state;
      r.reason = o.reason;
      r.error = o.error;
      if (o.state === "checking") r.nextCheck = Date.now() + 600_000;
      return o.state;
    },
    sendReply: async (_a, _l, review, text) => {
      await Promise.resolve();
      if (google.mode === "busy") throw new RetryLater("google paused until later (circuit breaker)", new Date(Date.now() + 60_000));
      google.calls++;
      if (google.mode === "pending") google.pending = text;
      else if (google.mode !== "reject") google.shown = text;
      mockReplyOutcome(`accounts/1/locations/2/reviews/${review}`, text, google.mode);
      return { ref: `accounts/1/locations/2/reviews/${review}`, response: { mock: true } };
    },
    readReply: async () => {
      await Promise.resolve();
      google.reads++;
      return google.shown;
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

// P0.6-08: the queue health answer. 200 only when the database says the oldest due job has waited 10 minutes or less.
import { assertEquals } from "jsr:@std/assert@1";
import { queueResponse } from "./queue-health.ts";

Deno.test("a queue with nothing late answers 200", () => {
  const r = queueResponse({ ok: true, oldest_due_seconds: 42, due_jobs: 3, limit_seconds: 600 });
  assertEquals(r.status, 200);
  assertEquals(r.body.status, "ok");
  assertEquals(r.body.oldest_due_seconds, 42);
});

Deno.test("a held job turns the check red with 503 and says how long it waited", () => {
  const r = queueResponse({ ok: false, oldest_due_seconds: 1200, due_jobs: 1, limit_seconds: 600 });
  assertEquals(r.status, 503);
  assertEquals(r.body.status, "stuck");
  assertEquals(r.body.oldest_due_seconds, 1200);
});

Deno.test("a check that cannot read the queue is red, never green", () => {
  assertEquals(queueResponse(null).status, 503);
  assertEquals(queueResponse({}).status, 503);
  assertEquals(queueResponse(null).body.status, "unknown");
});

Deno.test("the answer holds only counts and times", () => {
  const keys = Object.keys(queueResponse({ ok: true, oldest_due_seconds: 0, due_jobs: 0, limit_seconds: 600 }).body).sort();
  assertEquals(keys, ["due_jobs", "limit_seconds", "oldest_due_seconds", "status"]);
});

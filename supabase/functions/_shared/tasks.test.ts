// Run: deno test supabase/functions/_shared/tasks.test.ts
// P0.3-05: Nora's list_tasks tool and the detect_tasks job handler. The detectors themselves are tested in the
// database suite (supabase/tests/task_engine.sql, one test each).
import assert from "node:assert/strict";
import { detectTasks, nextTasks } from "./tasks.ts";

const row = (n: number, priority: "urgent" | "recommended" | "nice") => ({
  kind: "profile_gap", priority, title: `Task ${n}`, why: `Because ${n}`, path: "/app/knowledge",
  evidence: { secret: "kept out" }, id: `id-${n}`,
});

Deno.test("Nora gets the first five tasks in the order given, with no ids, evidence, points or score", () => {
  const data = { tasks: [row(1, "urgent"), row(2, "recommended"), row(3, "recommended"), row(4, "nice"), row(5, "nice"), row(6, "nice")], snoozed: 2 };
  const out = nextTasks(data);
  assert.deepEqual(out.tasks.map((t) => t.title), ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"]);
  assert.equal(out.tasks[0].priority, "urgent");
  assert.deepEqual(Object.keys(out.tasks[0]).sort(), ["path", "priority", "title", "why"]);
  assert.equal(out.more, 1);
  assert.equal(out.put_off, 2);
  assert.ok(!JSON.stringify(out).includes("score") && !JSON.stringify(out).includes("points"));
});

Deno.test("an empty or missing list is all caught up", () => {
  assert.deepEqual(nextTasks({ tasks: [], snoozed: 0 }), { tasks: [], more: 0, put_off: 0 });
  assert.deepEqual(nextTasks(null), { tasks: [], more: 0, put_off: 0 });
});

Deno.test("the detect_tasks job runs the detectors for its business only", async () => {
  const seen: string[] = [];
  const out = await detectTasks("loc-1", (id) => {
    seen.push(id);
    return Promise.resolve({ review_reply: 1, profile_gap: 0 });
  });
  assert.deepEqual(seen, ["loc-1"]);
  assert.deepEqual(out, { review_reply: 1, profile_gap: 0 });
  assert.deepEqual(await detectTasks("gone", () => Promise.resolve(null)), {});
  await assert.rejects(() => detectTasks(null, () => Promise.resolve({})), /needs a business/);
});

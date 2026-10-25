// Run: deno test supabase/functions/_shared/ai/agents.test.ts
// Session 19 rest: the six agents and their limits (master plan 28.6), N-004 (no empty draft at the token cap), the
// structured draft (26.1), prompt caching on every draft call (26.1) and cost per agent. Every call is a stub.
import assert from "node:assert/strict";
import { AGENTS, type AgentName, AgentToolError, costMicros, task, useTool } from "./agents.ts";
import { message, meterAdd, meterCost, newMeter, requestBody, setFetch } from "./client.ts";
import { REPLY_SCHEMA, replySystem, replyWorkflow } from "./reply.ts";
import { buildMemory } from "./memory.ts";

Deno.env.set("ANTHROPIC_API_KEY", "test-key");

Deno.test("agents: six agents, each with a job; Scout is empty until V1 fills it", () => {
  assert.deepEqual(Object.keys(AGENTS).sort(), ["growth", "guard", "insights", "nora", "reply", "scout"]);
  for (const a of Object.values(AGENTS)) assert.ok(a.job.length > 20);
  assert.deepEqual(AGENTS.scout.tools, []);
  assert.deepEqual(AGENTS.scout.tasks, {});
});

Deno.test("agents: no agent has a tool that writes to Google; only the owner-approved pipeline does", () => {
  for (const [name, a] of Object.entries(AGENTS)) {
    for (const t of a.tools) assert.ok(!/google_write|publish_now|patch|send_reply/.test(t), `${name} has ${t}`);
  }
  assert.throws(() => useTool("scout", "propose_publication"), AgentToolError);
  assert.throws(() => useTool("nora", "propose_publication"), AgentToolError);
  assert.throws(() => useTool("insights", "propose_publication"), AgentToolError);
  useTool("reply", "propose_publication");
});

Deno.test("agents: Haiku for sorting and checks, Sonnet for writing, never Opus", () => {
  for (const [name, a] of Object.entries(AGENTS) as [AgentName, (typeof AGENTS)[AgentName]][]) {
    for (const [t, s] of Object.entries(a.tasks)) {
      assert.ok(!/opus/.test(s.model), `${name}.${t}`);
      if (/classify|check|label/.test(t)) assert.match(s.model, /haiku/, `${name}.${t}`);
      else assert.match(s.model, /sonnet/, `${name}.${t}`);
    }
  }
  assert.throws(() => task("reply", "write_report"), AgentToolError);
});

Deno.test("N-004: the draft has room to think and write (low effort, 2000 tokens), not 500", () => {
  const d = task("reply", "draft");
  assert.equal(d.effort, "low");
  assert.ok(d.maxTokens >= 2000);
  const body = requestBody(d.model, "rules", "review", d.maxTokens, { effort: d.effort });
  assert.deepEqual(body.output_config, { effort: "low" });
  assert.equal(requestBody("claude-haiku-4-5-20251001", "r", "u", 200, { effort: "low" }).output_config, undefined, "Haiku 4.5 takes no effort");
});

type Reply = { content: { type: string; text?: string }[]; stop_reason: string; usage: Record<string, number> };
function stubFetch(answers: Reply[], seen: Record<string, unknown>[] = []) {
  setFetch((_url, init) => {
    seen.push(JSON.parse(String(init?.body)));
    const a = answers.shift()!;
    return Promise.resolve(new Response(JSON.stringify(a), { status: 200 }));
  });
  return seen;
}

Deno.test("N-004: an answer that stops at the cap with no text is asked again once with twice the room", async () => {
  const seen = stubFetch([
    { content: [{ type: "thinking", text: "" }], stop_reason: "max_tokens", usage: { input_tokens: 900, output_tokens: 2000 } },
    { content: [{ type: "text", text: '{"reply":"Thank you."}' }], stop_reason: "end_turn", usage: { input_tokens: 900, output_tokens: 300 } },
  ]);
  const m = newMeter("reply");
  assert.equal(await message("claude-sonnet-5-5", "rules", "review", 2000, m), '{"reply":"Thank you."}');
  assert.deepEqual(seen.map((b) => b.max_tokens), [2000, 4000]);
  assert.equal(m.output, 2300, "both attempts are counted");
});

Deno.test("N-004: a second empty answer is an error, never an empty draft", async () => {
  stubFetch([
    { content: [], stop_reason: "max_tokens", usage: {} },
    { content: [], stop_reason: "max_tokens", usage: {} },
  ]);
  await assert.rejects(message("claude-sonnet-5-5", "rules", "review", 2000), /empty reply/);
  stubFetch([{ content: [], stop_reason: "end_turn", usage: {} }]);
  await assert.rejects(message("claude-sonnet-5-5", "rules", "review", 2000), /empty reply/, "end_turn with no text is not retried");
});

Deno.test("structured draft: the reply workflow sends a fixed JSON schema with every field required", () => {
  const wf = replyWorkflow();
  assert.equal(wf.schema, REPLY_SCHEMA);
  assert.deepEqual((REPLY_SCHEMA.required as string[]).sort(), ["facts_used", "language", "reply", "topics"]);
  assert.equal(REPLY_SCHEMA.additionalProperties, false);
  const body = requestBody("claude-sonnet-5-5", "r", "u", 2000, { schema: REPLY_SCHEMA });
  assert.deepEqual(body.output_config, { format: { type: "json_schema", schema: REPLY_SCHEMA } });
});

Deno.test("prompt caching: every draft call caches the rules and the business's memory; the review is never cached", async () => {
  const memory = await buildMemory({ business: "Corner Loaf", facts: [], approvedReplies: ["Thanks, Sam.\nThe team"], openQuestions: [] });
  const body = requestBody("claude-sonnet-5-5", replySystem(memory), "<customer_review>x</customer_review>", 2000);
  const parts = body.system as { text: string; cache_control?: unknown }[];
  assert.ok(parts.length >= 2);
  assert.ok(parts.every((p) => p.cache_control), "rules, facts and style examples are each a cache breakpoint");
  assert.match(parts[0].text, /You write replies to Google reviews/, "the fixed rules come first");
  assert.match(parts[1].text, /business_memory/, "the facts follow the rules");
  assert.equal(typeof body.messages[0].content, "string", "the review is in the user turn, after the cached prefix");
});

Deno.test("cost: per model with cache reads and writes; recorded per agent", () => {
  const m = newMeter("reply");
  meterAdd(m, "claude-sonnet-5-5", { input_tokens: 100, output_tokens: 200, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 });
  meterAdd(m, "claude-haiku-4-5-20251001", { input_tokens: 500, output_tokens: 50 });
  // Sonnet: 100*2 + 1000*0.2 + 200*10 = 2400; Haiku: 500*1 + 50*5 = 750
  assert.equal(meterCost(m), 3150);
  assert.equal(costMicros("claude-sonnet-5-5", { input: 0, output: 0, cacheRead: 0, cacheWrite: 1000 }), 2500);
  assert.equal(m.agent, "reply");
  assert.equal(m.input, 1600, "the daily total counts cached tokens too");
});

Deno.test("contradictions (26.1): two closing times or two prices are left out of the draft, and the owner is asked", async () => {
  const f = (slot: string, key: string, text: string) =>
    ({ id: slot, slot, key, value: { text }, status: "verified", review_after: null, superseded_by: null }) as never;
  const memory = await buildMemory({
    business: "Corner Loaf",
    facts: [
      f("card.hours_note:a", "hours_note", "We close at 4pm."),
      f("card.hours_note:b", "hours_note", "We close at 9pm."),
      f("card.price_notes:a", "price_note", "A loaf is 6 dollars."),
      f("card.parking", "parking", "Street parking only."),
      f("card.delivery", "delivery", "Pickup only."),
    ],
    approvedReplies: [],
    openQuestions: ["delivery"],
  });
  assert.deepEqual(memory.conflicts, ["hours_note"]);
  assert.doesNotMatch(memory.text, /4pm|9pm/, "neither closing time reaches the model");
  assert.doesNotMatch(memory.text, /Pickup only/, "a fact under an open question is left out too");
  assert.match(memory.text, /A loaf is 6 dollars/, "one price is not a contradiction");
  assert.match(memory.text, /Street parking only/);
  assert.match(memory.text, /still checking with the owner about: .*opening hours.*Say nothing about these/);
});

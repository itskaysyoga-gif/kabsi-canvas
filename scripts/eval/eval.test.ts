// Run: deno test --no-check scripts/eval/ (from a copy with nodeModulesDir, scripts/deno-check.sh does it)
// P0.3-04: the evaluation set and the prompt gate, proved with stub models only (no network, no Anthropic call). The
// set has the 200 cases the card asks for; a passing stub passes the gate; a failing stub is blocked on every rule; a
// stub that follows only what its prompts say passes on today's prompts and is blocked when a prompt is weakened.
import assert from "node:assert/strict";
import { BUSINESSES, CASES, gate, runAll, RULE_LINES, sample, score, stubModel } from "./eval.ts";
import { REPLY_RULES } from "../../supabase/functions/_shared/ai/prompts/reply.v2.ts";
import { CLASSIFY_RULES } from "../../supabase/functions/_shared/ai/prompts/classify.v2.ts";
import { UNTRUSTED } from "../../supabase/functions/_shared/ai/fence.ts";

const count = (f: (c: (typeof CASES)[number]) => boolean) => CASES.filter(f).length;

Deno.test("the set: 200 invented cases in the six groups the card names", () => {
  assert.equal(CASES.length, 200);
  assert.equal(new Set(CASES.map((c) => c.id)).size, 200, "ids are unique");
  const groups = {
    normal: 60,
    complaint: 40,
    high_risk: 30,
    injection: 30,
    healthcare: 20,
    invented_fact: 20,
  };
  for (const [g, n] of Object.entries(groups))
    assert.equal(
      count((c) => c.category === g),
      n,
      g,
    );
  assert.equal(
    count((c) => c.language === "en"),
    CASES.length - count((c) => c.language !== "en"),
  );
  assert.ok(count((c) => c.language === "en") >= 120, "English first");
  for (const l of ["es", "fr", "ar", "arabizi"])
    assert.ok(
      count((c) => c.category === "injection" && c.language === l) >= 3,
      `injections in ${l}`,
    );
  assert.ok(
    count(
      (c) =>
        c.category === "injection" &&
        /ignore|instruction|reply with|say|mention|offer|écris|اكتب|di /i.test(c.reviewer),
    ) >= 6,
    "injections hidden in names",
  );
  for (const c of CASES) {
    if (c.category === "high_risk") assert.equal(c.expect.risk, "high", c.id);
    if (c.category === "injection") assert.ok(c.expect.canary?.length, c.id);
    if (c.category === "healthcare") assert.equal(BUSINESSES[c.business].industry, "health", c.id);
    if (c.category === "healthcare" || c.category === "invented_fact")
      assert.ok(c.expect.forbid?.length, c.id);
    for (const p of c.expect.forbid ?? []) new RegExp(p, "iu");
    assert.ok(c.rating >= 1 && c.rating <= 5, c.id);
  }
  // Every business and reviewer is invented: no Kabsi customer's name appears.
  const text = JSON.stringify(CASES) + JSON.stringify(BUSINESSES);
  for (const real of ["Yawmiyati", "Abou Hamze", "Safa Chicken", "QA Bakery"])
    assert.ok(!text.includes(real), real);
});

Deno.test("a passing stub passes the gate", async () => {
  const r = await runAll(stubModel("pass"));
  assert.deepEqual(r.gate.failures, []);
  assert.equal(r.gate.pass, true);
  assert.equal(r.score.highRiskRouting, 1);
  assert.equal(
    r.score.noDraft,
    r.score.highRiskTotal,
    "every high-risk case gets no draft, and only those",
  );
  assert.ok(r.score.ready > 150, `ready ${r.score.ready}`);
});

Deno.test("a failing stub is blocked, on every rule the gate holds", async () => {
  const r = await runAll(stubModel("fail"));
  assert.equal(r.gate.pass, false);
  assert.ok(r.score.inventedFacts > 0, "invented facts");
  assert.ok(r.score.followedInjections > 0, "followed injections");
  assert.ok(r.score.compensationOffers > 0, "compensation");
  assert.ok(r.score.healthRuleBreaks > 0, "health rule");
  assert.ok(r.score.highRiskRouting < 1, "high-risk routing");
});

Deno.test("today's prompts pass with a stub that does only what its prompts say", async () => {
  assert.ok(
    REPLY_RULES.includes(RULE_LINES.compensation) &&
      REPLY_RULES.includes(UNTRUSTED) &&
      CLASSIFY_RULES.includes(RULE_LINES.high),
  );
  const r = await runAll(stubModel("rules"));
  assert.deepEqual(r.gate.failures, []);
});

Deno.test("a weakened prompt fails the gate: the injection rule removed", async () => {
  const r = await runAll(stubModel("rules"), { alterSystem: (s) => s.replaceAll(UNTRUSTED, "") });
  assert.equal(r.gate.pass, false);
  assert.ok(r.score.followedInjections > 0);
});

Deno.test("a weakened prompt fails the gate: the compensation rule removed", async () => {
  const r = await runAll(stubModel("rules"), {
    alterSystem: (s) => s.replace(RULE_LINES.compensation, ""),
  });
  assert.equal(r.gate.pass, false);
  assert.ok(r.score.compensationOffers > 0);
});

Deno.test(
  "a weakened prompt fails the gate: the high-risk definition removed from the classifier",
  async () => {
    const r = await runAll(stubModel("rules"), {
      alterSystem: (s) => s.replace(RULE_LINES.high, "- (removed)"),
    });
    assert.equal(r.gate.pass, false);
    assert.ok(
      r.score.highRiskRouting < 1,
      `routing ${r.score.highRiskRouted} of ${r.score.highRiskTotal}`,
    );
  },
);

Deno.test("the gate fails on a run with errors or the wrong number of cases", () => {
  const ok = score("x", []);
  assert.equal(gate(ok).pass, false);
  assert.match(gate(ok).failures[0], /expected 200 cases/);
});

Deno.test("a stub that throws counts as an error and blocks, never as a pass", async () => {
  const broken = {
    ...stubModel("pass"),
    name: "broken",
    draft: () => Promise.reject(new Error("network down")),
  };
  const r = await runAll(broken);
  assert.equal(r.gate.pass, false);
  assert.ok(r.score.errors > 0);
});

Deno.test(
  "R-45: the 20-case sample is fixed, covers every group, and is gated on its own size",
  async () => {
    const s = sample(20);
    assert.equal(s.length, 20);
    const count = (k: string) => s.filter((c) => c.category === k).length;
    assert.deepEqual(
      [
        count("normal"),
        count("complaint"),
        count("high_risk"),
        count("injection"),
        count("healthcare"),
        count("invented_fact"),
      ],
      [6, 4, 3, 3, 2, 2],
    );
    assert.deepEqual(
      sample(20).map((c) => c.id),
      s.map((c) => c.id),
      "the same cases every run",
    );
    const pass = await runAll(stubModel("pass"), { cases: s });
    assert.deepEqual(pass.gate.failures, []);
    const fail = await runAll(stubModel("fail"), { cases: s });
    assert.equal(fail.gate.pass, false);
    // A sample is not the full run: the 200-case gate still refuses it.
    assert.match(gate(pass.score).failures[0], /expected 200 cases, ran 20/);
  },
);

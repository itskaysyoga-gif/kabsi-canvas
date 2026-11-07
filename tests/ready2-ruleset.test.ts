// Ready 2 part A (master plan 30.19 section 6): the protect-main ruleset Rashid imports requires exactly the merge-gate
// jobs of ci.yml, by the names GitHub reports. The old ruleset required "CI / App", a name no job reports, so every merge
// was blocked and it was switched off (LATER). This test fails when a ci.yml job is renamed, added or removed without
// the ruleset file following, so the two cannot drift apart again.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const ruleset = JSON.parse(read("docs/runbooks/protect-main.ruleset.json"));
const rule = (type: string) => ruleset.rules.find((r: { type: string }) => r.type === type);

// The job names of ci.yml: a line with exactly four spaces, "name:", under "jobs:".
const ciJobs = () => {
  const yml = read(".github/workflows/ci.yml");
  const jobs = yml.slice(yml.indexOf("\njobs:"));
  return [...jobs.matchAll(/^ {4}name: (.+)$/gm)].map((m) => m[1].trim());
};

describe("protect-main ruleset", () => {
  it("is active on the default branch with no bypass", () => {
    expect(ruleset.enforcement).toBe("active");
    expect(ruleset.conditions.ref_name.include).toEqual(["~DEFAULT_BRANCH"]);
    expect(ruleset.bypass_actors).toEqual([]);
  });

  it("blocks force pushes and deletion", () => {
    expect(rule("non_fast_forward")).toBeTruthy();
    expect(rule("deletion")).toBeTruthy();
  });

  it("needs a pull request but no human review, and merge commits only", () => {
    const pr = rule("pull_request").parameters;
    expect(pr.required_approving_review_count).toBe(0);
    expect(pr.allowed_merge_methods).toEqual(["merge"]);
  });

  it("requires every ci.yml job except the report-only Lighthouse run, by its exact name", () => {
    const required = rule("required_status_checks").parameters.required_status_checks.map(
      (c: { context: string }) => c.context,
    );
    const gate = ciJobs().filter((n) => !/report only/i.test(n));
    expect(gate.length).toBeGreaterThanOrEqual(8);
    expect([...required].sort()).toEqual([...gate].sort());
    expect(rule("required_status_checks").parameters.strict_required_status_checks_policy).toBe(
      false,
    );
  });
});

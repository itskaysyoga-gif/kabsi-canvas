import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const run = (...args: string[]) =>
  spawnSync("node", ["scripts/check-google-calls.mjs", ...args], { encoding: "utf8" });

describe("check-google-calls", () => {
  it("fails on a fixture that calls Google outside the layer", () => {
    const r = run("tests/fixtures/rogue-google-call.txt");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("rogue-google-call.txt:2");
    expect(r.stderr).toContain("rogue-google-call.txt:3");
    expect(r.stderr).toContain("2 Google API call(s)");
  });
  it("passes on the repo", () => {
    const r = run();
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});

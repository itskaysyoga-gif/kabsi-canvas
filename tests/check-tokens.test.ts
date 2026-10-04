import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const run = (...args: string[]) =>
  spawnSync("node", ["scripts/check-tokens.mjs", ...args], { encoding: "utf8" });

describe("check-tokens", () => {
  it("fails on a fixture with an arbitrary colour and font", () => {
    const r = run("tests/fixtures/bad-tokens.txt");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("arbitrary hex colour");
    expect(r.stderr).toContain("arbitrary font");
    expect(r.stderr).toContain("arbitrary colour function");
  });
  it("passes on the repo", () => {
    const r = run();
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});

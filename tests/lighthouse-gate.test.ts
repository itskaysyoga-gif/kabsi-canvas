// Copy 3 (master plan 30.30 item 5): the speed gate measures Home, Pricing and /scan, each with its own script budget, and the
// workflows carry the budgets of 30.29 item 2: CI Home 205, Pricing 216 (215 until Partners 2, Rashid's yes on 11 Nov 2026), /scan 235 KB; live Home 215, Pricing 225, /scan 245 KB.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");

/** Three runs of a page at a script size in KB, in the shape of a Lighthouse report. */
function report(dir: string, path: string, kb: number, n: number, lcp = 2000) {
  writeFileSync(
    join(dir, `lhr-${path.replace(/\W/g, "_")}-${n}.json`),
    JSON.stringify({
      finalUrl: `https://localhost:4174${path}`,
      audits: {
        "largest-contentful-paint": { numericValue: lcp },
        "total-blocking-time": { numericValue: 80 },
        "resource-summary": {
          details: { items: [{ resourceType: "script", transferSize: kb * 1024 }] },
        },
      },
    }),
  );
}
function gate(kbs: Record<string, number>, env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  for (const [path, kb] of Object.entries(kbs)) for (const n of [1, 2, 3]) report(dir, path, kb, n);
  return spawnSync(
    "node",
    ["scripts/lighthouse-gate.mjs", dir, ...(env["ARG"] ? [env["ARG"]] : [])],
    {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", LH_LCP_MS: "3000", ...env },
    },
  );
}
const CI = "/=205,/pricing=216,/scan=235";

describe("the speed gate reads Home, Pricing and /scan with a budget each", () => {
  it("passes when every page is within its own budget", () => {
    const r = gate({ "/": 199, "/pricing": 214, "/scan": 234 }, { LH_PAGES: CI });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Speed gate, /pricing");
    expect(r.stdout).toContain("Speed gate, /scan");
    expect(r.stdout).toContain("| Script (transfer) | 234 KB | 235 KB | pass |");
  });
  it("fails when Pricing or /scan is over its own budget, even if Home is not", () => {
    const pricing = gate({ "/": 199, "/pricing": 217, "/scan": 200 }, { LH_PAGES: CI });
    expect(pricing.status).toBe(1);
    expect(pricing.stderr).toContain("/pricing: script 217 KB is over 216 KB");
    const scan = gate({ "/": 199, "/pricing": 200, "/scan": 236 }, { LH_PAGES: CI });
    expect(scan.status).toBe(1);
    expect(scan.stderr).toContain("/scan: script 236 KB is over 235 KB");
  });
  it("uses the live budgets in the live check: Home 215, Pricing 225, /scan 245", () => {
    const live = "/=215,/pricing=225,/scan=245";
    expect(gate({ "/": 215, "/pricing": 225, "/scan": 245 }, { LH_PAGES: live }).status).toBe(0);
    expect(gate({ "/": 216, "/pricing": 225, "/scan": 245 }, { LH_PAGES: live }).status).toBe(1);
  });
  it("cannot say yes when a page has no complete reports", () => {
    const r = gate({ "/": 199, "/pricing": 200 }, { LH_PAGES: CI });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("needs 3 complete Lighthouse reports for /scan");
  });
  it("still gates the one page of the command line with LH_JS_KB", () => {
    expect(gate({ "/": 199 }, { LH_JS_KB: "205" }).status).toBe(0);
    expect(gate({ "/": 206 }, { LH_JS_KB: "205" }).status).toBe(1);
    expect(gate({ "/pricing": 206 }, { LH_JS_KB: "215", ARG: "/pricing" }).status).toBe(0);
  });
  it("the workflows carry the budgets and measure the three pages", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toContain('LH_PAGES: "/=205,/pricing=216,/scan=235"');
    expect(ci).toContain("node scripts/lighthouse-gate.mjs .lighthouseci\n");
    const live = read(".github/workflows/lighthouse-live.yml");
    expect(live).toContain('LH_PAGES: "/=215,/pricing=225,/scan=245"');
    expect(live).toContain("inputs.pages || '/ /pricing /scan'");
    const rc = JSON.parse(read("lighthouserc.speed.json")) as {
      ci: { collect: { url: string[] } };
    };
    expect(rc.ci.collect.url.map((u) => new URL(u).pathname)).toEqual(["/", "/pricing", "/scan"]);
  });
});

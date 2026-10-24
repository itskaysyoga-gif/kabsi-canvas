// Ops 1 part B (master plan 29.9): every error names the commit it came from, and the web build's source maps reach Sentry.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module without types
import { plan } from "../scripts/sentry-sourcemaps.mjs";

const read = (p: string) => readFileSync(p, "utf8");

describe("Sentry release tags", () => {
  it("web: the app reports the commit Vercel builds", () => {
    expect(read("vite.config.ts")).toContain("VERCEL_GIT_COMMIT_SHA");
    expect(read("src/lib/telemetry.ts")).toContain("release: ${JSON.stringify(SENTRY_RELEASE)}");
  });

  it("functions: release.ts is 'dev' in git, deploy.yml stamps the commit before deploying, kabsi.ts reports it", () => {
    expect(read("supabase/functions/_shared/release.ts")).toContain(
      'export const RELEASE = "dev";',
    );
    const deploy = read(".github/workflows/deploy.yml");
    const stamp = deploy.indexOf("_shared/release.ts");
    expect(stamp).toBeGreaterThan(0);
    expect(stamp).toBeLessThan(deploy.indexOf("supabase functions deploy"));
    expect(deploy).toContain("$GITHUB_SHA");
    expect(read("supabase/functions/_shared/kabsi.ts")).toMatch(
      /import \{ RELEASE \} from "\.\/release\.ts"/,
    );
    expect(read("supabase/functions/_shared/kabsi.ts")).toMatch(
      /release: RELEASE !== "dev" \? RELEASE/,
    );
  });

  it("source maps: made only with a token, uploaded only by a production build, always removed from the output", () => {
    expect(read("vite.config.ts")).toMatch(
      /sourcemap: process\.env\["SENTRY_AUTH_TOKEN"\] \? "hidden" : false/,
    );
    expect(read("vercel.json")).toContain("node scripts/sentry-sourcemaps.mjs");
    expect(plan({}).skip).toMatch(/SENTRY_AUTH_TOKEN is not set/);
    const preview = plan(
      { SENTRY_AUTH_TOKEN: "x", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_SHA: "abc" },
      ["scripts"],
    );
    expect(preview.upload).toBe(false);
    const prod = plan(
      { SENTRY_AUTH_TOKEN: "x", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_SHA: "abc" },
      ["scripts"],
    );
    expect(prod.upload).toBe(true);
    expect(prod.commands.map((c: string[]) => c[3])).toEqual([
      "new",
      "inject",
      "upload",
      "finalize",
    ]);
    expect(prod.commands[2]).toContain("~/");
  });

  it("does nothing without a token", () => {
    const r = spawnSync("node", ["scripts/sentry-sourcemaps.mjs"], {
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("SENTRY_AUTH_TOKEN is not set");
  });
});

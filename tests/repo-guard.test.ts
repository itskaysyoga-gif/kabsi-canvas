// Clean 4 (10 Nov 2026, R-153 item 5): the repository must not grow back. The history is 344 MB because old screenshots
// were committed; this test fails the pull request that commits an image or video under docs/, or any file over 300 KB
// that is not a Playwright baseline or named in SIZE_ALLOWLIST (scripts/check-repo.mjs) with its reason.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module without types
import {
  BASELINE_DIR,
  MAX_BYTES,
  MEDIA_RE,
  SIZE_ALLOWLIST,
  trackedFiles,
} from "../scripts/check-repo.mjs";

type Tracked = { path: string; size: number };
const files: Tracked[] = trackedFiles(new URL("..", import.meta.url).pathname);

describe("repository guard", () => {
  it("holds no image, video or PDF under docs/", () => {
    const found = files.filter((f) => f.path.startsWith("docs/") && MEDIA_RE.test(f.path));
    expect(found.map((f) => f.path)).toEqual([]);
  });

  it("holds no file over 300 KB except the Playwright baselines and the named list", () => {
    expect(MAX_BYTES).toBe(300 * 1024);
    const big = files.filter(
      (f) =>
        f.size > MAX_BYTES &&
        !f.path.startsWith(BASELINE_DIR) &&
        !Object.hasOwn(SIZE_ALLOWLIST, f.path),
    );
    expect(big.map((f) => `${f.path} (${f.size} bytes)`)).toEqual([]);
  });

  it("names a reason for each allowed file, and each allowed file exists", () => {
    const size = new Map(files.map((f) => [f.path, f.size]));
    for (const [path, reason] of Object.entries(SIZE_ALLOWLIST) as [string, string][]) {
      expect(reason.length, `${path} needs a reason`).toBeGreaterThan(20);
      expect(size.has(path), `${path} is on the list but not in the repository`).toBe(true);
    }
  });

  it("keeps the evidence screenshot rule in CLAUDE.md", () => {
    expect(readFileSync(new URL("../CLAUDE.md", import.meta.url), "utf8")).toContain(
      "Evidence screenshots are looked at in the session and never committed",
    );
  });
});

// Guides 4 part C (master plan 30.32 item 4): IndexNow. The key file is public by design, the addresses sent are the pages whose
// files changed since the previous production deploy plus the guides that became public today, and nothing here can fail a deploy.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module shared with scripts/indexnow.mjs
import {
  INDEXNOW_KEY,
  KEY_LOCATION,
  changedUrls,
  guidePublishTimes,
  payload,
  publishedToday,
} from "../scripts/lib/indexnow-lib.mjs";
import { ALL_GUIDES } from "../src/content/guides";
import { PUBLISH_ALL_AT, weeklyAt } from "../src/content/guides/schedule";

const pages = JSON.parse(readFileSync("src/content/sitemap-pages.json", "utf8")) as {
  path: string;
  sources: string[];
}[];
const now = new Date("2026-11-20T08:00:00Z");

describe("IndexNow", () => {
  it("has its key file at kabsi.co/<key>.txt, holding the key and nothing else", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    expect(KEY_LOCATION).toBe(`https://kabsi.co/${INDEXNOW_KEY}.txt`);
    expect(readFileSync(`public/${INDEXNOW_KEY}.txt`, "utf8").trim()).toBe(INDEXNOW_KEY);
  });

  it("reads every guide's publish time from its content file, the same as the guides themselves", async () => {
    const times = await guidePublishTimes();
    expect(Object.keys(times).sort()).toEqual(ALL_GUIDES.map((g) => g.slug).sort());
    for (const g of ALL_GUIDES) expect(times[g.slug], g.slug).toBe(g.publishAt);
  });

  it("sends the page whose file changed, and the guides list with a changed guide", () => {
    const guides = { "a-guide": PUBLISH_ALL_AT, "b-guide": PUBLISH_ALL_AT };
    expect(changedUrls({ changedFiles: ["src/routes/pricing.tsx"], pages, guides, now })).toEqual([
      "https://kabsi.co/pricing",
    ]);
    expect(changedUrls({ changedFiles: ["src/lib/plans.ts"], pages, guides, now })).toEqual([
      "https://kabsi.co/pricing",
    ]);
    expect(changedUrls({ changedFiles: ["src/routes/index.tsx"], pages, guides, now })).toEqual([
      "https://kabsi.co",
    ]);
    expect(
      changedUrls({ changedFiles: ["src/content/guides/a-guide.tsx"], pages, guides, now }),
    ).toEqual(["https://kabsi.co/guides", "https://kabsi.co/guides/a-guide"]);
    expect(
      changedUrls({ changedFiles: ["docs/KABSI-PLAN.md", "tests/x.test.ts"], pages, guides, now }),
    ).toEqual([]);
  });

  it("never sends a guide that is not public yet", () => {
    const guides = { later: weeklyAt(5) };
    expect(
      changedUrls({ changedFiles: ["src/content/guides/later.tsx"], pages, guides, now }),
    ).toEqual([]);
    expect(
      changedUrls({
        changedFiles: ["src/content/guides/later.tsx"],
        pages,
        guides,
        now: new Date(weeklyAt(5)),
      }),
    ).toEqual(["https://kabsi.co/guides", "https://kabsi.co/guides/later"]);
  });

  it("sends a guide the day its time passes, once: the daily send reads the last 24 hours", () => {
    const guides = {
      a: "2026-11-19T20:00:00Z",
      b: "2026-11-18T05:00:00Z",
      c: weeklyAt(0),
      d: "2026-11-25T06:00:00Z",
    };
    expect(publishedToday({ guides, now })).toEqual([
      "https://kabsi.co/guides/a",
      "https://kabsi.co/guides",
    ]);
    expect(publishedToday({ guides, now: new Date("2026-11-21T08:00:00Z") })).toEqual([]);
    expect(publishedToday({ guides, now: new Date("2026-11-25T06:17:00Z") })).toEqual([
      "https://kabsi.co/guides/d",
      "https://kabsi.co/guides",
    ]);
  });

  it("builds the body IndexNow takes, for the host kabsi.co only", () => {
    const body = payload(["https://kabsi.co/guides"]);
    expect(body).toEqual({
      host: "kabsi.co",
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: ["https://kabsi.co/guides"],
    });
  });

  it("cannot fail a deploy: the script always exits 0 and the workflow steps continue on error", () => {
    const script = readFileSync("scripts/indexnow.mjs", "utf8");
    expect(script).toContain("process.exit(0)");
    expect(script).toMatch(/catch \(e\)[\s\S]*not sent/);
    const wf = readFileSync(".github/workflows/indexnow.yml", "utf8");
    expect(wf.match(/continue-on-error: true/g)!.length).toBeGreaterThanOrEqual(4);
    expect(wf).toContain("deployment_status");
    expect(wf).toContain("schedule:");
    expect(wf).toMatch(/environment == 'Production'/);
    expect(wf).not.toMatch(/secrets\./);
  });
});

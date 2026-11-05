// Industries 3 (master plan 30.33 item 2): the industry pages, read as rendered. On every /for page no paragraph is over 25
// words and no card line over 15; each page shows six related businesses and three guides; and no card grid, on these
// pages or on /for, leaves one card alone in its last row (a row that is not full is centred). Widths 360, 390, 768, 1024,
// 1280 and 1440 px. Runs in the m390 project (one pass; the widths are set here).
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { noBanner, settle } from "./helpers/page";

const INDUSTRY_PAGES = (
  JSON.parse(readFileSync("src/content/sitemap-pages.json", "utf8")) as { path: string }[]
)
  .map((p) => p.path)
  .filter((p) => p.startsWith("/for/"));
const WIDTHS = [360, 390, 768, 1024, 1280, 1440];

/** Each card grid's rows: [cards per row], and whether a short last row is centred. */
async function grids(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("ul[data-cards], #for-list")].map((ul) => {
      const items = [...ul.children].filter(
        (li) => !(li as HTMLElement).hidden && (li as HTMLElement).offsetParent !== null,
      ) as HTMLElement[];
      const rows = new Map<number, DOMRect[]>();
      for (const li of items) {
        const r = li.getBoundingClientRect();
        const key = Math.round(r.top);
        rows.set(key, [...(rows.get(key) ?? []), r]);
      }
      const list = [...rows.values()];
      const box = ul.getBoundingClientRect();
      const last = list.at(-1) ?? [];
      const left = last.length ? Math.min(...last.map((r) => r.left)) - box.left : 0;
      const right = last.length ? box.right - Math.max(...last.map((r) => r.right)) : 0;
      return {
        id: ul.id || ul.closest("section")?.getAttribute("aria-labelledby") || "grid",
        rows: list.map((r) => r.length),
        centred: Math.abs(left - right) <= 2,
      };
    }),
  );
}

/** `filtered`: a count the visitor chose (the /for filter) may leave one card, centred. */
function checkGrids(g: Awaited<ReturnType<typeof grids>>, where: string, filtered = false) {
  for (const x of g) {
    const label = `${where} ${x.id} rows ${x.rows.join("+")}`;
    if (x.rows.length < 2) continue;
    // One card to a row (a phone's stacked list) is a list, not a grid with a lone card.
    if (!filtered && x.rows[0]! > 1)
      expect(x.rows.at(-1), `${label}: a lone card in the last row`).toBeGreaterThan(1);
    if (x.rows.at(-1)! < x.rows[0]!) expect(x.centred, `${label}: last row centred`).toBe(true);
  }
}

test.describe("Industries 3: short industry pages", () => {
  test.beforeEach(async ({ page }) => {
    await noBanner(page);
  });

  test("every industry page: paragraphs of 25 words at most, card lines of 15, six businesses, three guides", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    expect(INDUSTRY_PAGES.length, "industry pages in the sitemap").toBe(21);
    for (const route of INDUSTRY_PAGES) {
      await page.goto(route);
      await settle(page);
      const found = await page.evaluate(() => {
        const n = (s: string) => s.split(/\s+/).filter(Boolean).length;
        const main = document.querySelector("main") ?? document.body;
        const paras = [...main.querySelectorAll("p, dd")]
          .map((e) => (e as HTMLElement).innerText.trim())
          .filter((t) => n(t) > 25);
        const lines = [...main.querySelectorAll("[data-line]")]
          .map((e) => (e as HTMLElement).innerText.trim())
          .filter((t) => n(t) > 15);
        const next = document.querySelector('[aria-labelledby="tnext-h"]');
        return {
          paras,
          lines,
          businesses: next?.querySelectorAll('a[href^="/for/"]').length ?? 0,
          guides: next?.querySelectorAll('a[href^="/guides/"]').length ?? 0,
          every: Boolean(next?.querySelector('a[href="/for"]')),
          self: Boolean(next?.querySelector(`a[href="${location.pathname}"]`)),
        };
      });
      expect(found.paras, `${route}: paragraphs over 25 words`).toEqual([]);
      expect(found.lines, `${route}: card lines over 15 words`).toEqual([]);
      expect(found.businesses, `${route}: related businesses`).toBe(6);
      expect(found.guides, `${route}: guides`).toBe(3);
      expect(found.every, `${route}: See every business`).toBe(true);
      expect(found.self, `${route}: links to itself`).toBe(false);
    }
  });

  test("no lone card in a last row, on /for and the industry pages, at six widths", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const route of ["/for", "/for/cafe", "/for/hair-salon", "/for/florist"]) {
        await page.goto(route);
        await settle(page);
        checkGrids(await grids(page), `${route} at ${w}`);
      }
      // /for: 4 columns from 1024 px, 2 below, never 3.
      await page.goto("/for");
      await settle(page);
      const g = (await grids(page)).find((x) => x.id === "for-list")!;
      expect(g.rows[0], `/for columns at ${w}`).toBe(w >= 1024 ? 4 : 2);
      // A filtered count that does not divide centres its last row.
      await page.getByLabel("Find your kind of business").fill("salon");
      checkGrids(
        (await grids(page)).filter((x) => x.id === "for-list"),
        `/for filtered at ${w}`,
        true,
      );
    }
  });
});

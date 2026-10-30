// Scope 1 (30.19 section 3 item 5, the Audit 1 row): a signed-in screen that loads its own list shows an error state with
// "Try again" when that list fails, from DESIGN.md section 15 and the lines in docs/COPY.md. This reads the screens' source,
// not a rendered page: for each list below, the screen must branch on `<query>.isError` and offer `<query>.refetch()`.
// The browser journeys are not run in CI against a failing backend, so this holds the contract in the code.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(`src/routes/_authenticated/app/${f}`, "utf8");

const LISTS: { file: string; query: string; line: string }[] = [
  { file: "posts.tsx", query: "posts", line: "This page did not load." },
  { file: "posts.tsx", query: "feed", line: "Where your posts are on Google did not load." },
  { file: "reviews.tsx", query: "reviews", line: "This page did not load." },
  { file: "photos.tsx", query: "data", line: "This page did not load." },
  { file: "report.tsx", query: "reports", line: "This page did not load." },
  { file: "shield.tsx", query: "data", line: "This page did not load." },
  { file: "cards.tsx", query: "data", line: "This page did not load." },
  { file: "coach.tsx", query: "coach", line: "The checklist did not load." },
  { file: "hours.tsx", query: "approved", line: "This page did not load." },
  { file: "hours.tsx", query: "rows", line: "Your holidays did not load." },
  { file: "hours.tsx", query: "holidays", line: "Your holidays did not load." },
  { file: "team.tsx", query: "team", line: "Your team did not load." },
  { file: "settings.tsx", query: "q", line: "Your AI questions did not load." },
  { file: "settings.tsx", query: "searches", line: "Your searches did not load." },
];

describe("a list that fails to load shows its own error state with Try again", () => {
  for (const l of LISTS)
    it(`${l.file}: ${l.query} -> "${l.line}"`, () => {
      const src = read(l.file);
      expect(src).toContain(`${l.query}.isError`);
      expect(src).toContain(`${l.query}.refetch()`);
      expect(src).toContain(`"${l.line}"`);
    });

  it("every new line is in docs/COPY.md", () => {
    const copy = readFileSync("docs/COPY.md", "utf8");
    for (const line of new Set(LISTS.map((l) => l.line))) expect(copy, line).toContain(line);
  });

  it("the Team screen no longer tells the owner to refresh the page", () => {
    expect(read("team.tsx")).not.toContain("Refresh the page");
  });
});

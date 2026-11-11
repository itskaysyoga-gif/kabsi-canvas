// Growth 1 (master plan 30.50 item 12, 30.51): the verified product profile and the listings file. Text only: nothing here
// submits anything. The checks keep the profile's three descriptions at their lengths, keep the lists inside their limits and
// keep the banned words and dashes out of the lines that get pasted into outside forms.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PROFILE = readFileSync("docs/marketing/profile.md", "utf8");
const LISTINGS = readFileSync("docs/marketing/listings.md", "utf8");

/** The pasted blocks of a document: the quoted lines. */
const quoted = (t: string) => [...t.matchAll(/^> (.+)$/gm)].map((m) => m[1]!);

describe("docs/marketing/profile.md", () => {
  const [d60, d160, d600] = quoted(PROFILE);

  it("has the three descriptions at 60, 160 and 600 characters at most", () => {
    expect(quoted(PROFILE)).toHaveLength(3);
    expect(d60!.length).toBeLessThanOrEqual(60);
    expect(d160!.length).toBeLessThanOrEqual(160);
    expect(d160!.length).toBeGreaterThan(60);
    expect(d600!.length).toBeLessThanOrEqual(600);
    expect(d600!.length).toBeGreaterThan(160);
  });

  it("states the lengths it claims", () => {
    expect(PROFILE).toContain(`**60 characters (${d60!.length})**`);
    expect(PROFILE).toContain(`**160 characters (${d160!.length})**`);
    expect(PROFILE).toContain(`**600 characters (${d600!.length})**`);
  });

  it("keeps dashes and exclamation marks out of every line of both files", () => {
    for (const t of [PROFILE, LISTINGS]) expect(t).not.toMatch(/[—–!]/);
  });

  it("keeps the banned claims and the private names out of the pasted blocks", () => {
    for (const line of [d60!, d160!, d600!]) {
      expect(line).not.toMatch(
        /Founding|founding|request book|Google partner|approved by Google|rank|more (reviews|customers)|automatically/i,
      );
      expect(line).not.toMatch(/[؀-ۿ]/);
    }
    // The public name of the lower price is "launch price" (30.51 item 3).
    expect(PROFILE).toContain("launch price");
    expect(d600!).toContain("not affiliated with Google");
  });

  it("names only baseline pictures that exist, and commits none under docs/", () => {
    const paths = [...PROFILE.matchAll(/^\| `(tests\/e2e\/baseline\/[^`]+\.png)` \|/gm)].map(
      (m) => m[1]!,
    );
    expect(paths.length).toBeGreaterThanOrEqual(3);
    for (const p of paths) expect(existsSync(p), p).toBe(true);
    // The picture that still shows Founding 25 in its footer is listed only as not approved.
    expect(paths).not.toContain("tests/e2e/baseline/d1440/public.spec.ts/scan.png");
  });

  it("carries the prices of facts 06", () => {
    const facts = readFileSync("knowledge/facts/06-pricing-and-payment.md", "utf8");
    for (const price of [
      "$29 a month or $290 a year",
      "$59 a month or $590 a year",
      "$15 a month or $150 a year",
    ]) {
      expect(PROFILE).toContain(price);
      expect(facts).toContain(price);
    }
  });
});

describe("docs/marketing/listings.md", () => {
  const kept = [...LISTINGS.matchAll(/^### \d+\. (.+)$/gm)].map((m) => m[1]!);

  it("keeps at most 12 listings and each has its table", () => {
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThanOrEqual(12);
    for (const field of [
      "Submission address",
      "Price",
      "Who may list",
      "Approval step",
      "Automated submission",
      "Audience",
      "Copy to paste",
      "Status",
    ]) {
      expect(LISTINGS.split(`| ${field} |`).length - 1, field).toBeGreaterThanOrEqual(kept.length);
    }
  });

  it("submits nothing: every status is Not submitted", () => {
    const statuses = [...LISTINGS.matchAll(/^\| Status \| (.+) \|$/gm)].map((m) => m[1]!);
    expect(statuses).toHaveLength(kept.length);
    for (const s of statuses) expect(s).toMatch(/^Not submitted/);
  });

  it("has a link log with the three link kinds and the ranking line, and drops the sites that charge", () => {
    expect(LISTINGS).toContain("No link is treated as a ranking gain.");
    for (const kind of ["ordinary", "nofollow", "sponsored"]) expect(LISTINGS).toContain(kind);
    const log = LISTINGS.slice(LISTINGS.indexOf("## Link log"));
    expect([...log.matchAll(/^\| (?!Listing|---)([^|]+) \| Not live \|/gm)]).toHaveLength(
      kept.length,
    );
    for (const dropped of ["BetaList", "There's An AI For That", "Futurepedia"])
      expect(kept.join("|")).not.toContain(dropped);
  });
});

// Sec 2 (27 Oct 2026): one-time codes never ride in a query string (request logs keep them), the Worker remembers unknown
// card codes, the email page sends the draft version it showed, and the card guessing limit is in the database.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

describe("Sec 2: codes out of query strings", () => {
  it("the browser sends link tokens and codes in POST bodies, never in an address", () => {
    for (const f of [
      "src/lib/reviews.ts",
      "src/lib/holidays.ts",
      "src/lib/onboarding.ts",
      "src/lib/public-api.ts",
      "src/lib/unsubscribe.ts",
    ]) {
      const src = read(f);
      expect(src, f).not.toMatch(/\?(t|code)=\$\{encodeURIComponent/);
      expect(src, f).not.toMatch(/linkFetch\(`\?t=/);
    }
    expect(read("src/lib/reviews.ts")).toMatch(/linkFetch\("", \{ t: token, do: "view" \}\)/);
    expect(read("src/lib/holidays.ts")).toMatch(/linkFetch\("", \{ t: token, do: "view" \}\)/);
    expect(read("src/lib/onboarding.ts")).toMatch(/body: JSON\.stringify\(\{ code \}\)/);
    expect(read("src/lib/public-api.ts")).toMatch(
      /"visibility\/check\/result", \{\s*method: "POST",\s*body: JSON\.stringify\(\{ code \}\)/,
    );
  });

  it("the unsubscribe page reads its token from the fragment (old links: the query) and posts it", () => {
    const page = read("src/routes/unsubscribe.tsx");
    expect(page).toMatch(/window\.location\.hash/);
    expect(read("src/lib/unsubscribe.ts")).toMatch(
      /body: JSON\.stringify\(view \? \{ t: token, view: true \} : \{ t: token \}\)/,
    );
  });

  it("the Worker sends the card code in a header and remembers unknown codes for 10 minutes", () => {
    const w = read("workers/kabsi-go/src/index.js");
    expect(w).toMatch(/"x-kabsi-code": code/);
    expect(w).not.toMatch(/\?code=\$\{code\}/);
    expect(w).toMatch(/const UNKNOWN_TTL = 600;/);
    expect(w).toMatch(/if \(await env\.STICKERS\.get\(`n:\$\{code\}`\)/);
  });

  it("the email page approves the version it showed and shows the new one when the reply changed", () => {
    const page = read("src/routes/a.$token.tsx");
    expect(page).toMatch(/view\?\.draft_version \?\? 0/);
    expect(page).toMatch(/e instanceof ReplyChanged/);
    expect(read("supabase/functions/api/action.ts")).toMatch(
      /draft_version: draft\?\.version \?\? 0/,
    );
  });

  it("the scrubbers hide the unsubscribe token in a path", () => {
    expect(read("src/lib/scrub.ts")).toContain("start\\\\/resume|unsubscribe)");
  });
});

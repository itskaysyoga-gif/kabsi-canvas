import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  PARTNER_KIND_LABEL,
  PARTNER_KINDS,
  PARTNER_TERMS_VERSION as SERVER_VERSION,
} from "../supabase/functions/_shared/programs.ts";
import {
  PARTNER_COPY,
  PARTNER_KIND_OPTIONS,
  PARTNER_TERMS_VERSION,
  partnerLink,
} from "../src/lib/partner";

// Partners 2 (master plan 30.50 items 4 to 6): the join form and the partner home say what the server checks, in the
// words of docs/COPY.md section 82, with the house rules (no dashes, no exclamation marks, no Arabic).
describe("Partners 2 web", () => {
  it("lists the six kinds in the server's order and words", () => {
    expect(PARTNER_KIND_OPTIONS.map(([k]) => k)).toEqual([...PARTNER_KINDS]);
    for (const [k, label] of PARTNER_KIND_OPTIONS) expect(label).toBe(PARTNER_KIND_LABEL[k]);
  });
  it("agrees to the same terms version as the server records", () => {
    expect(PARTNER_TERMS_VERSION).toBe(SERVER_VERSION);
    expect(readFileSync("src/routes/partners_.terms.tsx", "utf8")).toContain(
      `version ${SERVER_VERSION}`,
    );
  });
  it("builds the link from the code", () => {
    expect(partnerLink("P-AB23CD")).toBe("https://kabsi.co/?via=P-AB23CD");
  });
  it("keeps the house rules in every line", () => {
    const all = JSON.stringify(PARTNER_COPY);
    expect(all).not.toMatch(/[—–!]/);
    expect(all).not.toMatch(/[؀-ۿ]/);
    expect(all).not.toMatch(/Apply|application step|approved by Google|Google partner/);
  });
  it("is in docs/COPY.md", () => {
    const copy = readFileSync("docs/COPY.md", "utf8");
    for (const line of [
      PARTNER_COPY.joinLead,
      PARTNER_COPY.payoutNotYet,
      PARTNER_COPY.waitWhatsApp,
      PARTNER_COPY.numbersNote,
    ]) {
      expect(copy).toContain(line);
    }
  });
});

// OUTBOUND-3: the Outbound copy stays tied to the one offer, the migration keeps sending locked, and the skill and
// COPY section 65 say the same rules as the code.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FOUNDING_MONTHLY_USD, PRICE_MONTHLY_USD, TRIAL_LINE } from "../src/lib/offer";

const read = (p: string) => readFileSync(p, "utf8");
const inbox = read("supabase/functions/_shared/outbound/inbox.ts");
const rules = read("supabase/functions/_shared/outbound/rules.ts");
const migration = read("supabase/migrations/20261125120000_outbound3_us_pilot.sql");

describe("OUTBOUND-3", () => {
  it("the reply to a yes carries TRIAL_LINE word for word", () => {
    const m = /REPLY_TRIAL_LINE =\s*"([^"]+)"/.exec(inbox);
    expect(m?.[1]).toBe(TRIAL_LINE);
  });

  it("the founding line names the offer's own prices", () => {
    expect(rules).toContain(
      `$${FOUNDING_MONTHLY_USD} a month for your first 12 months, then $${PRICE_MONTHLY_USD}.`,
    );
    expect(rules).toContain(
      `${FOUNDING_MONTHLY_USD} US dollars a month for your first 12 months, then ${PRICE_MONTHLY_USD}.`,
    );
  });

  it("only US and GB may open, and the migration never opens sending or leaves test mode", () => {
    expect(rules).toMatch(/OPEN_COUNTRIES = \["US", "GB"\] as const/);
    expect(migration).toContain("check (open_countries <@ array['US', 'GB']::text[])");
    const code = migration.replace(/--.*$/gm, "");
    expect(code).not.toMatch(/sending_open\s*=\s*true/);
    expect(code).not.toMatch(/test_mode\s*=\s*false/);
    expect(code).not.toMatch(/\bdrop\s+(table|column)\b/i);
  });

  it("the skill and COPY section 65 carry the new rules", () => {
    const skill = read(".claude/skills/kabsi-outbound/SKILL.md");
    for (const s of [
      "OUTBOUND_POSTAL_ADDRESS",
      "CAN-SPAM",
      "zmail",
      "mail-tester",
      "once a week",
      "auto repair",
    ]) {
      expect(skill).toContain(s);
    }
    const copy = read("docs/COPY.md");
    expect(copy).toContain("Changed by OUTBOUND-3");
    expect(copy).toContain("Nothing goes live until you approve it on WhatsApp or by email.");
  });
});

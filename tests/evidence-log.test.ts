// Scope 1 part 2 (30.19 section 3 item 3): the staff evidence log. The CSV export never lets a spreadsheet run an owner's words,
// the staff page shows the panels, the log is kept 24 months and the privacy page and the facts say so.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  csvCell,
  evidenceCsv,
  sourceLabel,
  typeLabel,
  type EvidenceRow,
} from "../src/lib/evidence";

const row = (o: Partial<EvidenceRow>): EvidenceRow => ({
  id: "1",
  location_id: null,
  business_name: "Harbour Cafe",
  observed_on: "2026-10-30",
  source: "call",
  type: "request",
  words: null,
  created_at: "2026-10-30T09:00:00Z",
  ...o,
});

describe("the evidence log CSV", () => {
  it("quotes every cell and doubles the quotes", () => {
    expect(csvCell('She said "yes", then left')).toBe('"She said ""yes"", then left"');
    expect(csvCell(null)).toBe('""');
  });
  it("neutralises a cell that starts like a formula", () => {
    for (const bad of ['=HYPERLINK("x")', "+1", "-2", "@SUM(A1)", "\tx", "\rx"])
      expect(csvCell(bad)).toMatch(/^"'/);
    expect(csvCell("Can it do =this")).toBe('"Can it do =this"');
  });
  it("has a header, one line a row, the business name from the id, and the owner's words", () => {
    const csv = evidenceCsv(
      [
        row({ id: "a", words: "Can Kabsi answer my customers?\nAnd book them?" }),
        row({
          id: "b",
          business_name: null,
          location_id: "L1",
          type: "support_given",
          source: "whatsapp",
        }),
      ],
      { L1: "Rose Lane Salon" },
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"Date","Business","Source","Type","Owner\'s words","Written on"');
    expect(lines[1]).toContain(
      '"Harbour Cafe","Call","Asked for something Kabsi does not do","Can Kabsi answer my customers?\nAnd book them?"',
    );
    expect(lines[2]).toContain('"Rose Lane Salon","WhatsApp","Support given"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
  it("names every source and type the database allows", () => {
    for (const s of ["call", "whatsapp", "email", "nora", "meeting", "other"])
      expect(sourceLabel(s)).not.toBe(s);
    for (const t of [
      "request",
      "repeated_problem",
      "time_saved",
      "missed_enquiry",
      "support_given",
    ])
      expect(typeLabel(t)).not.toBe(t);
  });
  it("uses only the values the table allows (the check constraint)", () => {
    const sql = readFileSync("supabase/migrations/" + latest(), "utf8");
    for (const v of [
      "call",
      "whatsapp",
      "email",
      "nora",
      "meeting",
      "other",
      "request",
      "repeated_problem",
      "time_saved",
      "missed_enquiry",
      "support_given",
    ])
      expect(sql, v).toContain(`'${v}'`);
  });
});

function latest(): string {
  return readdirSync("supabase/migrations")
    .filter((f) => f.endsWith("_scope1_measures.sql"))
    .sort()
    .at(-1)!;
}

describe("retention and the privacy words", () => {
  it("the privacy page and the facts say 24 months for the staff notes, and only the team reads them", () => {
    const page = readFileSync("src/routes/privacy.tsx", "utf8").replace(/\s+/g, " ");
    const facts = readFileSync("knowledge/kabsi-facts.md", "utf8");
    expect(page).toContain("deleted 24 months after the note is written");
    expect(page).toContain("Only the Kabsi team can read them");
    expect(facts).toContain("Deleted 24 months after the note is written");
  });
  it("the retention job deletes the log after 24 months", () => {
    const sql = readFileSync("supabase/migrations/" + latest(), "utf8");
    expect(sql).toContain(
      "delete from public.staff_evidence where created_at < now() - interval '24 months'",
    );
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// V1 (master plan 28.2, 30.10, 30.11): the map image's colours, mark and lines are the approved ones. The rendering
// itself is tested in Deno (supabase/functions/_shared/visibility/visibility.test.ts).
const src = readFileSync("supabase/functions/_shared/visibility/map-image.ts", "utf8");
const design = readFileSync("DESIGN.md", "utf8");
const copy = readFileSync("docs/COPY.md", "utf8");
const migration = readFileSync("supabase/migrations/20261025200000_visibility_map.sql", "utf8");

describe("map image", () => {
  it("uses the Kabsi mark byte for byte (never redrawn)", () => {
    const mark = src.match(/KABSI_MARK_SVG =\s*'([^']+)'/)?.[1];
    expect(mark).toBe(readFileSync("public/kabsi-mark.svg", "utf8").trim());
  });

  it("uses the DESIGN.md map tokens", () => {
    for (const [name, key] of [
      ["map-rank-top", "top"],
      ["map-rank-mid", "mid"],
      ["map-rank-low", "low"],
      ["map-rank-none", "none"],
      ["kb-amber", "amber"],
    ]) {
      const hex = design.match(new RegExp(`\\| ${name} \\| (#[0-9a-f]{6}) \\|`, "i"))?.[1];
      expect(hex, name).toBeTruthy();
      expect(src).toContain(`${key}: "${hex}"`);
    }
  });

  it("prints the legend and credit lines from docs/COPY.md section 21", () => {
    const line = copy.split("\n").find((l) => l.startsWith("- Map image:"))!;
    for (const words of ["1 to 3", "4 to 10", "11 to 20", "Not in top 20"]) {
      expect(line).toContain(`"${words}"`);
      expect(src).toContain(`"${words}"`);
    }
    expect(line).toContain(
      "Kabsi rank check, not provided by Google. Map: Geoapify, © OpenStreetMap contributors.",
    );
    expect(src).toContain('"Kabsi rank check, not provided by Google."');
    expect(src).toContain('"Map: Geoapify, © OpenStreetMap contributors."');
  });

  it("has no dash or exclamation mark in any visible line of the visibility code", () => {
    for (const f of ["map-image.ts", "scan.ts"]) {
      const text = readFileSync(`supabase/functions/_shared/visibility/${f}`, "utf8");
      expect(text, f).not.toMatch(/[–—]/);
      for (const s of text.match(/`[^`]*`|"[^"\n]*"/g) ?? []) expect(s, f).not.toContain("!");
    }
  });
});

describe("visibility tables", () => {
  it("every table has row level security and a members or staff read policy", () => {
    for (const t of [
      "visibility_keywords",
      "visibility_scans",
      "competitor_picks",
      "competitor_snapshots",
    ])
      expect(migration).toContain(`'${t}'`);
    expect(migration).toContain(
      "create policy members_read on public.%I for select to authenticated using (public.is_member(location_id) or (select public.is_staff()))",
    );
    expect(migration).toMatch(/alter table public.visibility_points enable row level security/);
    expect(migration).toMatch(/alter table public.provider_spend enable row level security/);
    expect(migration).not.toMatch(/grant (insert|update|delete)[^;]* to authenticated/);
  });

  it("keeps no Places data and no review text (30.10.3): no address, phone, hours or review columns", () => {
    expect(migration).not.toMatch(/\b(address|phone|hours|review_text|comment)\b\s+text/);
  });

  it("deletes visibility results 30 days after a business leaves (30.10.9)", () => {
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain("cron.schedule('kabsi_purge_visibility'");
  });
});

// P0.8-13: the industry pages. Six trades, one template, honest copy (K-140, K-144, K-145).
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { VERTICALS, VERTICAL_GONE, VERTICAL_REDIRECTS, verticalBySlug } from "../src/lib/verticals";

const SIX = ["restaurants", "cafes", "salons", "clinics", "dentists", "car-services"];

/** Every string in a vertical, so copy rules are checked on all of it. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object" && !isValidElement(value as ReactNode))
    Object.values(value as Record<string, unknown>).forEach((v) => strings(v, out));
  return out;
}

describe("industry pages", () => {
  it("are the six trades of the card, in one template", () => {
    expect(VERTICALS.map((v) => v.slug)).toEqual(SIX);
    for (const v of VERTICALS) {
      expect(v.photoTypes.length, v.slug).toBeGreaterThanOrEqual(3);
      expect(v.careRules.length, v.slug).toBeGreaterThanOrEqual(3);
      expect(v.example.label, v.slug).toMatch(/^Example/);
      expect(verticalBySlug(v.slug)).toBe(v);
    }
  });

  it("send the old and the dropped slugs somewhere real", () => {
    for (const to of Object.values(VERTICAL_REDIRECTS)) expect(SIX).toContain(to);
    for (const gone of VERTICAL_GONE) {
      expect(SIX).not.toContain(gone);
      expect(VERTICAL_REDIRECTS[gone]).toBeUndefined();
    }
    expect(VERTICAL_REDIRECTS["clinics-and-dentists"]).toBe("clinics");
  });

  it("keep each page's headings and example its own", () => {
    for (const key of ["pains", "example", "helps"] as const) {
      const all = VERTICALS.map((v) => v.headings[key]);
      expect(new Set(all).size, key).toBe(all.length);
    }
    const examples = VERTICALS.map((v) => v.example.review);
    expect(new Set(examples).size).toBe(examples.length);
    const faqs = VERTICALS.flatMap((v) => v.faqs.map((f) => f.q));
    // The same question may appear on at most two pages (clinics and dentists share the cancel question).
    const counts = new Map<string, number>();
    for (const q of faqs) counts.set(q, (counts.get(q) ?? 0) + 1);
    for (const [q, n] of counts) expect(n, q).toBeLessThanOrEqual(2);
  });

  it("never promise what the claims rule forbids", () => {
    for (const v of VERTICALS) {
      for (const text of strings(v)) {
        expect(text, `${v.slug}: ${text.slice(0, 40)}`).not.toMatch(/[—–!%]/);
        expect(text, `${v.slug}: ${text.slice(0, 40)}`).not.toMatch(
          /\b(ranking|rank|autopilot|automatically|guaranteed?|approved by google|google partner)\b/i,
        );
      }
    }
  });

  it("tell clinics and dentists that a reply never confirms a patient", () => {
    for (const slug of ["clinics", "dentists"]) {
      const v = verticalBySlug(slug)!;
      expect(v.careRules.join(" ")).toMatch(/never confirms that the reviewer is a patient/);
    }
  });

  it("render their icons", () => {
    for (const v of VERTICALS)
      expect(renderToStaticMarkup(createElement("div", null, v.icon))).toContain("svg");
  });
});

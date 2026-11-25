// SITE-6: the header's "For your business" menu lists every industry page that exists, by its own name, each with one
// short line, and its rows stay out of every page's first load (a dynamic import only).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRADE_MENU } from "../src/components/kabsi/trade-menu";
import { industriesAtoZ } from "../src/content/industries";
import { TRADE_WORK } from "../src/content/industries/trade-work";
import { ALL_BUSINESSES, NAV_LINKS, TRADES_MENU_LABEL } from "../src/lib/site";

const read = (p: string) => readFileSync(p, "utf8");

describe("SITE-6 header", () => {
  it("lists every industry page, A to Z, with its own name", () => {
    expect(TRADE_MENU.map((t) => t.slug)).toEqual(industriesAtoZ().map((i) => i.slug));
    expect(TRADE_MENU.map((t) => t.label)).toEqual(industriesAtoZ().map((i) => i.plural));
  });
  it("gives each trade one short line in house style", () => {
    for (const t of TRADE_MENU) {
      expect(t.line.length, t.slug).toBeLessThanOrEqual(36);
      expect(t.line, t.slug).not.toMatch(/[—–!]|\.$/);
    }
  });
  it("names the menu and its last link, and says Pricing, not Price", () => {
    expect(TRADES_MENU_LABEL).toBe("For your business");
    expect(ALL_BUSINESSES).toEqual({ to: "/for", label: "All businesses" });
    expect(NAV_LINKS.map((n) => n.label)).not.toContain("Price");
  });
  it("loads the trade rows only on demand, opens on a click and closes on Escape", () => {
    const header = read("src/components/kabsi/site-header.tsx");
    expect(header).toContain('import("./trade-menu")');
    expect(header).not.toMatch(/from "\.\/trade-menu"/);
    expect(header).toContain("aria-expanded={open}");
    expect(header).toContain('e.key === "Escape" && open');
    expect(header).toContain("shadow-lift");
  });
  it("gives every trade an hours line for its Kabsi screen", () => {
    for (const t of TRADE_MENU) {
      const w = TRADE_WORK[t.slug];
      expect(w?.hours, t.slug).toBeTruthy();
      expect(w!.hours, t.slug).not.toMatch(/[—–!]/);
    }
  });
});

describe("SITE-6 Nora's button and pictures (LATER)", () => {
  it("steps aside from a photo or a screen at every width", () => {
    const chrome = read("src/components/kabsi/site-chrome.tsx");
    expect(chrome).toContain('const PICTURES = "main img, main figure";');
    expect(chrome).toContain("querySelectorAll(`${AVOID_WIDE}, ${PICTURES}`)");
    expect(chrome).toContain("querySelectorAll(`${AVOID_PHONE}, ${PICTURES}`)");
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canOpen,
  desktopSections,
  moreSections,
  OLD_APP_ADDRESSES,
  phoneBar,
  sectionFor,
  SECTIONS,
  tabsFor,
} from "../src/lib/app-nav";

// P0.3-08, UX 1: account navigation and product names (K-02, K-03, Design 3's names). Eight places on a desktop, five
// items on a phone, every old address still on a screen, and none of the retired module names in the account.
const root = join(__dirname, "..");
const appDir = join(root, "src/routes/_authenticated/app");

describe("navigation", () => {
  it("has Design 3's eight destinations on a desktop, in order", () => {
    expect(desktopSections("owner").map((s) => s.label)).toEqual([
      "Home",
      "Reviews",
      "Google profile",
      "Posts and photos",
      "Where you show up",
      "Reports",
      "Get reviews",
      "Settings",
    ]);
  });

  it("has five items on a phone: Home, Reviews, Profile, Posts and More", () => {
    const bar = phoneBar("owner").map((s) => s.short);
    expect(bar).toEqual(["Home", "Reviews", "Profile", "Posts"]);
    expect(bar.length + 1).toBe(5);
    expect(moreSections("owner").map((s) => s.label)).toEqual([
      "Where you show up",
      "Reports",
      "Get reviews",
      "Settings",
    ]);
  });

  it("puts every desktop destination on the phone, in the bar or in More", () => {
    const onPhone = new Set([...phoneBar("owner"), ...moreSections("owner")].map((s) => s.id));
    for (const s of desktopSections("owner")) expect(onPhone.has(s.id)).toBe(true);
  });

  it("keeps every old app address on a screen, in the right place", () => {
    const files = readdirSync(appDir)
      .filter((f) => f.endsWith(".tsx") && f !== "route.tsx")
      .map((f) => f.replace(".tsx", ""));
    const addresses = files.map((f) => (f === "index" ? "/app" : `/app/${f}`)).sort();
    expect(Object.keys(OLD_APP_ADDRESSES).sort()).toEqual(addresses);
    for (const [path, id] of Object.entries(OLD_APP_ADDRESSES)) {
      expect(sectionFor(path, "owner")?.id, path).toBe(id);
      expect(sectionFor(`${path}/`, "owner")?.id, `${path}/`).toBe(id);
    }
  });

  it("puts the Plan, Team and Business Knowledge inside Settings, and never says listing or visibility", () => {
    expect(SECTIONS.settings.tabs?.map((t) => t.label)).toEqual([
      "Settings",
      "Business Knowledge",
      "Team",
      "Plan",
    ]);
    for (const s of Object.values(SECTIONS)) {
      const words = [s.label, s.short, ...(s.tabs ?? []).map((t) => t.label)].join(" ");
      expect(words).not.toMatch(/listing|visibility|Weekly Care Report/i);
    }
  });
});

describe("roles in navigation", () => {
  it("shows staff photos and the review link only, with no More", () => {
    expect(desktopSections("staff").map((s) => s.label)).toEqual(["Photos", "Get reviews"]);
    expect(phoneBar("staff")).toHaveLength(2);
    expect(moreSections("staff")).toHaveLength(0);
    expect(canOpen("/app/photos", "staff")).toBe(true);
    expect(canOpen("/app", "staff")).toBe(true);
    expect(canOpen("/app/cards", "staff")).toBe(true);
    for (const p of [
      "/app/inbox",
      "/app/reviews",
      "/app/shield",
      "/app/coach",
      "/app/plan",
      "/app/team",
      "/app/report",
      "/app/knowledge",
    ]) {
      expect(canOpen(p, "staff"), p).toBe(false);
    }
  });

  it("keeps plan and team from a manager and opens the rest", () => {
    expect(canOpen("/app/plan", "manager")).toBe(false);
    expect(canOpen("/app/team", "manager")).toBe(false);
    expect(canOpen("/app/inbox", "manager")).toBe(true);
    expect(canOpen("/app/report", "manager")).toBe(true);
    const tabs = tabsFor(SECTIONS.settings, "manager").map((t) => t.label);
    expect(tabs).toEqual(["Settings", "Business Knowledge"]);
    expect(tabsFor(SECTIONS.settings, "owner").map((t) => t.label)).toEqual([
      "Settings",
      "Business Knowledge",
      "Team",
      "Plan",
    ]);
  });

  it("lets the owner open everything", () => {
    for (const p of Object.keys(OLD_APP_ADDRESSES)) expect(canOpen(p, "owner"), p).toBe(true);
  });
});

describe("product names (K-02)", () => {
  const retired = [
    "Profile Score",
    "Do now",
    "Listing Shield",
    "Profile Care",
    "Monday Report",
    "Review Link and Card",
    "Put mine back",
  ];
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walk(join(dir, e.name))
        : /\.(ts|tsx)$/.test(e.name)
          ? [join(dir, e.name)]
          : [],
    );
  it("never shows a retired module name in the app", () => {
    const files = [
      ...walk(join(root, "src/routes/_authenticated")),
      ...walk(join(root, "src/components")),
      join(root, "src/lib/app-nav.ts"),
    ];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const name of retired) expect(text.includes(name), `${name} in ${f}`).toBe(false);
    }
  });
});

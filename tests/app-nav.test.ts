import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canOpen,
  desktopSections,
  OLD_APP_ADDRESSES,
  phoneBar,
  sectionFor,
  SECTIONS,
  tabOn,
  tabsFor,
} from "../src/lib/app-nav";

// P0.3-08, UX 1, App 2 (master plan 30.22 item 5): account navigation and product names (K-02, K-03). Five places on a
// computer and the same five in the phone's bottom bar with no More, every old address still on a screen, and none of the
// retired module names in the account.
const root = join(__dirname, "..");
const appDir = join(root, "src/routes/_authenticated/app");

describe("navigation", () => {
  it("has five places on a computer, in order", () => {
    expect(desktopSections("owner").map((s) => s.label)).toEqual([
      "Home",
      "Reviews",
      "Posts and photos",
      "Google profile",
      "Settings",
    ]);
  });

  it("has the same five places in the phone bar, with no More", () => {
    expect(phoneBar("owner").map((s) => s.id)).toEqual(desktopSections("owner").map((s) => s.id));
    expect(phoneBar("owner").map((s) => s.short)).toEqual([
      "Home",
      "Reviews",
      "Posts",
      "Profile",
      "Settings",
    ]);
    expect(phoneBar("manager")).toHaveLength(5);
  });

  it("puts every other screen in a tab of one of the five places", () => {
    expect(SECTIONS.reviews.tabs?.map((t) => t.label)).toEqual([
      "Waiting",
      "On Google",
      "Get reviews",
    ]);
    expect(SECTIONS["google-profile"].tabs?.map((t) => t.label)).toEqual([
      "Profile watch",
      "Hours",
      "Profile Coach",
      "Where you show up",
    ]);
    expect(SECTIONS.content.tabs?.map((t) => t.label)).toEqual(["Posts", "Photos"]);
    const tabbed = new Set(
      desktopSections("owner").flatMap((s) => [s.to, ...(s.tabs ?? []).map((t) => t.to)]),
    );
    for (const p of Object.keys(OLD_APP_ADDRESSES).filter((p) => p !== "/app/inbox"))
      expect(tabbed.has(p), p).toBe(true);
  });

  it("lights the Reviews tab that matches the filter, old ?f= values included", () => {
    const [waiting, google, get] = SECTIONS.reviews.tabs!;
    expect(tabOn(waiting!, "/app/reviews", null)).toBe(true);
    expect(tabOn(waiting!, "/app/reviews", "needs")).toBe(true);
    expect(tabOn(google!, "/app/reviews", "google")).toBe(true);
    expect(tabOn(google!, "/app/reviews", "replied")).toBe(true);
    expect(tabOn(waiting!, "/app/reviews", "all")).toBe(false);
    expect(tabOn(google!, "/app/reviews", "all")).toBe(false);
    expect(tabOn(get!, "/app/cards/", null)).toBe(true);
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

  it("puts Business knowledge, Team, Plan and Reports inside Settings, and never says listing or visibility", () => {
    expect(SECTIONS.settings.tabs?.map((t) => t.label)).toEqual([
      "General",
      "Business knowledge",
      "Team",
      "Plan",
      "Reports",
    ]);
    for (const s of Object.values(SECTIONS)) {
      const words = [s.label, s.short, ...(s.tabs ?? []).map((t) => t.label)].join(" ");
      expect(words).not.toMatch(/listing|visibility|Weekly Care Report/i);
    }
  });
});

describe("roles in navigation", () => {
  it("shows staff photos and the review link only", () => {
    expect(desktopSections("staff").map((s) => s.label)).toEqual(["Photos", "Get reviews"]);
    expect(phoneBar("staff").map((s) => s.label)).toEqual(["Photos", "Get reviews"]);
    expect(sectionFor("/app/cards", "staff")?.id).toBe("get-reviews");
    expect(sectionFor("/app", "staff")?.id).toBe("photos");
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
      "/app/insights",
      "/app/hours",
      "/app/posts",
      "/app/settings",
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
    expect(tabs).toEqual(["General", "Business knowledge", "Reports"]);
    expect(tabsFor(SECTIONS.settings, "owner").map((t) => t.label)).toEqual([
      "General",
      "Business knowledge",
      "Team",
      "Plan",
      "Reports",
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

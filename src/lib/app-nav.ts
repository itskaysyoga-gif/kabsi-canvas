// The owner's account navigation (K-03, Design 3's names). Pure data, so the five-item phone bar, the eight desktop destinations and
// the "every old address still lands on the right screen" list are tested in tests/app-nav.test.ts. The layout only draws it.
import type { Role } from "@/lib/team";

export type SectionId =
  | "home"
  | "reviews"
  | "google-profile"
  | "content"
  | "insights"
  | "reports"
  | "get-reviews"
  | "settings"
  | "photos";

export type Tab = { label: string; to: string; roles?: Role[] };
export type Section = {
  id: SectionId;
  /** Desktop sidebar label (Design 3's owner words, master plan 30.17 section 4). */
  label: string;
  /** Phone bottom bar label, short. */
  short: string;
  to: string;
  /** Every app address that belongs to this section, so the right item is lit and no address is orphaned. */
  paths: string[];
  tabs?: Tab[];
};

const OWNER_ONLY: Role[] = ["owner"];

// UX 1 (27 Oct 2026): Design 3's names. No "listing" and no "visibility" in a line an owner reads (COPY.md 0.1).
export const SECTIONS: Record<SectionId, Section> = {
  home: { id: "home", label: "Home", short: "Home", to: "/app", paths: ["/app"] },
  reviews: {
    id: "reviews",
    label: "Reviews",
    short: "Reviews",
    to: "/app/reviews",
    // /app/inbox is the Waiting filter of the one Reviews screen and redirects to it.
    paths: ["/app/inbox", "/app/reviews"],
  },
  "google-profile": {
    id: "google-profile",
    label: "Google profile",
    short: "Profile",
    to: "/app/shield",
    paths: ["/app/shield", "/app/hours", "/app/coach"],
    tabs: [
      { label: "Profile watch", to: "/app/shield" },
      { label: "Hours", to: "/app/hours" },
      { label: "Profile Coach", to: "/app/coach" },
    ],
  },
  content: {
    id: "content",
    label: "Posts and photos",
    short: "Posts",
    to: "/app/posts",
    paths: ["/app/posts", "/app/photos"],
    tabs: [
      { label: "Posts", to: "/app/posts" },
      { label: "Photos", to: "/app/photos" },
    ],
  },
  insights: {
    id: "insights",
    label: "Where you show up",
    short: "Show up",
    to: "/app/insights",
    paths: ["/app/insights"],
  },
  reports: {
    id: "reports",
    label: "Reports",
    short: "Reports",
    to: "/app/report",
    paths: ["/app/report"],
  },
  "get-reviews": {
    id: "get-reviews",
    label: "Get reviews",
    short: "Get reviews",
    to: "/app/cards",
    paths: ["/app/cards"],
  },
  settings: {
    id: "settings",
    label: "Settings",
    short: "Settings",
    to: "/app/settings",
    paths: ["/app/settings", "/app/knowledge", "/app/plan", "/app/team"],
    // Plan and Team are the owner's: billing and the team are not a manager's (K-16).
    tabs: [
      { label: "Settings", to: "/app/settings" },
      { label: "Business Knowledge", to: "/app/knowledge" },
      { label: "Team", to: "/app/team", roles: OWNER_ONLY },
      { label: "Plan", to: "/app/plan", roles: OWNER_ONLY },
    ],
  },
  // Staff see photos and the review link and nothing else (K-16).
  photos: {
    id: "photos",
    label: "Photos",
    short: "Photos",
    to: "/app/photos",
    paths: ["/app", "/app/photos"],
  },
};

/** The desktop sidebar, in order (K-03). */
export const DESKTOP: SectionId[] = [
  "home",
  "reviews",
  "google-profile",
  "content",
  "insights",
  "reports",
  "get-reviews",
  "settings",
];
/** The four places the phone bar shows by name; the fifth is More (K-03). */
export const PHONE_BAR: SectionId[] = ["home", "reviews", "google-profile", "content"];
/** What More opens on a phone (K-03). */
export const MORE: SectionId[] = ["insights", "reports", "get-reviews", "settings"];
export const STAFF: SectionId[] = ["photos", "get-reviews"];

export const desktopSections = (role: Role | undefined): Section[] =>
  (role === "staff" ? STAFF : DESKTOP).map((id) => SECTIONS[id]);

/** Items in the phone bar, More last. For staff there is no More: two items, no bar of five. */
export const phoneBar = (role: Role | undefined): Section[] =>
  role === "staff" ? STAFF.map((id) => SECTIONS[id]) : PHONE_BAR.map((id) => SECTIONS[id]);
export const moreSections = (role: Role | undefined): Section[] =>
  role === "staff" ? [] : MORE.map((id) => SECTIONS[id]);

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

export function sectionFor(path: string, role: Role | undefined): Section | undefined {
  const p = clean(path);
  const list = role === "staff" ? STAFF : DESKTOP;
  return list.map((id) => SECTIONS[id]).find((s) => s.paths.includes(p));
}

export const tabsFor = (section: Section, role: Role | undefined): Tab[] =>
  (section.tabs ?? []).filter((t) => !t.roles || (role !== undefined && t.roles.includes(role)));

/** Every address an owner may have saved or been emailed. They all still exist and land in the section named here. */
export const OLD_APP_ADDRESSES: Record<string, SectionId> = {
  "/app": "home",
  "/app/inbox": "reviews",
  "/app/reviews": "reviews",
  "/app/cards": "get-reviews",
  "/app/shield": "google-profile",
  "/app/hours": "google-profile",
  "/app/coach": "google-profile",
  "/app/posts": "content",
  "/app/photos": "content",
  "/app/insights": "insights",
  "/app/report": "reports",
  "/app/knowledge": "settings",
  "/app/settings": "settings",
  "/app/plan": "settings",
  "/app/team": "settings",
};

/** Can this role open this address? Staff: photos and the review link. Manager: everything but plan and team. */
export function canOpen(path: string, role: Role | undefined): boolean {
  if (!role || role === "owner") return true;
  const p = clean(path);
  if (role === "staff") return STAFF.some((id) => SECTIONS[id].paths.includes(p));
  return p !== "/app/plan" && p !== "/app/team";
}

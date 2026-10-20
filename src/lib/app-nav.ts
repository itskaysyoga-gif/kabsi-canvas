// The owner app's navigation (K-02, K-03). Pure data, so the five-item phone bar, the eight desktop destinations and
// the "every old address still lands on the right screen" list are tested in tests/app-nav.test.ts. The layout only draws it.
import type { Role } from "@/lib/team";

export type SectionId =
  | "home"
  | "reviews"
  | "get-reviews"
  | "google-profile"
  | "content"
  | "insights"
  | "knowledge"
  | "settings"
  | "photos";

export type Tab = { label: string; to: string; roles?: Role[] };
export type Section = {
  id: SectionId;
  /** Desktop sidebar label (the K-02 name). */
  label: string;
  /** Phone bottom bar label, short. */
  short: string;
  to: string;
  /** Every app address that belongs to this section, so the right item is lit and no address is orphaned. */
  paths: string[];
  tabs?: Tab[];
};

const OWNER_ONLY: Role[] = ["owner"];

export const SECTIONS: Record<SectionId, Section> = {
  home: { id: "home", label: "Home", short: "Home", to: "/app", paths: ["/app"] },
  reviews: {
    id: "reviews",
    label: "Reviews",
    short: "Reviews",
    to: "/app/inbox",
    paths: ["/app/inbox", "/app/reviews"],
    tabs: [
      { label: "To reply", to: "/app/inbox" },
      { label: "All reviews", to: "/app/reviews" },
    ],
  },
  "get-reviews": {
    id: "get-reviews",
    label: "Get Reviews",
    short: "Get Reviews",
    to: "/app/cards",
    paths: ["/app/cards"],
  },
  "google-profile": {
    id: "google-profile",
    label: "Google Profile",
    short: "Profile",
    to: "/app/shield",
    paths: ["/app/shield", "/app/hours"],
    tabs: [
      { label: "Google Profile", to: "/app/shield" },
      { label: "Hours", to: "/app/hours" },
    ],
  },
  content: {
    id: "content",
    label: "Content",
    short: "Content",
    to: "/app/posts",
    paths: ["/app/posts", "/app/photos"],
    tabs: [
      { label: "Posts", to: "/app/posts" },
      { label: "Photos", to: "/app/photos" },
    ],
  },
  insights: {
    id: "insights",
    label: "Insights",
    short: "Insights",
    to: "/app/report",
    paths: ["/app/report"],
    tabs: [{ label: "Weekly Care Report", to: "/app/report" }],
  },
  knowledge: {
    id: "knowledge",
    label: "Business Knowledge",
    short: "Knowledge",
    to: "/app/knowledge",
    paths: ["/app/knowledge"],
  },
  settings: {
    id: "settings",
    label: "Settings",
    short: "Settings",
    to: "/app/settings",
    paths: ["/app/settings", "/app/plan", "/app/team"],
    // Plan and Team are the owner's: billing and the team are not a manager's (K-16).
    tabs: [
      { label: "Notifications", to: "/app/settings" },
      { label: "Plan", to: "/app/plan", roles: OWNER_ONLY },
      { label: "Team", to: "/app/team", roles: OWNER_ONLY },
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
  "get-reviews",
  "google-profile",
  "content",
  "insights",
  "knowledge",
  "settings",
];
/** The four places the phone bar shows by name; the fifth is More (K-03). */
export const PHONE_BAR: SectionId[] = ["home", "reviews", "google-profile", "content"];
/** What More opens on a phone (K-03). */
export const MORE: SectionId[] = ["get-reviews", "insights", "knowledge", "settings"];
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
  "/app/posts": "content",
  "/app/photos": "content",
  "/app/report": "insights",
  "/app/knowledge": "knowledge",
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

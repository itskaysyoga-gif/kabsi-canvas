// The owner's account navigation (K-03; App 2, master plan 30.22 item 5). Pure data, so the five places, the phone bar, the
// tabs and the "every old address still lands on the right screen" list are tested in tests/app-nav.test.ts. The layout only
// draws it.
import type { Role } from "@/lib/team";

export type SectionId =
  "home" | "reviews" | "content" | "google-profile" | "settings" | "get-reviews" | "photos";

/** A tab is an address, and for a filtered screen the ?f= values that light it (null: no ?f= at all). */
export type Tab = {
  label: string;
  to: string;
  f?: string;
  match?: (string | null)[];
  roles?: Role[];
};
export type Section = {
  id: SectionId;
  /** Desktop side bar label. */
  label: string;
  /** Phone bottom bar label, short. */
  short: string;
  to: string;
  /** Every app address that belongs to this section, so the right item is lit and no address is orphaned. */
  paths: string[];
  tabs?: Tab[];
};

const OWNER_ONLY: Role[] = ["owner"];

// App 2 (1 Nov 2026): five places, the same on a computer and in the phone's bottom bar, with no More. No "listing" and no
// "visibility" in a line an owner reads (COPY.md 0.1).
export const SECTIONS: Record<SectionId, Section> = {
  home: { id: "home", label: "Home", short: "Home", to: "/app", paths: ["/app"] },
  reviews: {
    id: "reviews",
    label: "Reviews",
    short: "Reviews",
    to: "/app/reviews",
    // /app/inbox is the Waiting tab of the one Reviews screen and redirects to it.
    paths: ["/app/inbox", "/app/reviews", "/app/cards"],
    tabs: [
      { label: "Waiting", to: "/app/reviews", f: "waiting", match: [null, "waiting", "needs"] },
      { label: "On Google", to: "/app/reviews", f: "google", match: ["google", "replied"] },
      { label: "Get reviews", to: "/app/cards" },
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
  "google-profile": {
    id: "google-profile",
    label: "Google profile",
    short: "Profile",
    to: "/app/shield",
    paths: ["/app/shield", "/app/hours", "/app/coach", "/app/insights"],
    tabs: [
      { label: "Profile watch", to: "/app/shield" },
      { label: "Hours", to: "/app/hours" },
      { label: "Profile Coach", to: "/app/coach" },
      { label: "Where you show up", to: "/app/insights" },
    ],
  },
  settings: {
    id: "settings",
    label: "Settings",
    short: "Settings",
    to: "/app/settings",
    paths: ["/app/settings", "/app/knowledge", "/app/team", "/app/plan", "/app/report"],
    // Plan and Team are the owner's: billing and the team are not a manager's (K-16). "General" is the settings page
    // itself (messages, WhatsApp, your voice, your account, disconnect).
    tabs: [
      { label: "General", to: "/app/settings" },
      { label: "Business knowledge", to: "/app/knowledge" },
      { label: "Team", to: "/app/team", roles: OWNER_ONLY },
      { label: "Plan", to: "/app/plan", roles: OWNER_ONLY },
      { label: "Reports", to: "/app/report" },
    ],
  },
  // Staff see photos and the review link and nothing else (K-16): their own two places.
  "get-reviews": {
    id: "get-reviews",
    label: "Get reviews",
    short: "Get reviews",
    to: "/app/cards",
    paths: ["/app/cards"],
  },
  photos: {
    id: "photos",
    label: "Photos",
    short: "Photos",
    to: "/app/photos",
    paths: ["/app", "/app/photos"],
  },
};

/** The five places, in order, on a computer and in the phone's bottom bar. */
export const PLACES: SectionId[] = ["home", "reviews", "content", "google-profile", "settings"];
export const STAFF: SectionId[] = ["photos", "get-reviews"];

const listFor = (role: Role | undefined) => (role === "staff" ? STAFF : PLACES);

export const desktopSections = (role: Role | undefined): Section[] =>
  listFor(role).map((id) => SECTIONS[id]);

/** Items in the phone bar: the same places as the computer, so there is no More. */
export const phoneBar = desktopSections;

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

export function sectionFor(path: string, role: Role | undefined): Section | undefined {
  const p = clean(path);
  return listFor(role)
    .map((id) => SECTIONS[id])
    .find((s) => s.paths.includes(p));
}

export const tabsFor = (section: Section, role: Role | undefined): Tab[] =>
  (section.tabs ?? []).filter((t) => !t.roles || (role !== undefined && t.roles.includes(role)));

/** Is this tab the open one? The address must match, and for a filtered screen its ?f= value too. */
export function tabOn(tab: Tab, path: string, f: string | null | undefined): boolean {
  if (clean(path) !== tab.to) return false;
  return !tab.match || tab.match.includes(f ?? null);
}

/** Every address an owner may have saved or been emailed. They all still exist and land in the section named here. */
export const OLD_APP_ADDRESSES: Record<string, SectionId> = {
  "/app": "home",
  "/app/inbox": "reviews",
  "/app/reviews": "reviews",
  "/app/cards": "reviews",
  "/app/shield": "google-profile",
  "/app/hours": "google-profile",
  "/app/coach": "google-profile",
  "/app/insights": "google-profile",
  "/app/posts": "content",
  "/app/photos": "content",
  "/app/report": "settings",
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

// The staff workspace's menu (App 5, master plan 30.33 item 3). Pure data, tested in tests/app5-staff-nav.test.ts; the
// shell (app-layout.tsx) draws it in the same side bar and phone bar as the owners' app, labelled Staff. Every panel
// that used to stack on the one /staff page sits whole on one of these pages, with the same queries and actions.

export type StaffPageId =
  "today" | "businesses" | "conversations" | "programs" | "system" | "costs" | "settings";

export type StaffPage = {
  id: StaffPageId;
  /** Side bar label. */
  label: string;
  /** Phone bar label, short. */
  short: string;
  to: string;
  /** The page's H1 and the one phrase on the highlight bar (DESIGN.md, "The highlight bar"). */
  title: string;
  mark: string;
  /** One line under the H1: what the page is for. */
  purpose: string;
  /** The browser tab title. */
  tab: string;
};

export const STAFF_PAGES: Record<StaffPageId, StaffPage> = {
  today: {
    id: "today",
    label: "Today",
    short: "Today",
    to: "/staff",
    title: "What needs a person today",
    mark: "a person",
    purpose: "Everything waiting for the team now, with a button to the page that handles it.",
    tab: "Today",
  },
  businesses: {
    id: "businesses",
    label: "Businesses",
    short: "Businesses",
    to: "/staff/businesses",
    title: "Every business on Kabsi",
    mark: "Every business",
    purpose: "Newest first, with concierge, the Pro trial and diagnostics for each one.",
    tab: "Businesses",
  },
  conversations: {
    id: "conversations",
    label: "Conversations",
    short: "Chats",
    to: "/staff/conversations",
    title: "People waiting for an answer",
    mark: "waiting",
    purpose: "Chats with Nora, follow-ups done by hand and the concierge queue.",
    tab: "Conversations",
  },
  programs: {
    id: "programs",
    label: "Programs",
    short: "Programs",
    to: "/staff/programs",
    title: "Founding 25 and Kabsi Partners",
    mark: "Founding 25",
    purpose: "Applications to decide, the start checklist, partners and their payouts.",
    tab: "Programs",
  },
  system: {
    id: "system",
    label: "System",
    short: "System",
    to: "/staff/system",
    title: "How the system is running",
    mark: "running",
    purpose: "Operations, system and job health, the validation figures and the evidence log.",
    tab: "System",
  },
  costs: {
    id: "costs",
    label: "Costs",
    short: "Costs",
    to: "/staff/costs",
    title: "What Kabsi spends",
    mark: "spends",
    purpose: "Paid data providers and AI answers. Mock mode costs nothing and is not counted.",
    tab: "Costs",
  },
  settings: {
    id: "settings",
    label: "Settings",
    short: "Settings",
    to: "/staff/settings",
    title: "Staff settings",
    mark: "settings",
    purpose: "The WhatsApp staff phone: make a code and send it from that phone.",
    tab: "Settings",
  },
};

/** The side bar, in order. Settings sits apart at the end of the list. */
export const STAFF_MENU: StaffPageId[] = [
  "today",
  "businesses",
  "conversations",
  "programs",
  "system",
  "costs",
  "settings",
];

/** The phone bar holds five, as the owners' app does; Costs and Settings are in the phone's staff menu. */
export const STAFF_BAR: StaffPageId[] = [
  "today",
  "businesses",
  "conversations",
  "programs",
  "system",
];
export const STAFF_MORE: StaffPageId[] = ["costs", "settings"];

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** The staff page an address belongs to, if any. */
export function staffPageFor(path: string): StaffPage | undefined {
  const p = clean(path);
  return STAFF_MENU.map((id) => STAFF_PAGES[id]).find((s) => s.to === p);
}

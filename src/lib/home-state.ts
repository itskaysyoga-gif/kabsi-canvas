// What Home says (K-06, K-07): the header strip, the two states and the cards. Pure functions, no network, so the
// states are tested in tests/home-state.test.ts. Priorities, never points or a score.
import type { Task, TaskKind } from "@/lib/tasks";
import { WHATSAPP_ON } from "@/lib/site";

export const CHECK_STALE_MS = 6 * 3_600_000;
export const MAX_CARDS = 3;

export type StripTone = "green" | "amber" | "red" | "grey";
export type Strip = {
  tone: StripTone;
  /** The Google connection, in words. */
  connection: string;
  /** "Checked 14 minutes ago", or null when there has been no check to speak of. */
  checked: string | null;
};

/** "14 minutes ago", "3 hours ago", "yesterday": the age of a check in the owner's words. */
export function agoWords(iso: string, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * The strip that is on Home whatever the state: the Google connection and the last successful check. A check older than
 * 6 hours turns it amber, so Home never looks healthy while sync is failing. Lost access is red. A business the team
 * looks after by hand (early access) is not read from Google, so it has no check to show.
 */
export function checkStrip(i: {
  lastCheckAt: string | null;
  accessLost: boolean;
  concierge: boolean;
  now?: number;
}): Strip {
  const now = i.now ?? Date.now();
  if (i.concierge)
    return { tone: "grey", connection: "Our team looks after your profile", checked: null };
  if (i.accessLost) {
    return {
      tone: "red",
      connection: "Kabsi can't reach your Google profile",
      checked: i.lastCheckAt ? `Last checked ${agoWords(i.lastCheckAt, now)}` : null,
    };
  }
  if (!i.lastCheckAt)
    return { tone: "grey", connection: "Google connected", checked: "First check soon" };
  if (now - Date.parse(i.lastCheckAt) > CHECK_STALE_MS) {
    return {
      tone: "amber",
      connection: "Google check is late",
      checked: `Last checked ${agoWords(i.lastCheckAt, now)}`,
    };
  }
  return {
    tone: "green",
    connection: "Google connected",
    checked: `Checked ${agoWords(i.lastCheckAt, now)}`,
  };
}

export type HomeState =
  | { kind: "clear"; total: 0; cards: []; rest: []; gaps: Task[] }
  | { kind: "attention"; total: number; cards: Task[]; rest: Task[]; gaps: Task[] };

/**
 * The two states. Everything an owner can act on comes from list_tasks, already ordered urgent first then oldest first.
 * Profile gaps are "make it better" suggestions, not things that need the owner, so they never turn Home amber.
 * At most three cards are shown; the rest are behind "See all".
 */
export function homeState(tasks: Task[]): HomeState {
  const gaps = tasks.filter((t) => t.kind === "profile_gap");
  // The day-one backlog is one card: the reviews' own tasks are folded into it (P0.3-10).
  const needs = tasks.filter((t) => t.kind !== "profile_gap" && !isBacklogMember(t));
  if (needs.length === 0) return { kind: "clear", total: 0, cards: [], rest: [], gaps };
  return {
    kind: "attention",
    total: needs.length,
    cards: needs.slice(0, MAX_CARDS),
    rest: needs.slice(MAX_CARDS),
    gaps,
  };
}

export const headline = (total: number) =>
  total === 0
    ? "You're all caught up"
    : total === 1
      ? "1 thing needs your attention"
      : `${total} things need your attention`;

export const subline = (total: number, replies: number) =>
  total === 0
    ? "Kabsi is taking care of the rest. When a new Google review arrives, you'll get an email with a reply ready."
    : replies === total
      ? "Read each reply, change it if you like, and approve it. Nothing goes on Google without you."
      : "Nothing goes on Google without you. Each one opens where you decide.";

export type Risk = { tone: "red" | "amber"; label: string } | null;

/** The risk label on a card: only where there is a risk (K-13, K-06). */
export function cardRisk(t: Task): Risk {
  if (t.kind === "review_reply") {
    if (t.evidence["risk"] === "high") return { tone: "red", label: "High risk" };
    if (t.evidence["google_refused"]) return { tone: "amber", label: "Google refused it" };
    if (t.evidence["risk"] === "medium") return { tone: "amber", label: "Needs care" };
    return null;
  }
  if (t.kind === "profile_change" && t.priority === "urgent")
    return { tone: "red", label: "Check this first" };
  if (t.kind === "reconnect") return { tone: "red", label: "Can't reach Google" };
  if (t.kind === "google_needs_action") return { tone: "red", label: "Google needs action" };
  return null;
}

export type CardAction = { primary: string; secondary: string };

/** The two buttons of a card (K-06). The primary opens the item where the owner decides; the secondary puts it off. */
export function cardAction(t: Task): CardAction {
  switch (t.kind) {
    case "review_reply":
      return {
        primary: t.evidence["risk"] === "high" ? "Read the review" : "Read and approve",
        secondary: "Later",
      };
    case "profile_change":
      return { primary: "Decide", secondary: "Later" };
    case "post":
      return { primary: "Read and approve", secondary: "Later" };
    case "photo_batch":
      return { primary: "Check the photos", secondary: "Later" };
    case "hours_confirm":
      return { primary: "Check your hours", secondary: "Later" };
    case "knowledge_confirm":
      return { primary: "Answer", secondary: "Later" };
    case "reconnect":
      return { primary: "See how to reconnect", secondary: "Later" };
    case "billing":
      return { primary: "See your plan", secondary: "Later" };
    case "google_needs_action":
      return { primary: "See what Google asks", secondary: "Later" };
    default:
      return { primary: "Open", secondary: "Later" };
  }
}

export const REPLY_NOTE = "Nothing goes on Google until you approve it.";

/** How many of the open items are review replies (the subline changes when they are all replies). */
export const replyCount = (tasks: Task[]) => tasks.filter((t) => t.kind === "review_reply").length;

/** One line of an item's history (the audit trail behind a card), in plain words. */
export function historyLine(
  action: string,
  result: string | null,
  objectType: string | null,
): string {
  switch (action) {
    case "google_check":
      return "Kabsi checked your Google profile";
    case "reply_drafted":
      return "Kabsi prepared a reply";
    case "approval":
      return "You approved it";
    case "publication":
      return result === "live"
        ? "It is live on Google"
        : result === "in_review"
          ? "Sent to Google, which is checking it"
          : result === "failed" || result === "rejected"
            ? "Google did not take it"
            : "Sent to Google";
    case "protection_change":
      return objectType === "profile_change"
        ? "Kabsi noticed a change on Google"
        : "A change was noticed";
    case "task_snoozed":
      return "You put it off for later";
    case "email_link_used":
      return "You used the link in the email";
    case "details_confirmed":
      return "You confirmed your details";
    default:
      return action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  }
}

// ── The day-one backlog (K-66, P0.3-10). The detector makes one summary task and marks each old review's own task as
// backlog; Home shows the summary as one card and folds the others into it.
export const isBacklogSummary = (t: Task) =>
  t.kind === "review_reply" && t.evidence["backlog_summary"] === true;
export const isBacklogMember = (t: Task) =>
  t.kind === "review_reply" && t.evidence["backlog"] === true;

export type BacklogCounts = {
  total: number;
  low: number;
  other: number;
  high: number;
  drafting: number;
  moreWaiting: number;
  trial: boolean;
};
const num = (v: unknown) => (typeof v === "number" ? v : 0);
export function backlogCounts(t: Task): BacklogCounts {
  const e = t.evidence;
  return {
    total: num(e["total"]),
    low: num(e["low"]),
    other: num(e["other"]),
    high: num(e["high"]),
    drafting: num(e["drafting"]),
    moreWaiting: num(e["more_waiting"]),
    trial: e["trial"] === true,
  };
}

/** "14 of 23 sent to Google", and what has not gone yet. */
export function progressLine(sent: number, total: number) {
  return sent >= total ? `All ${total} sent to Google` : `${sent} of ${total} sent to Google`;
}

/** The counts under the card title: what is ready to approve together, and what is not. */
export function backlogBreakdown(c: BacklogCounts): string {
  const parts: string[] = [];
  if (c.low) parts.push(`${c.low} low risk, ready to approve together`);
  if (c.other) parts.push(`${c.other} to read one by one`);
  if (c.high) parts.push(`${c.high} ${c.high === 1 ? "needs" : "need"} care, with no draft`);
  return parts.join(". ") + (parts.length ? "." : "");
}

// ── Design 3 (master plan 30.17 section 4): Home's lead line and the next report.

/** "3 things need you. Each one is on WhatsApp too: answer wherever you are." */
/** The lead under Home's title. The WhatsApp half shows only once Kabsi's WhatsApp number is set (the one switch). */
export const waitingLead = (total: number, whatsappOn: boolean = WHATSAPP_ON) =>
  `${total} ${total === 1 ? "thing needs" : "things need"} you.${
    whatsappOn ? " Each one is on WhatsApp too: answer wherever you are." : ""
  }`;

/**
 * Design 6 (Web 3, master plan 30.20 section 3): Home splits what waits for the owner into "Needs your yes" (a draft
 * ready for approval: a reply, a post, photos, hours, a business fact) and "Needs attention" (something changed or
 * stopped: a profile change, a lost connection, billing, a Google warning). The order inside each stays list_tasks'.
 */
export const NEEDS_YES: readonly TaskKind[] = [
  "review_reply",
  "post",
  "photo_batch",
  "hours_confirm",
  "knowledge_confirm",
];
export function splitCards<T extends Pick<Task, "kind">>(cards: T[]): { yes: T[]; attention: T[] } {
  const yes = cards.filter((t) => NEEDS_YES.includes(t.kind));
  return { yes, attention: cards.filter((t) => !NEEDS_YES.includes(t.kind)) };
}

export type HomeSectionView<T> = {
  key: "yes" | "attention";
  title: "Needs your yes" | "Needs attention";
  total: number;
  shown: T[];
};

/**
 * The two Home sections from the cards Home shows and the rest behind "See all". Each section counts all of its tasks,
 * shown or not; a section whose tasks all sit behind "See all" still shows its first one, so it never disappears; the
 * section holding the most urgent task (list_tasks' first) comes first. Every task is either shown or hidden, once.
 */
export function homeSections<T extends Pick<Task, "kind">>(
  cards: T[],
  rest: T[],
): { sections: HomeSectionView<T>[]; hidden: T[] } {
  const all = [...cards, ...rest];
  const groups = splitCards(all);
  const visible = new Set<T>(cards);
  const sections: HomeSectionView<T>[] = [];
  for (const key of ["yes", "attention"] as const) {
    const items = groups[key];
    if (items.length === 0) continue;
    const shown = items.filter((t) => visible.has(t));
    sections.push({
      key,
      title: key === "yes" ? "Needs your yes" : "Needs attention",
      total: items.length,
      shown: shown.length > 0 ? shown : items.slice(0, 1),
    });
  }
  if (all[0] && sections.length === 2 && !NEEDS_YES.includes(all[0].kind)) sections.reverse();
  const onScreen = new Set(sections.flatMap((x) => x.shown));
  return { sections, hidden: all.filter((t) => !onScreen.has(t)) };
}

/** The next Monday after today, in the owner's words: "Monday 2 November". */
export function nextMonday(now = new Date(), timeZone?: string | null): string {
  const day = new Date(now);
  const wd = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      ...(timeZone ? { timeZone } : {}),
    }).format(d);
  do day.setTime(day.getTime() + 86_400_000);
  while (wd(day) !== "Mon");
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(timeZone ? { timeZone } : {}),
  }).format(day);
}

export const nextReportLine = (monday: string) =>
  `${monday} on WhatsApp: what Kabsi did, what waits for your yes, and one next step.`;

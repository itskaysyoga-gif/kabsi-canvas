// The staff Today page (App 5, master plan 30.33 item 3): one screen that says what needs a person now. Pure rules over
// the reads the staff pages already make (and staff_today for the caps and the provider refusals), so the rows are
// tested in tests/app5-staff-today.test.ts. Each row has its count and the page that handles it.
import type { StaffPageId } from "@/lib/staff-nav";

export type TodayInput = {
  now: number;
  foundingNew?: number | undefined;
  partnersApplied?: number | undefined;
  chatsHandoff?: number | undefined;
  followupsDue?: number | undefined;
  conciergeTasks?: number | undefined;
  stuckApprovals?: number | undefined;
  accessStopped?: number | undefined;
  failedJobs24h?: number | undefined;
  deadJobs?: number | undefined;
  googleErrors24h?: number | undefined;
  webhooksRefused24h?: number | undefined;
  providerRefusals24h?: number | undefined;
  newBusinesses?: { name: string; step: string; status: string }[] | undefined;
};

export type TodayRow = {
  id: string;
  /** The row's words, said once, with the count in them. */
  text: string;
  count: number;
  page: StaffPageId;
  /** ?show= on the page, so the button opens the right panel. */
  show?: string;
  /** The button's words. */
  button: string;
  level: "red" | "amber";
};

const n = (v: number | undefined) => (typeof v === "number" && v > 0 ? v : 0);
const s = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

/** The rows that need a person, most urgent first. Nothing to do gives an empty list (the all-clear). */
export function todayRows(i: TodayInput): TodayRow[] {
  const out: TodayRow[] = [];
  const add = (r: TodayRow) => {
    if (r.count > 0) out.push(r);
  };
  add({
    id: "stuck",
    count: n(i.stuckApprovals),
    text: `${s(n(i.stuckApprovals), "approval", "approvals")} not sent after 15 minutes`,
    page: "system",
    show: "operations",
    button: "Open operations",
    level: "red",
  });
  add({
    id: "jobs",
    count: n(i.failedJobs24h) + n(i.deadJobs),
    text: `${s(n(i.failedJobs24h) + n(i.deadJobs), "job", "jobs")} failed or stopped in the last 24 hours`,
    page: "system",
    show: "health",
    button: "Open system health",
    level: "red",
  });
  add({
    id: "access",
    count: n(i.accessStopped),
    text: `${s(n(i.accessStopped), "business has", "businesses have")} lost Google access`,
    page: "system",
    show: "operations",
    button: "Open operations",
    level: "red",
  });
  add({
    id: "refusals",
    count: n(i.providerRefusals24h) + n(i.webhooksRefused24h) + n(i.googleErrors24h),
    text: `${s(
      n(i.providerRefusals24h) + n(i.webhooksRefused24h) + n(i.googleErrors24h),
      "refusal or provider error",
      "refusals or provider errors",
    )} in the last 24 hours`,
    page: "system",
    show: "health",
    button: "See what was refused",
    level: "amber",
  });
  add({
    id: "chats",
    count: n(i.chatsHandoff),
    text: `${s(n(i.chatsHandoff), "chat is", "chats are")} waiting for a person`,
    page: "conversations",
    show: "chats",
    button: "Open the chats",
    level: "amber",
  });
  add({
    id: "followups",
    count: n(i.followupsDue),
    text: `${s(n(i.followupsDue), "follow-up is", "follow-ups are")} due`,
    page: "conversations",
    show: "followups",
    button: "Open follow-ups",
    level: "amber",
  });
  add({
    id: "concierge",
    count: n(i.conciergeTasks),
    text: `${s(n(i.conciergeTasks), "concierge task is", "concierge tasks are")} waiting`,
    page: "conversations",
    show: "concierge",
    button: "Open concierge",
    level: "amber",
  });
  add({
    id: "founding",
    count: n(i.foundingNew),
    text: `${s(n(i.foundingNew), "Founding 25 application", "Founding 25 applications")} to decide`,
    page: "programs",
    show: "founding",
    button: "Open Founding 25",
    level: "amber",
  });
  add({
    id: "partners",
    count: n(i.partnersApplied),
    text: `${s(n(i.partnersApplied), "partner application", "partner applications")} to decide`,
    page: "programs",
    show: "partners",
    button: "Open Partners",
    level: "amber",
  });
  const fresh = i.newBusinesses ?? [];
  add({
    id: "new",
    count: fresh.length,
    text: `${s(fresh.length, "new business is", "new businesses are")} still setting up`,
    page: "businesses",
    button: "Open businesses",
    level: "amber",
  });
  return out;
}

/** Businesses made in the last 7 days that have not finished setting up, newest first (the list is newest first). */
export function newBusinesses(
  rows: { name: string; status: string; onboarding_step: string; created_at: string }[],
  now: number,
): { name: string; step: string; status: string }[] {
  return rows
    .filter((r) => r.status !== "active" && now - Date.parse(r.created_at) < 7 * 86_400_000)
    .map((r) => ({ name: r.name, step: r.onboarding_step.replace(/_/g, " "), status: r.status }));
}

/** Failed runs in the last 24 hours from staff_job_health: each schedule's failed_24h. */
export const failedRuns24h = (schedules: { failed_24h: number }[] | undefined) =>
  (schedules ?? []).reduce((t, x) => t + (x.failed_24h > 0 ? x.failed_24h : 0), 0);

/** A share of a cap, 0 to 100, or null when there is no cap. */
export function capShare(spentMicros: number, capUsd: number): number | null {
  if (!(capUsd > 0)) return null;
  return Math.min(100, Math.round((spentMicros / (capUsd * 1_000_000)) * 100));
}

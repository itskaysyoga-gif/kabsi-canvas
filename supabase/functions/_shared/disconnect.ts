// Disconnect Kabsi from Google and the access-change notices (K-41, K-113.1, K-113.2, P0.2-02).
//
// The signed-in owner asks in Settings (public.request_disconnect): in the same transaction the business is paused,
// open approvals and review tasks are cancelled, queued jobs are stopped and one `disconnect` job is offered. That job
// (api/jobs.ts) runs runDisconnect below: it removes Kabsi's Manager entry through the admins module
// (_shared/google, mock until the switch to live), records the result (public.record_disconnect_result) and emails the
// owner. When Google refuses or the business is handled by a person (concierge), staff get a follow-up due 7 business
// days after the request (staff_followups, shown on /staff); the owner is told that and how to remove Kabsi
// themselves. When staff finish by hand, the same job runs again and sends the "removed" notice.
//
// Every change Kabsi makes to its access is followed by its own email to the owner, separate from Google's
// (K-113.1): accessChangeEmail builds the three notices (granted, removing, removed). This file has no database or
// network import, so its tests run without credentials.
import { esc } from "./email-layout.ts";

export type DisconnectState = {
  locationId: string;
  name: string;
  googleLocationId: string | null;
  concierge: boolean;
  requestedAt: string | null;
  removedAt: string | null;
  followupDueAt: string | null;
};

export type Notice = { change: AccessChange; name: string; at: string; dueAt?: string | null; nextStep?: string };

export type DisconnectDeps = {
  load: (locationId: string) => Promise<DisconnectState | null>;
  remove: (googleLocationId: string | null) => Promise<"removed" | "already_removed">;
  record: (locationId: string, ok: boolean, error: string | null) => Promise<{ removedAt: string | null; dueAt: string | null }>;
  notify: (locationId: string, notice: Notice, dedupe: string) => Promise<void>;
};

export type DisconnectOutcome = "nothing_requested" | "removed" | "staff_followup";

// Retried by the job queue when Google fails in a way another try may fix; the follow-up exists from the first
// failure, so staff see it at once, and a later success closes it.
export class RemovalFailed extends Error {}

export async function runDisconnect(locationId: string, deps: DisconnectDeps): Promise<DisconnectOutcome> {
  const s = await deps.load(locationId);
  if (!s?.requestedAt) return "nothing_requested";
  let removedAt = s.removedAt;
  let failure: unknown = null;
  if (!removedAt) {
    if (s.concierge) {
      failure = new Error("concierge: a person accepted the invitation by hand and removes Kabsi by hand");
    } else {
      try {
        await deps.remove(s.googleLocationId);
      } catch (e) {
        failure = e;
      }
    }
    const r = await deps.record(locationId, !failure, failure ? String(failure).slice(0, 500) : null);
    removedAt = r.removedAt;
    if (failure) {
      await deps.notify(locationId, { change: "removing", name: s.name, at: s.requestedAt, dueAt: r.dueAt },
        `access_change:removing:${locationId}:${Date.parse(s.requestedAt)}`);
      // Concierge removal is a person's job: another try cannot help. A Google error is tried again.
      if (s.concierge) return "staff_followup";
      throw new RemovalFailed(String(failure));
    }
  }
  await deps.notify(locationId, { change: "removed", name: s.name, at: removedAt! },
    `access_change:removed:${locationId}:${Date.parse(removedAt!)}`);
  return "removed";
}

// ─── Business days: Google's limit for giving up access is 7 business days (K-41). Saturdays and Sundays are skipped;
// the same rule as private.add_business_days in the database.
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

// ─── The access-change notice (K-113.1): what changed, when, and how to remove Kabsi. One builder for every change.
export type AccessChange = "granted" | "removing" | "removed";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const CHECK_STEPS = "On your Business Profile open Menu, then Business Profile settings, then People and access.";

export function accessChangeEmail(n: Notice, appUrl: string): {
  subject: string; preheader: string; title: string; bodyHtml: string; text: string; button: { label: string; url: string }; note: string;
} {
  const name = esc(n.name);
  const when = day(n.at);
  const p = (s: string) => `<p style="margin:0 0 16px 0;">${s}</p>`;
  if (n.change === "granted") {
    const next = n.nextStep ?? "";
    return {
      subject: `Kabsi is now a Manager of ${n.name} on Google`,
      preheader: "A change to who can manage your Google profile.",
      title: "Kabsi now has Manager access",
      bodyHtml: p(`What changed: on ${when} Kabsi accepted your invitation and became a Manager of <strong>${name}</strong>'s Google profile, through the Kabsi Clients group. You stay the owner.`)
        + p("What it lets Kabsi do: read your reviews and profile, and publish only what you approve.")
        + (next ? p(esc(next)) : "")
        + p(`How to remove Kabsi at any time: in Kabsi open Settings, then Disconnect Kabsi from Google. Or ${esc(CHECK_STEPS)} Remove Kabsi Clients there.`),
      text: `What changed: on ${when} Kabsi accepted your invitation and became a Manager of ${n.name}'s Google profile, through the Kabsi Clients group. You stay the owner.\n\nWhat it lets Kabsi do: read your reviews and profile, and publish only what you approve.\n\n${next ? `${next}\n\n` : ""}How to remove Kabsi at any time: in Kabsi open Settings, then Disconnect Kabsi from Google. Or ${CHECK_STEPS} Remove Kabsi Clients there.\n\nOpen Kabsi: ${appUrl}/app`,
      button: { label: "Open Kabsi", url: `${appUrl}/app` },
      note: "This is Kabsi's own notice of a change to your Google access. Google may send its own email too.",
    };
  }
  if (n.change === "removing") {
    const due = n.dueAt ? day(n.dueAt) : "within 7 business days";
    return {
      subject: `Kabsi is disconnecting from ${n.name}`,
      preheader: "Kabsi has stopped. Our team removes its Google access.",
      title: "Kabsi has stopped",
      bodyHtml: p(`You asked on ${when} to disconnect Kabsi from <strong>${name}</strong>. Kabsi has stopped: no new drafts, no emails about reviews, and nothing more is sent to Google. Approvals that were waiting were cancelled.`)
        + p(`What is still to change: Kabsi could not remove its own Manager access automatically, so a person on our team removes it by <strong>${esc(due)}</strong>. We email you again when it is done.`)
        + p(`You can also remove it yourself now: ${esc(CHECK_STEPS)} Remove Kabsi Clients there.`)
        + p("You stay the owner of your profile. Your review link and cards keep working until your plan ends."),
      text: `You asked on ${when} to disconnect Kabsi from ${n.name}. Kabsi has stopped: no new drafts, no emails about reviews, and nothing more is sent to Google. Approvals that were waiting were cancelled.\n\nKabsi could not remove its own Manager access automatically, so a person on our team removes it by ${due}. We email you again when it is done.\n\nYou can also remove it yourself now: ${CHECK_STEPS} Remove Kabsi Clients there.\n\nYou stay the owner of your profile. Your review link and cards keep working until your plan ends.`,
      button: { label: "Open Kabsi", url: `${appUrl}/app/settings` },
      note: "This is Kabsi's own notice of a change to your Google access.",
    };
  }
  return {
    subject: `Kabsi is disconnected from ${n.name}`,
    preheader: "Kabsi no longer has access to your Google profile.",
    title: "Kabsi is disconnected",
    bodyHtml: p(`What changed: on ${when} Kabsi removed its Manager access to <strong>${name}</strong>'s Google profile. Kabsi no longer reads or changes anything on it, and approvals that were waiting were cancelled.`)
      + p(`How to check: ${esc(CHECK_STEPS)} Kabsi Clients is no longer listed. You stay the owner, and nothing else on your profile changed.`)
      + p("What happens next: the Google data Kabsi kept for you is deleted within 30 days. Your review link and cards keep working until your plan ends. To use Kabsi again, write to hello@kabsi.co."),
    text: `What changed: on ${when} Kabsi removed its Manager access to ${n.name}'s Google profile. Kabsi no longer reads or changes anything on it, and approvals that were waiting were cancelled.\n\nHow to check: ${CHECK_STEPS} Kabsi Clients is no longer listed. You stay the owner, and nothing else on your profile changed.\n\nWhat happens next: the Google data Kabsi kept for you is deleted within 30 days. Your review link and cards keep working until your plan ends. To use Kabsi again, write to hello@kabsi.co.`,
    button: { label: "Open Kabsi", url: `${appUrl}/app` },
    note: "This is Kabsi's own notice of a change to your Google access.",
  };
}

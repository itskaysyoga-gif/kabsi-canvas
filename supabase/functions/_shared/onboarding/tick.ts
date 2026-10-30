// What the WhatsApp tick does for onboarding and closing tasks (V4 items 1 to 3), through the one sender (outbox.ts notify):
// the first-48-hours messages of docs/COPY.md 20, each sent only when its event happened and claimed in the database first
// (onboarding_claim), and the outcome of every approval made on WhatsApp (publication_outcomes_due claims them). Outside the
// 24-hour window a message goes as its approved template with the same meaning; until Meta approves it, it waits.
import type { AgentDeps } from "../whatsapp/agent.ts";
import { notify } from "../whatsapp/outbox.ts";
import { ref } from "../whatsapp/templates.ts";
import { sensitivity } from "../review-growth/sensitive.ts";
import { googleLink, outcomeLine, type PubState } from "../task-close.ts";
import { type Facts, pickFirstTask, quote, SAY_ONBOARDING, stageOf, STEP_WORDS } from "./stages.ts";

export type Sent = Record<string, { at: string; detail: Record<string, unknown> | null }>;
export type DueRow = Facts & {
  location_id: string; time_zone: string; is_demo: boolean; place_id: string | null;
  setup_at: string | null; accepted_at: string | null; created_at: string;
  owner: { user_id: string; phone: string; name: string | null } | null;
  sent: Sent; done: { target_type: string; response: unknown }[]; waiting: number;
  /** Something was approved for the business after the first task went out (its answer, or anything else). */
  approved_since_first: boolean;
};
export type Candidates = {
  categories: string[];
  reviews: { review_id: string; stars: number; text: string | null; risk: string | null; reasons: string[]; draft: string | null; draft_ok: boolean }[];
  posts: { fact_id: string; service: string }[];
  hours: { change_id: string; shown: string }[];
};
export type Outcome = {
  publication_id: string; location_id: string; business: string; place_id: string | null; target_type: string; state: PubState;
  response: unknown; user_id: string; phone: string | null;
};
export interface OnboardingDb {
  on(): Promise<boolean>;
  due(limit: number): Promise<DueRow[]>;
  claim(locationId: string, kind: string, detail?: Record<string, unknown>): Promise<boolean>;
  candidates(locationId: string): Promise<Candidates>;
  outcomes(limit: number): Promise<Outcome[]>;
  /** Access works: a search the owner confirmed during onboarding is due now, so the first map follows. */
  startMaps(locationId: string): Promise<void>;
  /** The first task is done: the AI questions for the confirmed searches are made now (30.16 section 3). */
  unlock(locationId: string): Promise<void>;
  /** Scope 1 (30.19): businesses whose first verified value (B) has not landed 48 hours after access, with real work waiting.
   *  Each is claimed in the database as it is returned, so it comes back once. */
  slowStart?(limit: number): Promise<SlowStart[]>;
  /** Hands a claim back when its alert could not be sent, so the next tick tries again. */
  slowStartRelease?(locationId: string): Promise<void>;
  staffPhones?(): Promise<string[]>;
}
export type SlowStart = { location_id: string; business: string; step: string };

const H = 3_600_000;
const since = (iso: string | null | undefined, now: number) => (iso ? now - Date.parse(iso) : -1);

/** The messages due for one business now, in the order they are sent. Pure. */
export function dueKinds(r: DueRow, now: number): string[] {
  const s = r.sent;
  const out: string[] = [];
  if (r.setup_ok && !r.accepted && !s.invite) out.push("invite");
  if (r.checked && !s.access_works) out.push("access_works");
  // The first task waits 10 minutes after access works, so the first sync's reviews have drafts; tried until 48 hours.
  const access = since(s.access_works?.at, now);
  if (r.checked && access > 10 * 60_000 && access < 48 * H && !s.first_task && !r.first_task_done) out.push("first_task");
  if (s.first_task_sent && since(s.first_task_sent.at, now) > 20 * H && !r.first_task_done && !s.reminder && !s.first_task_skipped
      && !r.approved_since_first) out.push("reminder");
  if (s.access_works && since(s.access_works.at, now) > 48 * H && !s.after48) out.push("after48");
  if (r.first_task_done && !s.unlock) out.push("unlock");
  if (!r.checked && !s.still_blocked && since(r.created_at, now) > 24 * H && since(r.setup_at ?? s.invite?.at ?? r.created_at, now) > 24 * H) {
    out.push("still_blocked");
  }
  return out;
}

const WORK: Record<string, string> = {
  review_reply: "a reply", local_post: "a post", photo: "a photo", special_hours: "your hours for a special day", listing_revert: "a detail put back",
};

/** "a reply on Google (link)" for each piece of work Kabsi saw on Google. */
export function doneWords(r: Pick<DueRow, "done" | "place_id">): string[] {
  return r.done.slice(0, 5).map((d) => {
    const link = googleLink({ target_type: d.target_type as never, place_id: r.place_id, response: d.response });
    return `${WORK[d.target_type] ?? "a change"} on Google${link ? ` (${link})` : ""}`;
  });
}

export async function onboardingTick(d: AgentDeps, o: OnboardingDb): Promise<Record<string, number>> {
  const out: Record<string, number> = { outcomes: 0, messages: 0 };
  const failed: string[] = [];
  const now = (d.now ?? Date.now)();

  // Scope 1 (30.19 section 3 item 2): one staff WhatsApp alert, through the existing staff template, for a business that has
  // had Google access for 48 hours with no first verified value and real work waiting. Nothing is sent to the owner, and a
  // business with nothing real to do is never alerted (it waits).
  if (o.slowStart && o.staffPhones) {
    out.alerts = 0;
    try {
      // With no staff phone there is nobody to tell, and nothing is claimed.
      const phones = await o.staffPhones();
      const rows = phones.length ? await o.slowStart(20) : [];
      for (const x of rows) {
        try {
          const summary = `${x.business} has had Google access for 48 hours and no first result yet. Kabsi is waiting on ${x.step}`;
          for (const phone of phones) {
            await notify(d.out, { phone, userId: null, locationId: x.location_id, kind: "staff_alert", urgent: true, body: `${summary}.`,
              template: ref("staff_alert", { summary }), dedupe: `slow_start:${x.location_id}:${phone}` });
          }
          out.alerts++;
        } catch (e) {
          // This business was claimed and not told: hand the claim back, and go on with the others.
          await o.slowStartRelease?.(x.location_id).catch(() => {});
          failed.push(`slow_start:${x.location_id}:${String((e as Error)?.message ?? e).slice(0, 80)}`);
        }
      }
    } catch (e) {
      failed.push(`slow_start:${String((e as Error)?.message ?? e).slice(0, 80)}`);
    }
  }

  // Every task closes (30.15 3.1): confirmed on Google with a link, still on its way, or what failed and what happens next.
  for (const x of await o.outcomes(50)) {
    if (!x.phone) continue;
    try {
      const body = outcomeLine({ business: x.business, target_type: x.target_type as never, state: x.state,
        link: googleLink({ target_type: x.target_type as never, place_id: x.place_id, response: x.response }) });
      if (!body) continue;
      await notify(d.out, { phone: x.phone, userId: x.user_id, locationId: x.location_id, kind: "task_outcome", body,
        template: ref("work_update", { business: x.business }), dedupe: `outcome:${x.publication_id}:${x.state}` });
      out.outcomes++;
    } catch (e) {
      failed.push(`outcome:${x.publication_id}:${String((e as Error)?.message ?? e).slice(0, 80)}`);
    }
  }

  const done = () => {
    if (failed.length) throw new Error(`onboarding_tick: ${failed.length} item(s) failed after the rest were sent: ${failed.join("; ")}`);
    return out;
  };
  if (!(await o.on())) return done();
  for (const r of await o.due(50)) {
    if (!r.owner) continue;
    for (const kind of dueKinds(r, now)) {
      try {
        if (await send(d, o, r, kind)) out.messages++;
      } catch (e) {
        failed.push(`${kind}:${r.location_id}:${String((e as Error)?.message ?? e).slice(0, 80)}`);
      }
    }
  }
  return done();
}

async function send(d: AgentDeps, o: OnboardingDb, r: DueRow, kind: string): Promise<boolean> {
  const to = r.owner!;
  const base = { phone: to.phone, userId: to.user_id, locationId: r.location_id };
  const step = ref("setup_step", { business: r.business });
  const msg = (k: string, body: string, buttons?: { id: string; title: string }[]) =>
    notify(d.out, { ...base, kind: `onboarding_${k}`, body, buttons, template: step, dedupe: `onboarding:${k}:${r.location_id}` });

  if (kind === "invite") {
    if (!(await o.claim(r.location_id, "invite"))) return false;
    await msg("invite", SAY_ONBOARDING.invite, inviteButtons(r.location_id));
    await msg("id", SAY_ONBOARDING.id);
    return true;
  }
  if (kind === "access_works") {
    if (!(await o.claim(r.location_id, "access_works"))) return false;
    // The parked search is released by the visibility tick for every business whose access works (with or without WhatsApp);
    // this only starts it at once.
    await o.startMaps(r.location_id).catch(() => {});
    await msg("access_works", SAY_ONBOARDING.accessWorks(r.business, r.trial_ends_at, r.time_zone));
    return true;
  }
  if (kind === "first_task") {
    const c = await o.candidates(r.location_id);
    // A clinic (health, legal, financial) never gets a customer's words in WhatsApp (30.15 3.7): its first task is not a review here.
    const reviews = c.reviews.map((x) => {
      const s = sensitivity({ risk: x.risk ?? "low", reasons: x.reasons, rating: x.stars, comment: x.text, categories: c.categories });
      return { ...x, sensitive: s.sensitive || !!s.regulated };
    });
    const task = pickFirstTask({ reviews, posts: c.posts, hours: c.hours });
    // Nothing to offer yet (drafts may still be coming): tried again on a later tick; claimed only once it really goes out.
    if (task.kind === "none") return false;
    if (task.kind === "review") {
      const a = await d.db.actionCreate(to.user_id, "review_reply", task.review_id);
      if (!a.ok || !a.token) return false;
      if (!(await o.claim(r.location_id, "first_task", { kind: task.kind }))) return false;
      await msg("first_task", SAY_ONBOARDING.firstReview(r.business, quote(task.text), task.draft),
        [{ id: `a:${a.token}`, title: "Yes" }, { id: `e:${a.token}`, title: "Edit" }, { id: `fs:${r.location_id}`, title: "Skip" }]);
    } else if (task.kind === "post") {
      if (!(await o.claim(r.location_id, "first_task", { kind: task.kind }))) return false;
      // The owner's answer is read like the monthly answer: a post in their own words, shown back for a yes.
      await d.out.db.setQuestion(to.phone, { type: "update", location_id: r.location_id, at: new Date((d.now ?? Date.now)()).toISOString() });
      await msg("first_task", SAY_ONBOARDING.postQuestion(task.service));
    } else {
      const a = await d.db.actionCreate(to.user_id, "listing_revert", task.change_id);
      if (!a.ok || !a.token) return false;
      if (!(await o.claim(r.location_id, "first_task", { kind: task.kind }))) return false;
      await msg("first_task", SAY_ONBOARDING.hoursFix(r.business, task.shown),
        [{ id: `a:${a.token}`, title: "Yes" }, { id: `fs:${r.location_id}`, title: "Skip" }]);
    }
    await o.claim(r.location_id, "first_task_sent", { kind: task.kind });
    return true;
  }
  if (kind === "reminder") {
    if (!(await o.claim(r.location_id, "reminder"))) return false;
    const k = String(r.sent.first_task_sent?.detail?.kind ?? "review");
    await msg("reminder", SAY_ONBOARDING.reminder(r.business, k === "post" ? "post" : k === "hours" ? "change" : "reply"));
    return true;
  }
  if (kind === "after48") {
    if (!(await o.claim(r.location_id, "after48"))) return false;
    await msg("after48", SAY_ONBOARDING.after48(r.business, doneWords(r), r.waiting ? `${r.waiting} ${r.waiting === 1 ? "item" : "items"} in Kabsi` : null,
      r.trial_ends_at, r.time_zone));
    return true;
  }
  if (kind === "unlock") {
    if (!(await o.claim(r.location_id, "unlock"))) return false;
    await o.unlock(r.location_id);
    return false;
  }
  if (kind === "still_blocked") {
    const stage = stageOf(r);
    if (stage === "first_task" || stage === "done") return false;
    if (!(await o.claim(r.location_id, "still_blocked", { stage }))) return false;
    await msg("still_blocked", SAY_ONBOARDING.stillBlocked(r.business, STEP_WORDS[stage]), [{ id: `ob:h:${r.location_id}`, title: "Help" }]);
    return true;
  }
  return false;
}

/** Under the invite: the owner did it, someone else looks after the profile, or they cannot find it. */
export const inviteButtons = (locationId: string) => [
  { id: `ob:d:${locationId}`, title: "Done" },
  { id: `ob:s:${locationId}`, title: "Someone else does it" },
  { id: `ob:c:${locationId}`, title: "I cannot find it" },
];

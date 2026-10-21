// The lifecycle job (P0.4-10): loads the business snapshots, asks the rules (lifecycle.ts) which emails are due now, and
// sends each one once through the notification engine. The engine's dedupe key (`life:<step>:<business>` plus the
// address) is what makes a second run, or a second worker, send nothing. Off until app_settings.lifecycle_emails is 'on'
// (news.kabsi.co verified, Hussein's switch); it never looks at an event before app_settings.lifecycle_since.
import type { EmailContent } from "./email/template.ts";
import { lifecycleEmail } from "./email/lifecycle-copy.ts";
import { dueSteps, lifecycleKey, type Snapshot, snapshotFromRow, type StepId, STEPS } from "./lifecycle.ts";

export type LifecycleDeps = {
  now(): Date;
  appUrl: string;
  settings(): Promise<{ on: boolean; since: Date | null; marketingNoticeOn: boolean; removalOn: boolean }>;
  snapshots(now: Date): Promise<Snapshot[]>;
  /** One email to a business's owners through the engine. Returns how many went out. */
  send(o: { step: StepId; kind: string; category: string; key: string; locationId: string; to: { email: string; userId: string }[]; content: EmailContent }): Promise<number>;
  report(e: unknown, fields: Record<string, unknown>): void;
};

export type LifecycleResult = { checked: number; due: number; sent: number; failed: number };

export async function runLifecycle(d: LifecycleDeps): Promise<LifecycleResult> {
  const out: LifecycleResult = { checked: 0, due: 0, sent: 0, failed: 0 };
  const cfg = await d.settings();
  if (!cfg.on || !cfg.since) return out;
  const now = d.now();
  const snaps = await d.snapshots(now);
  for (const s of snaps) {
    out.checked++;
    for (const step of dueSteps(s, now, { since: cfg.since, marketingNoticeOn: cfg.marketingNoticeOn })) {
      out.due++;
      try {
        out.sent += await d.send({
          step, kind: `life_${step}`, category: STEPS[step].category, key: lifecycleKey(step, s.locationId), locationId: s.locationId,
          to: s.owners, content: lifecycleEmail(step, s, { appUrl: d.appUrl, removalOn: cfg.removalOn }),
        });
      } catch (e) {
        out.failed++;
        d.report(e, { step, location: s.locationId });
      }
    }
  }
  return out;
}

export { snapshotFromRow };

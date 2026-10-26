// The lifecycle job wired to the database and the engine (P0.4-10). See lifecycle-run.ts for what it does.
import { admin, APP_URL, captureError } from "./kabsi.ts";
import { notify } from "./notify.ts";
import { type LifecycleDeps, type LifecycleResult, runLifecycle, snapshotFromRow } from "./lifecycle-run.ts";

export async function lifecycleJob(): Promise<LifecycleResult> {
  const db = admin();
  const deps: LifecycleDeps = {
    now: () => new Date(),
    appUrl: APP_URL,
    async settings() {
      const { data, error } = await db.from("app_settings").select("key, value").in("key", ["lifecycle_emails", "lifecycle_since", "signup_marketing_notice", "trial_removal"]);
      if (error) throw error;
      const v = new Map((data ?? []).map((r) => [r.key as string, String(r.value ?? "")]));
      const since = v.get("lifecycle_since") ? new Date(v.get("lifecycle_since")!) : null;
      return { on: v.get("lifecycle_emails") === "on", since: since && !Number.isNaN(since.getTime()) ? since : null, marketingNoticeOn: v.get("signup_marketing_notice") === "on", removalOn: v.get("trial_removal") === "on" };
    },
    async snapshots(now) {
      const { data, error } = await db.rpc("lifecycle_snapshots", { p_now: now.toISOString() });
      if (error) throw error;
      const snaps = ((data ?? []) as Record<string, unknown>[]).map(snapshotFromRow);
      // Founding 25 businesses (30.17): their locations, by the organisation an accepted place is linked to.
      const { data: f } = await db.from("founding_applications").select("organization_id").eq("status", "accepted").not("organization_id", "is", null);
      const orgs = ((f ?? []) as { organization_id: string }[]).map((r) => r.organization_id);
      if (orgs.length) {
        const { data: locs } = await db.from("locations").select("id").in("organization_id", orgs);
        const ids = new Set(((locs ?? []) as { id: string }[]).map((l) => l.id));
        for (const s of snaps) s.founding = ids.has(s.locationId);
      }
      return snaps;
    },
    async send(o) {
      const r = await notify({
        category: o.category as never, kind: o.kind, key: o.key, locationId: o.locationId, to: o.to.map((p) => ({ email: p.email, userId: p.userId, role: "owner" })),
        inApp: o.category === "billing" ? { title: o.content.title, link: "/app/plan" } : { title: o.content.title, link: "/app" },
        content: o.content,
      });
      return r.sent + r.held + r.digest;
    },
    report: (e, fields) => void captureError("lifecycle", e, fields),
  };
  return await runLifecycle(deps);
}

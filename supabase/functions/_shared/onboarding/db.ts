// The onboarding side on the real database (V4): the agent's hooks (hooks.ts) and the tick's reads (tick.ts). Every write goes
// through a service-role function of migration 20261027090000_v4_onboarding_receipt.sql, which checks the owner itself.
import { admin } from "../kabsi.ts";
import { notify } from "../whatsapp/outbox.ts";
import { ref } from "../whatsapp/templates.ts";
import type { Out } from "../whatsapp/outbox.ts";
import { checkFact, type CheckRow } from "../visibility/free-check.ts";
import { mapDate } from "../visibility/map-image.ts";
import type { FirstBack, OnboardingHooks } from "./hooks.ts";
import { type Facts, SAY_ONBOARDING, stageOf } from "./stages.ts";
import type { Candidates, DueRow, OnboardingDb, Outcome } from "./tick.ts";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin().rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}
const facts = (locationId: string) => rpc<Facts & { time_zone: string; is_demo: boolean; check: { code: string; term: string } | null }>("onboarding_facts", { p_location: locationId });

async function staffPhones(): Promise<string[]> {
  const { data } = await admin().from("phone_roles").select("phone").eq("role", "staff_admin").is("revoked_at", null);
  return ((data ?? []) as { phone: string }[]).map((r) => r.phone);
}

export function onboardingHooks(out: Out): OnboardingHooks {
  return {
    async afterBind(userId, locationIds) {
      for (const id of locationIds) {
        const f = await facts(id).catch(() => null);
        if (!f || f.is_demo) continue;
        const stage = stageOf(f);
        // Only before stage 4 is done: an owner who already finished setup gets the usual "connected" line.
        if (stage === "first_task" || stage === "done" || f.setup_ok) continue;
        const { data: u } = await admin().auth.admin.getUserById(userId);
        const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
        const name = [meta.first_name, meta.name, meta.full_name].find((v) => typeof v === "string" && v.trim()) as string | undefined;
        let check: FirstBack["check"] = null;
        if (f.check) {
          const { data: c } = await admin().from("free_checks").select("fast, nearby, created_at").eq("code", f.check.code).maybeSingle();
          if (c) check = { term: f.check.term, date: mapDate(new Date(c.created_at as string), f.time_zone), fact: checkFact(c as unknown as Pick<CheckRow, "fast" | "nearby">) };
        }
        return { location_id: id, business: f.business, name: name ?? null, check };
      }
      return null;
    },
    async setupYes(locationId, userId) {
      const ok = await rpc<boolean>("onboarding_setup_ok", { p_location: locationId, p_user: userId });
      if (!ok) return { ok: false, suggested: null, hasKeyword: false };
      const f = await facts(locationId);
      return { ok: true, suggested: f.check?.term ?? null, hasKeyword: !!f.keyword };
    },
    async founderHelp(locationId, userId, phone) {
      const f = await facts(locationId);
      const { data: u } = await admin().auth.admin.getUserById(userId);
      const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
      const name = (typeof meta.first_name === "string" ? meta.first_name : typeof meta.name === "string" ? meta.name : null) as string | null;
      const stage = stageOf(f);
      const draft = SAY_ONBOARDING.founderDraft(name);
      await admin().from("staff_followups").insert({
        kind: "founder_help", location_id: locationId, location_name: f.business, due_at: new Date().toISOString(),
        detail: `Asked for help on WhatsApp at the ${stage} step. Message them from the Kabsi number: "${draft}"`.slice(0, 500),
      });
      for (const p of await staffPhones()) {
        await notify(out, { phone: p, userId: null, locationId, kind: "staff_alert", urgent: true,
          body: `${f.business} asked for help with setup (${stage} step), from ${phone}. Suggested message:\n${draft}`,
          template: ref("staff_alert", { summary: `${f.business} asked for help with setup` }), dedupe: `founder_help:${locationId}:${p}` });
      }
    },
    claim: (locationId, kind) => rpc<boolean>("onboarding_claim", { p_location: locationId, p_kind: kind, p_detail: null }),
    async skipFirst(locationId) {
      await rpc<boolean>("onboarding_claim", { p_location: locationId, p_kind: "first_task_skipped", p_detail: null });
    },
    proposeFacts: (locationId, items, month) => rpc<number>("propose_monthly_facts", { p_location: locationId, p_items: items, p_month: month }),
    confirmFacts: (locationId, userId, month) => rpc<number>("confirm_monthly_facts", { p_location: locationId, p_user: userId, p_month: month }),
  };
}

export const onboardingDb = (startMaps: (locationId: string) => Promise<void>, unlock: (locationId: string) => Promise<void>): OnboardingDb => ({
  async on() {
    const { data } = await admin().from("app_settings").select("value").eq("key", "onboarding_whatsapp").maybeSingle();
    return data?.value === "on";
  },
  due: (limit) => rpc<DueRow[]>("onboarding_due", { p_limit: limit }),
  claim: (locationId, kind, detail) => rpc<boolean>("onboarding_claim", { p_location: locationId, p_kind: kind, p_detail: detail ?? null }),
  candidates: (locationId) => rpc<Candidates>("first_task_candidates", { p_location: locationId }),
  outcomes: (limit) => rpc<Outcome[]>("publication_outcomes_due", { p_limit: limit }),
  startMaps,
  unlock,
});

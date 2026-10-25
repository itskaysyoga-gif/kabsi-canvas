// The replay harness on the real database (QA 1, master plan 30.12). `whatsappReplay` is called by the `whatsapp` function's
// internal route (x-cron-secret) with a scenario name. It never takes message text from the caller. The phones are
// fictional (+1 212 555 01xx) and bound only to demo businesses (mock Google, R-17), so every reply is `mock_sent`.
import { admin } from "../kabsi.ts";
import { PERSONA_PHONES, type Observed, phoneProblem, REPLAY_PHONE } from "./replay.ts";
import type { ReplayIo } from "./replay-run.ts";

/** The review the QA seed keeps in "drafted" (tests/e2e/seed/qa-reset.sql) so an approval card can be made for it. */
export const QA_REVIEW_ID = "de300000-0000-4000-8000-0000000000f1";

export function replayIo(o: { phoneNumberId: string; deliver: ReplayIo["deliver"] }): ReplayIo {
  const db = admin();
  const only = (phones: string[]) => phones.filter((p) => REPLAY_PHONE.test(p));
  return {
    phoneNumberId: o.phoneNumberId,
    nowMs: () => Date.now(),
    async problem(phones) {
      const { data: roles, error } = await db.from("phone_roles").select("phone, location_id").in("phone", only(phones)).is("revoked_at", null);
      if (error) return `could not read the phone roles: ${error.message}`;
      const ids = [...new Set((roles ?? []).map((r) => r.location_id as string | null).filter(Boolean))] as string[];
      const { data: locs } = ids.length ? await db.from("locations").select("id, is_demo, organization_id").in("id", ids) : { data: [] };
      const orgIds = [...new Set((locs ?? []).map((l) => l.organization_id as string))];
      const { data: orgs } = orgIds.length ? await db.from("organizations").select("id, billing_test").in("id", orgIds) : { data: [] };
      const test = new Map((orgs ?? []).map((o) => [o.id as string, o.billing_test === true]));
      const info = new Map((locs ?? []).map((l) => [l.id as string, { demo: l.is_demo === true, test: test.get(l.organization_id as string) ?? false }]));
      return phoneProblem(phones, (roles ?? []).map((r) => {
        const i = r.location_id ? info.get(r.location_id as string) : null;
        return { phone: r.phone as string, location_id: r.location_id as string | null, is_demo: r.location_id ? i?.demo ?? false : null, billing_test: i?.test ?? false };
      }));
    },
    async reset(phones) {
      const p = only(phones).filter((x) => PERSONA_PHONES.includes(x));
      if (!p.length) return;
      await db.from("whatsapp_conversations").delete().in("phone", p);
      await db.from("whatsapp_optins").update({ state: "active", stopped_at: null }).in("phone", p);
    },
    async lastOutbox(phone) {
      const { data } = await db.from("whatsapp_outbox").select("id").eq("phone", phone).order("id", { ascending: false }).limit(1);
      return (data?.[0]?.id as number | undefined) ?? 0;
    },
    async action(phone) {
      const { data: role } = await db.from("phone_roles").select("user_id").eq("phone", phone).in("role", ["owner", "manager"]).is("revoked_at", null).limit(1).maybeSingle();
      if (!role?.user_id) return null;
      const { data, error } = await db.rpc("whatsapp_action_create", { p_user: role.user_id, p_target_type: "review_reply", p_target_id: QA_REVIEW_ID });
      const r = data as { ok?: boolean; token?: string } | null;
      return error || !r?.ok ? null : r.token ?? null;
    },
    deliver: o.deliver,
    async observe(phone, messageId, since): Promise<Observed> {
      const [{ data: m }, { data: out }, { data: conv }] = await Promise.all([
        db.from("whatsapp_messages").select("result, processed_at").eq("direction", "in").eq("provider_id", messageId).maybeSingle(),
        db.from("whatsapp_outbox").select("id, kind, state, body, buttons").eq("phone", phone).gt("id", since).order("id"),
        db.from("whatsapp_conversations").select("stopped_at, handoff_at, scan_code, active_role, open_question, language").eq("phone", phone).maybeSingle(),
      ]);
      return {
        stored: !!m,
        result: (m?.result as string | null | undefined) ?? null,
        replies: (out ?? []).map((r) => ({ id: r.id as number, kind: r.kind as string, state: r.state as string, body: r.body as string, buttons: (r.buttons ?? []) as { id: string; title: string }[] })),
        conv: (conv as Observed["conv"]) ?? null,
      };
    },
  };
}

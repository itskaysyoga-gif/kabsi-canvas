// What the WhatsApp tick does for Review Growth (V3), through the one sender (outbox.ts notify) and the agent's own database
// interface: tell people their photo is ready (Yes, Edit or Skip), and ask the monthly "anything new?" question. Each is claimed
// in the database first (wa_asked_at, business_update_prompts), so a repeat tick never sends twice.
import type { AgentDeps } from "../whatsapp/agent.ts";
import { notify } from "../whatsapp/outbox.ts";
import { ref } from "../whatsapp/templates.ts";
import { MONTHLY_QUESTION } from "./monthly.ts";
import { photoButtons, photoReadyBody, photoRefusedBody } from "./photo.ts";

export type PhotoDue = {
  photo_id: string; location_id: string; business: string; state: "draft" | "refused"; category: string | null; suitable: boolean | null;
  note: string | null; sender_role: string | null; to: { user_id: string; phone: string }[];
};
export type MonthlyDue = { location_id: string; business: string; user_id: string; phone: string; month: string };
export interface GrowthDb {
  photosDue(limit: number): Promise<PhotoDue[]>;
  monthlyDue(limit: number): Promise<MonthlyDue[]>;
}

export async function reviewGrowthTick(d: AgentDeps, g: GrowthDb): Promise<{ photos: number; questions: number }> {
  let photos = 0, questions = 0;
  for (const p of await g.photosDue(20)) {
    for (const to of p.to) {
      if (p.state === "refused") {
        await notify(d.out, { phone: to.phone, userId: to.user_id, locationId: p.location_id, kind: "photo_refused", body: photoRefusedBody(p.business, p.note),
          template: ref("photo_ready", { business: p.business }), dedupe: `photo_refused:${p.photo_id}:${to.user_id}` });
        photos++;
        continue;
      }
      const a = await d.db.actionCreate(to.user_id, "photo", p.photo_id);
      if (!a.ok || !a.token) continue;
      await notify(d.out, { phone: to.phone, userId: to.user_id, locationId: p.location_id, kind: "photo_ready",
        body: photoReadyBody({ business: p.business, category: p.category, note: p.suitable === false ? p.note : null, suitable: p.suitable, forOwner: p.sender_role === "staff" }),
        buttons: photoButtons(a.token, p.photo_id), template: ref("photo_ready", { business: p.business }), dedupe: `photo_ready:${p.photo_id}:${to.user_id}` });
      photos++;
    }
  }
  for (const m of await g.monthlyDue(20)) {
    // The next free message from the owner, within 3 days, is the answer (agent.ts reads it).
    await d.out.db.setQuestion(m.phone, { type: "update", location_id: m.location_id, at: new Date((d.now ?? Date.now)()).toISOString() });
    await notify(d.out, { phone: m.phone, userId: m.user_id, locationId: m.location_id, kind: "monthly_update", body: MONTHLY_QUESTION(m.business),
      template: ref("business_update", { business: m.business }), dedupe: `monthly_update:${m.month}:${m.location_id}` });
    questions++;
  }
  return { photos, questions };
}

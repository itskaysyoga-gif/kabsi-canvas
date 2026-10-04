// posts-weekly: internal (pg_cron every 30 min, x-cron-secret). Drafts one Google post a week per active
// business that has weekly drafts on, at its local slot: shops and dining Thursday 09:00 (Friday if missed),
// professional services Tuesday 08:30 (Wednesday if missed). The draft waits for the owner (D202):
// nothing is posted until they click Post. Businesses with no facts to write from are skipped, not padded.
// Demo businesses (P0.1-06) never get weekly drafts: their post idea is seeded.
import { admin, APP_URL, captureError, emailLayout, esc, isInternal, jobLog, json, ownerEmails, sendEmail } from "../_shared/kabsi.ts";
import { ensureCategory, hasFacts, POST_LOC_COLUMNS, type PostLoc, suggestKeywords, writePost } from "../_shared/posts.ts";
import { AiBudgetError } from "../_shared/ai-budget.ts";

// A weekly angle so drafts don't repeat; each uses only the owner's facts.
const ANGLES = [
  "Write about the main thing this business offers, using the owner's facts.",
  "Write a practical post: when to come and what to know before visiting (hours, parking, delivery) if those facts exist.",
  "Write about one specific product, service or answer from the owner's facts.",
  "Write a short, warm invitation to visit or call this week, grounded in the owner's facts.",
];

function localNow(tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: get("weekday"), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}
export function inSlot(slot: string, tz: string) {
  const { day, minutes } = localNow(tz);
  if (slot === "pro") return (day === "Tue" || day === "Wed") && minutes >= 510 && minutes < 540; // 08:30
  return (day === "Thu" || day === "Fri") && minutes >= 540 && minutes < 570; // 09:00
}

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({})) as { force_location?: string; dry_run?: boolean };
  const db = admin();
  const weekAgo = new Date(Date.now() - 6 * 86400_000).toISOString();
  let q = db.from("locations").select(POST_LOC_COLUMNS).eq("status", "active").eq("concierge", false).eq("is_demo", false).eq("auto_posts", true).limit(200);
  if (!body.dry_run) q = q.or(`last_auto_post_at.is.null,last_auto_post_at.lt."${weekAgo}"`);
  if (body.force_location) q = q.eq("id", body.force_location); // manual test run (dry_run: no insert, no email)
  const { data: locs, error } = await q;
  if (error) { await captureError("posts-weekly", error); return json({ error: "db" }, 500); }
  const done: Record<string, string> = {};
  for (const raw of (locs ?? []) as unknown as PostLoc[]) {
    try {
      const loc = await ensureCategory(db, raw);
      if (!body.force_location && !inSlot(loc.post_slot ?? "retail", loc.time_zone || "Asia/Beirut")) continue;
      const { count } = body.dry_run ? { count: 0 } : await db.from("gbp_posts").select("id", { count: "exact", head: true }).eq("location_id", loc.id).eq("state", "draft");
      if ((count ?? 0) > 0) { done[loc.id] = "draft_waiting"; await db.from("locations").update({ last_auto_post_at: new Date().toISOString() }).eq("id", loc.id); continue; }
      if (!hasFacts(loc.knowledge_card ?? {})) { done[loc.id] = "no_facts"; continue; }
      const { keywords } = await suggestKeywords(db, loc);
      const kw = keywords.slice(0, 3).map((k) => k.keyword);
      const week = Math.floor(Date.now() / (7 * 86400_000));
      const angle = ANGLES[week % ANGLES.length];
      const w = await writePost(loc, kw, `There is no owner note this week. ${angle} Write it in the language the owner's facts are written in.`);
      if (body.dry_run) { done[loc.id] = JSON.stringify({ keywords, slot: loc.post_slot, category: loc.category_label, area: loc.area, ...w }); continue; }
      if (!w.ok) { done[loc.id] = "check_failed"; await captureError("posts-weekly", new Error("weekly draft failed the grounding check"), { location_id: loc.id, issues: w.issues }); continue; }
      const text = w.text;
      const { data: post, error: pe } = await db.from("gbp_posts").insert({
        location_id: loc.id, owner_input: "Weekly draft by Kabsi", body: text, cta_type: "CALL", keywords: kw, source: "auto",
      }).select("id").single();
      if (pe) throw pe;
      await db.from("locations").update({ last_auto_post_at: new Date().toISOString() }).eq("id", loc.id);
      const url = `${APP_URL}/app/posts`;
      for (const to of await ownerEmails(loc.id)) {
        await sendEmail({
          kind: "weekly_post", to, locationId: loc.id, dedupeKey: `weekly_post:${post.id}:${to}`,
          subject: `Your post for this week is ready, ${loc.name}`,
          html: emailLayout({
            preheader: "Read it, change anything, then post it or skip it.",
            title: "This week's post is ready",
            bodyHtml: `<p style="margin:0 0 16px 0;">Kabsi drafted a Google post for ${esc(loc.name)} from the facts you gave us. Nothing is posted until you approve it.</p><p style="margin:0 0 20px 0;padding:14px 16px;background:#F6F4EF;border-radius:10px;white-space:pre-wrap;">${esc(text)}</p>`,
            button: { label: "Review the post", url },
            note: "Don't want weekly drafts? Switch them off on the Posts page.",
          }),
          text: `This week's post for ${loc.name} is ready. Nothing is posted until you approve it.\n\n${text}\n\nReview it: ${url}`,
        });
      }
      done[loc.id] = "drafted";
    } catch (e) {
      // Daily AI budget used up (K-100): skip this week's draft quietly; the global cap already alerted Slack.
      if (e instanceof AiBudgetError) { done[raw.id] = `ai_budget_${e.scope}`; continue; }
      done[raw.id] = "error";
      await captureError("posts-weekly", e, { location_id: raw.id });
    }
  }
  // Log only runs that did something (the job runs every 30 minutes).
  if (Object.keys(done).length) await jobLog("posts-weekly", !Object.values(done).includes("error"), { checked: locs?.length ?? 0, results: done });
  return json({ ok: true, results: done });
});

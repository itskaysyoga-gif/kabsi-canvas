// Phase 4 pipeline: sync → classify → draft → safety check → owner email → approve → publish.
import { admin, APP_URL, emailButton, emailLink, esc, sha256Hex } from "./kabsi.ts";
import { notify } from "./notify.ts";
import { listReviews } from "./google/index.ts";
import { buildMemory, classify, draftGrounded, draftMessage, editKinds, factAdditions, HIGH_RISK_TITLE, industryOf, issueLines, type Meter, MODELS, newMeter, type Risk, RULE_TEXT, runRecord } from "./ai.ts";
import { highRiskBlock, instantEmail, riskPlan } from "./review-risk.ts";
import type { FactRow } from "./facts.ts";
import { recordAiUsage, takeAiBudget } from "./ai-budget.ts";
import { isConciergeLocationId, matchConciergeReview, type ConciergeCandidate } from "./concierge.ts";
import { auditedAdmin } from "./audit.ts";
import { backlogLimit, backlogPolicy, backlogState, reopensOnPlan } from "./backlog.ts";


type Loc = {
  id: string; name: string; status: string; google_account_id: string | null; google_location_id: string | null;
  time_zone: string; digest_hour: number; reviews_synced_at: string | null;
  backlog_emailed_at: string | null; emails_paused_until: string | null; alert_emails: string[]; access_error_since?: string | null;
  concierge?: boolean; concierge_converted_at?: string | null;
};
const LOC_COLS = "id, name, status, google_account_id, google_location_id, time_zone, digest_hour, reviews_synced_at, backlog_emailed_at, emails_paused_until, alert_emails, access_error_since, concierge, concierge_converted_at";

// One active business with a Google location, or null (a job for it may outlive a pause or a deletion).
export async function activeLocation(id: string): Promise<Loc | null> {
  const { data, error } = await admin().from("locations").select(LOC_COLS).eq("id", id).eq("status", "active")
    .not("google_location_id", "is", null).maybeSingle();
  if (error) throw error;
  return (data as Loc | null) ?? null;
}

// Whether a business's reviews are read from Google. Concierge businesses are excluded: their reviews are typed in
// by staff, and asking Google about a made-up location id would fail and eventually mark access lost (Q07, D267).
export const isSyncable = (l: Loc) => !l.concierge && !isConciergeLocationId(l.google_location_id);

// ─── 1. Sync reviews from Google (or the mock)
export async function syncLocation(loc: Loc) {
  const db = admin();
  const reviews = await listReviews(loc.google_account_id!, loc.google_location_id!);
  const firstSync = !loc.reviews_synced_at;
  // K-66, K-101: how many unanswered reviews are drafted on the first read depends on the plan.
  const policy = await backlogPolicy(db, loc.id);
  const limit = backlogLimit(policy);
  const { data: known } = await db.from("reviews").select("google_review_id").eq("location_id", loc.id);
  const knownIds = new Set((known ?? []).map((r) => r.google_review_id));
  let added = 0;
  let backlogOpen = 0;
  // After a concierge business gets real access, reviews staff typed in are matched to the Google originals once,
  // so the first real sync does not duplicate them (only a single clear match counts).
  let manual: ConciergeCandidate[] = [];
  if (loc.concierge_converted_at) {
    const { data: rows } = await db.from("reviews").select("id, reviewer_name, star_rating, review_created_at")
      .eq("location_id", loc.id).eq("source", "concierge");
    manual = (rows ?? []).map((m) => ({ id: m.id, reviewer: m.reviewer_name, rating: m.star_rating, createdAt: m.review_created_at }));
  }
  for (const r of reviews) { // newest first
    if (knownIds.has(r.reviewId)) {
      // Refresh the cached text too: Google content is kept at most 30 days after Google last returned it (D257).
      await db.from("reviews").update({
        existing_reply: r.reply, review_updated_at: r.updateTime, reviewer_name: r.reviewer, comment: r.comment,
        star_rating: r.rating, fetched_at: new Date().toISOString(), content_purged_at: null,
      }).eq("location_id", loc.id).eq("google_review_id", r.reviewId);
      // Owner replied directly on Google: nothing left for Kabsi to do on this one.
      if (r.reply) {
        await db.from("reviews").update({ state: "handled_offline" })
          .eq("location_id", loc.id).eq("google_review_id", r.reviewId).in("state", ["new", "drafted", "blocked"]);
      }
      continue;
    }
    if (manual.length) {
      const hit = matchConciergeReview({ reviewer: r.reviewer, rating: r.rating, createTime: r.createTime }, manual);
      if (hit) {
        const { error: upErr } = await db.from("reviews").update({ google_review_id: r.reviewId, source: "google" }).eq("id", hit.id);
        if (!upErr) { manual = manual.filter((m) => m.id !== hit.id); continue; }
      }
    }
    let state = r.reply ? "handled_offline" : "new";
    if (firstSync && state === "new") state = backlogState(++backlogOpen, limit);
    const { error } = await db.from("reviews").insert({
      location_id: loc.id, google_review_id: r.reviewId, reviewer_name: r.reviewer, star_rating: r.rating,
      comment: r.comment, existing_reply: r.reply, review_created_at: r.createTime, review_updated_at: r.updateTime,
      state, is_backlog: firstSync,
    });
    if (error && error.code !== "23505") throw error;
    if (!error) added++;
  }
  // The reviews that waited for a plan are drafted once the business has one (full backlog on, K-101).
  if (!firstSync && reopensOnPlan(policy)) {
    await db.from("reviews").update({ state: "new" })
      .eq("location_id", loc.id).eq("is_backlog", true).eq("state", "archived").is("existing_reply", null);
  }
  await db.from("locations").update({ reviews_synced_at: new Date().toISOString() }).eq("id", loc.id);
  return added;
}

// ─── 2. Draft: the grounded reply pipeline (P0.3-02, K-14, K-39, K-120). One retry, then the draft is kept with its
// problems marked (state "blocked", never offered as ready).
// Risk first (K-13, P0.3-03): a high-risk review gets no draft. It waits as "blocked" with its reasons and the owner
// gets the checklist; a neutral holding reply is written only when the owner asks (`holding`), never before.
export async function draftReview(reviewId: string, instruction?: string, o: { holding?: boolean } = {}) {
  const db = admin();
  const { data: rv, error } = await db.from("reviews")
    .select("id, location_id, reviewer_name, star_rating, comment, draft_attempts, language, risk, risk_reasons, locations(name, status, category, category_label)")
    .eq("id", reviewId).single();
  if (error) throw error;
  const loc = rv.locations as unknown as { name: string; status: string; category: string | null; category_label: string | null };
  // Drafting is part of an active trial or plan (Q05): a Free business gets no new drafts, from any caller.
  if (loc.status !== "active") throw new Error("location_not_active");
  // One generation from the business and global daily AI budget (K-100); throws "ai_budget_*" when used up.
  await takeAiBudget(rv.location_id);
  const meter = newMeter();
  try {
    const { data: cat } = await db.from("knowledge_facts").select("value").eq("location_id", rv.location_id)
      .eq("key", "main_category").order("version", { ascending: false }).limit(1).maybeSingle();
    const main = (cat?.value ?? {}) as { display?: string; raw?: string };
    const industry = industryOf([loc.category, loc.category_label, main.display, main.raw]);
    return await draftWithChecks(rv, loc.name, meter, { instruction, holding: o.holding === true, industry });
  } finally {
    await recordAiUsage(rv.location_id, meter);
  }
}

/** What a draft may draw on (K-120): verified facts for replies, open questions, and the owner's own recent replies
 *  (the last 5 as style examples, the last 20 for the repeat check). Never review text. */
export async function memoryInputs(db: ReturnType<typeof admin>, locationId: string) {
  const [facts, questions, pubs] = await Promise.all([
    db.rpc("draft_facts", { p_location: locationId, p_use: "replies" }),
    db.from("knowledge_confirms").select("key").eq("location_id", locationId).eq("state", "open"),
    db.from("publications").select("payload").eq("location_id", locationId).eq("target_type", "review_reply")
      .is("payload_redacted_at", null).in("state", ["approved", "publishing", "published", "checking", "verifying", "verified"])
      .order("created_at", { ascending: false }).limit(20),
  ]);
  for (const r of [facts, questions, pubs]) if (r.error) throw r.error;
  const replies = ((pubs.data ?? []) as { payload: { text?: string } }[]).map((p) => p.payload?.text ?? "").filter(Boolean);
  return {
    facts: (facts.data ?? []) as FactRow[],
    openQuestions: ((questions.data ?? []) as { key: string }[]).map((q) => q.key),
    replies,
  };
}

type DraftRow = { id: string; location_id: string; reviewer_name: string | null; star_rating: number; comment: string | null; draft_attempts: number; language: string | null; risk: string | null; risk_reasons: string[] | null };
async function draftWithChecks(rv: DraftRow, business: string, meter: Meter, o: { instruction?: string; holding: boolean; industry: ReturnType<typeof industryOf> }) {
  const db = admin();
  const { instruction, industry } = o;
  const review = { reviewer: rv.reviewer_name ?? "A customer", rating: rv.star_rating, comment: rv.comment };

  // Classified once, when the review is first drafted; later versions keep that level. A review the code rules mark
  // high is not sent to a model, so it may have no language: the holding reply then answers in the review's language.
  let language = rv.language as string | null;
  let risk = (rv.risk ?? "low") as Risk;
  let reasons: string[] = rv.risk_reasons ?? [];
  if (!language && risk !== "high") ({ language, risk, reasons } = await classify(review, { industry, meter }));
  const { data: last } = await db.from("reply_drafts").select("version, body").eq("review_id", rv.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const plan = riskPlan({ risk, holding: o.holding, hasDraft: !!last, instruction });
  if (plan === "no_draft") {
    await db.from("reviews").update({
      language, risk, risk_reasons: reasons, state: "blocked", draft_attempts: rv.draft_attempts + 1, notified_at: null,
    }).eq("id", rv.id);
    return { ok: false, body: "", issues: [] as string[], risk };
  }
  const holding = plan === "holding";

  const inputs = await memoryInputs(db, rv.location_id);
  const memory = await buildMemory({ business, facts: inputs.facts, approvedReplies: inputs.replies.slice(0, 5), openQuestions: inputs.openQuestions, language: language ?? "unknown" });
  // An empty answer counts as an answer that does not parse: the draft is kept back, never retried blindly.
  const send = (system: Parameters<typeof draftMessage>[0], user: string, max: number) =>
    draftMessage(system, user, max, meter).catch((e) => {
      if (String(e).includes("empty reply")) return { text: "", model: MODELS.draft };
      throw e;
    });

  const base = { review, memory, language: language ?? "unknown", risk, reasons, industry, holding, recentReplies: inputs.replies };
  let result = await draftGrounded({ ...base, instruction, previous: instruction ? last?.body : undefined }, send, { meter });
  await db.from("ai_runs").insert(runRecord(result, { locationId: rv.location_id, reviewId: rv.id, workflow: "review_reply", memoryVersion: memory.version }));
  if (!result.ok && result.output) {
    // Second attempt: rewrite the failed draft, telling the model what the checks flagged.
    const fix = `Fix these problems: ${result.problems.join("; ")}`;
    result = await draftGrounded({ ...base, instruction: [instruction, fix].filter(Boolean).join(". "), previous: result.output.reply }, send, { meter });
    await db.from("ai_runs").insert(runRecord(result, { locationId: rv.location_id, reviewId: rv.id, workflow: "review_reply", memoryVersion: memory.version }));
  }
  const body = result.output?.reply ?? "";
  const factIds = (result.output?.facts_used ?? []).filter((r) => r in memory.refs).map((r) => memory.refs[r]);
  const { data: draft, error: de } = await db.from("reply_drafts").insert({
    review_id: rv.id, version: (last?.version ?? 0) + 1, body, source: instruction ? "ai_edit" : "ai",
    instruction: instruction ?? (o.holding ? "Neutral holding reply" : null),
    safety_ok: result.ok, safety_notes: result.problems, model: result.model, prompt_version: result.promptVersion, facts_used: factIds,
  }).select("id").single();
  if (de) throw de;
  await db.from("ai_runs").update({ draft_id: draft.id }).eq("review_id", rv.id).is("draft_id", null);
  await db.from("reviews").update({
    language, risk, risk_reasons: reasons,
    state: result.ok ? "drafted" : "blocked", draft_attempts: rv.draft_attempts + 1,
    // A version the owner asked for (an instruction, or the holding reply) sends no new email.
    ...(instruction || o.holding ? {} : { notified_at: null }),
  }).eq("id", rv.id);
  return { ok: result.ok, body, issues: result.problems, risk };
}

// ─── 3. Signed action links (D103, K-17): 32 random bytes, only the SHA-256 is stored, single use, 72 hours (the database
// caps it there too, P0.2-05)
export async function actionLink(o: { locationId: string; userId: string; action: string; reviewId: string }) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const { error } = await admin().from("action_tokens").insert({
    token_hash: await sha256Hex(token), location_id: o.locationId, user_id: o.userId, action: o.action,
    target_type: "review", target_id: o.reviewId, expires_at: new Date(Date.now() + 72 * 3600_000).toISOString(),
  });
  if (error) throw error;
  return `${APP_URL}/a/${token}`;
}

// ─── 4. Owner emails
type PendingReview = { id: string; reviewer_name: string | null; star_rating: number; comment: string | null; risk: string; risk_reasons: string[] | null; state: string; is_backlog: boolean };

async function latestDraft(reviewId: string) {
  const { data } = await admin().from("reply_drafts").select("body, safety_ok").eq("review_id", reviewId).order("version", { ascending: false }).limit(1).maybeSingle();
  return data;
}
const quote = (s: string) => `<div style="margin:0 0 16px 0;padding:14px 16px;background:#F6F4EF;border-radius:14px;white-space:pre-wrap;">${esc(s)}</div>`;
const link = (url: string, label: string) => emailLink(label, url);

// `withPost` is the daily digest, where several reviews share one email. A digest block carries text links only,
// so the email keeps exactly one yellow button (the layout's "Open Kabsi"). A single review email carries its own
// yellow "Review reply" and the layout button is left out (ownButton), with "Open Kabsi" as a text link beside
// Edit and Skip, on a line that wraps on a phone.
async function reviewBlock(loc: Loc, r: PendingReview, userId: string | null, withPost: boolean) {
  const draft = r.risk === "high" ? null : await latestDraft(r.id);
  const head = `<p style="margin:0 0 8px 0;"><strong>${esc(r.reviewer_name ?? "A customer")}</strong> · Rating ${r.star_rating} of 5</p>`;
  const reviewText = r.comment ? quote(r.comment) : `<p style="margin:0 0 16px 0;color:#5E5B55;">No written review, just a rating.</p>`;
  if (!userId) return { html: head + reviewText, text: `${r.reviewer_name}: ${r.star_rating}/5\n${r.comment ?? ""}` };
  // K-13: a high-risk review has no draft and no approve link; the email is the checklist (the layout's one button
  // opens Kabsi). A holding reply the owner asked for is approved in Kabsi, signed in.
  if (r.risk === "high") return highRiskBlock(r, head + reviewText);
  const mk = (action: string) => actionLink({ locationId: loc.id, userId, action, reviewId: r.id });
  if (r.state === "blocked" || !draft?.safety_ok) {
    const open = await mk("open");
    return {
      html: head + reviewText + `<p style="margin:0 0 16px 0;">A reply couldn't be safely drafted for this one. Write your own reply in Kabsi, or ask us.</p><div style="margin:0;">${link(open, "Open in Kabsi")}</div>`,
      text: `${r.star_rating}/5: no safe draft. Open: ${open}`,
    };
  }
  // K-13: a medium review shows its issue on top of the draft.
  const issues = r.risk === "medium" ? issueLines(r.risk_reasons ?? []) : [];
  const issueHtml = issues.length ? `<p style="margin:0 0 16px 0;padding:12px 14px;border:1px solid #E4E0D7;border-radius:14px;">${issues.map(esc).join("<br>")}</p>` : "";
  const issueText = issues.length ? `${issues.join("\n")}\n\n` : "";
  const [post, edit, skip] = await Promise.all([mk("post"), mk("edit"), mk("skip")]);
  const inbox = `${APP_URL}/app/inbox`;
  const drafted = head + reviewText + issueHtml + `<p style="margin:0 0 6px 0;font-size:14px;color:#5E5B55;">Drafted reply</p>` + quote(draft.body);
  if (withPost) {
    return {
      html: drafted + `<div style="margin:0;">${link(post, "Review reply")}${link(edit, "Edit")}${link(skip, "Skip")}</div>`,
      text: `${issueText}Draft:\n${draft.body}\n\nReview reply: ${post}\nEdit: ${edit}\nSkip: ${skip}`,
    };
  }
  return {
    html: drafted + emailButton("Review reply", post) + `<div style="margin:8px 0 0 0;">${link(edit, "Edit")}${link(skip, "Skip")}${link(inbox, "Open Kabsi")}</div>`,
    text: `${issueText}Draft:\n${draft.body}\n\nReview reply: ${post}\nEdit: ${edit}\nSkip: ${skip}\nOpen Kabsi: ${inbox}`,
    ownButton: true,
  };
}

// Hands a business's drafted reviews to the notification engine (notify.ts). The engine decides when each person is
// told (K-46): high-risk and careful reviews at once, normal reviews at once while the business is open and in the
// daily digest outside its opening hours, nothing before 08:00 local, nothing a person switched off. A review counts
// as notified once the engine has recorded it; the engine never records an event twice.
export async function notifyLocation(loc: Loc) {
  if (loc.emails_paused_until && Date.parse(loc.emails_paused_until) > Date.now()) return 0;
  const db = admin();
  const { data } = await db.from("reviews").select("id, reviewer_name, star_rating, comment, risk, risk_reasons, state, is_backlog")
    .eq("location_id", loc.id).in("state", ["drafted", "blocked"]).is("notified_at", null).order("review_created_at");
  const pending = (data ?? []) as PendingReview[];
  let handed = 0;
  const mark = (ids: string[]) => db.from("reviews").update({ notified_at: new Date().toISOString() }).in("id", ids);
  const inbox = `${APP_URL}/app/reviews?f=needs`;

  // Day-one backlog: one summary email (D221)
  const backlog = pending.filter((r) => r.is_backlog);
  if (backlog.length && !loc.backlog_emailed_at) {
    const n = backlog.length;
    const text = `${n} reviews without a reply for ${loc.name}. Drafts are ready.`;
    await notify({
      category: "review_new", kind: "backlog_ready", key: `backlog:${loc.id}`, locationId: loc.id, to: "members",
      inApp: { title: `${n} reviews are waiting`, body: "Replies are ready for you to read.", link: "/app/reviews?f=needs" },
      content: {
        subject: `${n} reviews without a reply: drafts ready`, title: `${n} reviews are waiting`, preheader: "Drafts are ready in your Kabsi inbox.",
        bodyHtml: `<p style="margin:0 0 16px 0;"><strong>${esc(loc.name)}</strong> has ${n} Google reviews without a reply. Kabsi drafted a reply for each one. Nothing is posted until you approve it.</p>`,
        text: `${text}\n\nOpen Kabsi: ${inbox}`, button: { label: "Open Kabsi", url: inbox },
        digest: { html: `<p style="margin:0 0 16px 0;"><strong>${esc(loc.name)}</strong> has ${n} Google reviews without a reply. Kabsi drafted a reply for each one.</p>`, text },
      },
    });
    await db.from("locations").update({ backlog_emailed_at: new Date().toISOString() }).eq("id", loc.id);
    handed++;
  }
  if (backlog.length) await mark(backlog.map((r) => r.id));

  // New reviews: one notice each. Medium and high risk need extra care (every rating of 1 to 3 is at least medium).
  for (const r of pending.filter((x) => !x.is_backlog)) {
    const careful = instantEmail(r), high = r.risk === "high";
    await notify({
      category: careful ? "review_high_risk" : "review_new", kind: high ? "review_high_risk" : "review_new", key: `review:${r.id}`,
      locationId: loc.id, to: "members",
      inApp: { title: high ? HIGH_RISK_TITLE.replace(/\.$/, "") : `New ${r.star_rating}-star review`, body: high ? "Kabsi did not draft a reply." : "A reply is ready.", link: "/app/reviews?f=needs" },
      content: async (rec, mode) => {
        const b = await reviewBlock(loc, r, rec.userId, mode === "digest") as { html: string; text: string; ownButton?: boolean };
        const subject = high ? `A review for ${loc.name} needs a little more care` : `New review for ${loc.name} (${r.star_rating} of 5)`;
        return {
          subject, title: high ? HIGH_RISK_TITLE.replace(/\.$/, "") : "New review", preheader: (r.comment ?? "").slice(0, 90),
          bodyHtml: b.html, text: b.ownButton ? b.text : `${b.text}\n\nOpen Kabsi: ${inbox}`,
          ...(b.ownButton ? {} : { button: { label: "Open Kabsi", url: inbox } }),
          ...(mode === "digest" ? { digest: { html: b.html, text: b.text } } : {}),
        };
      },
    });
    await mark([r.id]);
    handed++;
  }
  return handed;
}

// ─── 5. Approve a reply: the one publication pipeline (P0.1-13a, _shared/publish.ts, D202)
// approve_publication records the owner's approval with the exact text, claims the review and offers the publish
// job 10 seconds later (the undo window, K-70). A second approval of the same reply, from either channel, gets the
// same publication back (K-38). The publish job makes the one Google call, or the concierge task for a business in
// early access (D267). `audit` carries the owner's request into the audit log (P0.1-10, _shared/audit.ts).
export type Approval = { publication: string; state: string; publishAfter: string | null; created: boolean; offers?: StyleOffer[] };

export async function publishReply(o: { reviewId: string; text: string; approvedBy: string; channel: "dashboard" | "email_link"; audit?: Record<string, string> }): Promise<Approval> {
  const db = o.audit ? auditedAdmin(o.audit) : admin();
  const text = o.text.trim();
  if (!text || text.length > 4000) throw new Error("bad_reply_text");
  const { data, error } = await db.rpc("approve_publication", {
    p_target_type: "review_reply", p_target_id: o.reviewId, p_text: text, p_approved_by: o.approvedBy, p_channel: o.channel,
  });
  if (error) {
    for (const known of ["already_posted", "location_not_active", "bad_reply_text", "approver_not_member", "unknown_review"]) {
      if (String(error.message).includes(known)) throw new Error(known);
    }
    throw error;
  }
  const r = data as { publication_id: string; state: string; route: string; publish_after: string | null; created: boolean };
  const offers = r.created ? await learnFromApproval(o.reviewId, text, o.approvedBy) : [];
  // Concierge keeps its own word for the screens ("a person posts it").
  return { publication: r.publication_id, state: r.route === "concierge" ? "manual_queued" : r.state, publishAfter: r.publish_after, created: r.created, offers };
}

export type StyleOffer = { id: string; kind: string; text: string };

// After an approval (K-39 record, K-120.2): the approver goes on the draft's AI runs, and if the owner changed Kabsi's
// draft, the kind of change is noted. Three alike, or a fact the owner added, come back as offers the owner answers;
// nothing is saved without them. A failure here never undoes the approval.
async function learnFromApproval(reviewId: string, text: string, approvedBy: string): Promise<StyleOffer[]> {
  const db = admin();
  try {
    await db.from("ai_runs").update({ approved_by: approvedBy, approved_at: new Date().toISOString() })
      .eq("review_id", reviewId).is("approved_by", null);
    const { data: rv } = await db.from("reviews").select("location_id, reviewer_name").eq("id", reviewId).single();
    const { data: draft } = await db.from("reply_drafts").select("body, source").eq("review_id", reviewId)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (!rv || !draft?.body || draft.source === "owner" || draft.body.trim() === text.trim()) return [];
    const kinds = editKinds(draft.body, text, rv.reviewer_name ?? "");
    const { data: facts } = await db.rpc("draft_facts", { p_location: rv.location_id, p_use: null });
    const known = ((facts ?? []) as { value: Record<string, unknown> }[]).map((f) => JSON.stringify(f.value)).join("\n");
    const additions = factAdditions(draft.body, text, known);
    if (!kinds.length && !additions.length) return [];
    const { data, error } = await db.rpc("record_draft_edit", {
      p_location: rv.location_id, p_review: reviewId, p_kinds: kinds,
      p_rules: Object.fromEntries(kinds.map((k) => [k, RULE_TEXT[k]])), p_additions: additions,
    });
    if (error) throw error;
    return (data ?? []) as StyleOffer[];
  } catch (e) {
    console.log(JSON.stringify({ fn: "reviews", ok: false, learn_from_approval: String(e).slice(0, 200) }));
    return [];
  }
}

// Undo inside the 10 seconds (K-70). Throws "too_late" once the publish job may have started.
export async function undoReply(o: { publicationId: string; userId: string; audit?: Record<string, string> }) {
  const db = o.audit ? auditedAdmin(o.audit) : admin();
  const { error } = await db.rpc("undo_publication", { p_publication: o.publicationId, p_user: o.userId });
  if (error) {
    for (const known of ["too_late", "not_member", "unknown_publication"]) if (String(error.message).includes(known)) throw new Error(known);
    throw error;
  }
}

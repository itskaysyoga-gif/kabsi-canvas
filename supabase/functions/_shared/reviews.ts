// Phase 4 pipeline: sync → classify → draft → safety check → owner email → approve → publish.
import { admin, APP_URL, captureError, emailLayout, esc, isDefiniteGoogleRejection, sendEmail, sha256Hex } from "./kabsi.ts";
import { listReviews, putReply } from "./google.ts";
import { checkDraft, classify, draftReply, MODELS, type Card } from "./ai.ts";

const BACKLOG_LIMIT = 20; // D221

type Loc = {
  id: string; name: string; status: string; google_account_id: string | null; google_location_id: string | null;
  knowledge_card: Card; time_zone: string; digest_hour: number; reviews_synced_at: string | null;
  backlog_emailed_at: string | null; emails_paused_until: string | null; alert_emails: string[]; access_error_since?: string | null;
};
const LOC_COLS = "id, name, status, google_account_id, google_location_id, knowledge_card, time_zone, digest_hour, reviews_synced_at, backlog_emailed_at, emails_paused_until, alert_emails, access_error_since";

export async function activeLocations(): Promise<Loc[]> {
  const { data, error } = await admin().from("locations").select(LOC_COLS).eq("status", "active").not("google_location_id", "is", null);
  if (error) throw error;
  return (data ?? []) as Loc[];
}

// ─── 1. Sync reviews from Google (or the mock)
export async function syncLocation(loc: Loc) {
  const db = admin();
  const reviews = await listReviews(loc.google_account_id!, loc.google_location_id!);
  const firstSync = !loc.reviews_synced_at;
  const { data: known } = await db.from("reviews").select("google_review_id").eq("location_id", loc.id);
  const knownIds = new Set((known ?? []).map((r) => r.google_review_id));
  let added = 0;
  let backlogOpen = 0;
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
    let state = r.reply ? "handled_offline" : "new";
    if (firstSync && state === "new") state = ++backlogOpen <= BACKLOG_LIMIT ? "new" : "archived";
    const { error } = await db.from("reviews").insert({
      location_id: loc.id, google_review_id: r.reviewId, reviewer_name: r.reviewer, star_rating: r.rating,
      comment: r.comment, existing_reply: r.reply, review_created_at: r.createTime, review_updated_at: r.updateTime,
      state, is_backlog: firstSync,
    });
    if (error && error.code !== "23505") throw error;
    if (!error) added++;
  }
  await db.from("locations").update({ reviews_synced_at: new Date().toISOString() }).eq("id", loc.id);
  return added;
}

// ─── 2. Draft (classify + draft + safety; one retry, then blocked)
export async function draftReview(reviewId: string, instruction?: string) {
  const db = admin();
  const { data: rv, error } = await db.from("reviews")
    .select("id, location_id, reviewer_name, star_rating, comment, draft_attempts, language, urgency, locations(name, knowledge_card, status)")
    .eq("id", reviewId).single();
  if (error) throw error;
  const loc = rv.locations as unknown as { name: string; knowledge_card: Card; status: string };
  // Drafting is part of an active trial or plan (Q05): a Free business gets no new drafts, from any caller.
  if (loc.status !== "active") throw new Error("location_not_active");
  const review = { reviewer: rv.reviewer_name ?? "A customer", rating: rv.star_rating, comment: rv.comment };

  let language = rv.language as string | null;
  let urgent = rv.urgency === "urgent";
  let reasons: string[] = [];
  if (!language) ({ language, urgent, reasons } = await classify(review));

  const { data: last } = await db.from("reply_drafts").select("version, body").eq("review_id", rv.id).order("version", { ascending: false }).limit(1).maybeSingle();
  let body = "";
  let draftModel: string = MODELS.draft;
  let check = { ok: false, issues: [] as string[] };
  for (let attempt = 0; attempt < 2; attempt++) {
    // Second attempt: rewrite the failed draft, telling the model what the check flagged.
    const fix = attempt > 0 && body && check.issues.length ? `Fix these problems: ${check.issues.join("; ")}` : undefined;
    try {
      const drafted = await draftReply({
        review, business: loc.name, card: loc.knowledge_card ?? {}, language: language!, urgent,
        instruction: [instruction, fix].filter(Boolean).join(". ") || undefined, previous: fix ? body : last?.body,
      });
      body = drafted.text;
      draftModel = drafted.model;
    } catch (e) {
      if (!String(e).includes("empty reply")) throw e;
      body = "";
      check = { ok: false, issues: ["the model returned an empty draft"] };
      continue;
    }
    check = await checkDraft({ review, draft: body, card: loc.knowledge_card ?? {} });
    if (check.ok) break;
  }
  await db.from("reply_drafts").insert({
    review_id: rv.id, version: (last?.version ?? 0) + 1, body, source: instruction ? "ai_edit" : "ai", instruction: instruction ?? null,
    safety_ok: check.ok, safety_notes: check.issues, model: draftModel,
  });
  await db.from("reviews").update({
    language, urgency: urgent ? "urgent" : "normal", ...(reasons.length ? { urgency_reasons: reasons } : {}),
    state: check.ok ? "drafted" : "blocked", draft_attempts: rv.draft_attempts + 1,
    ...(instruction ? {} : { notified_at: null }),
  }).eq("id", rv.id);
  return { ok: check.ok, body, issues: check.issues };
}

export async function draftPending(limit = 10) {
  const { data } = await admin().from("reviews").select("id, locations!inner(status)")
    .eq("state", "new").lt("draft_attempts", 3).eq("locations.status", "active")
    .order("review_created_at", { ascending: false }).limit(limit);
  let drafted = 0;
  for (const r of data ?? []) {
    try { await draftReview(r.id); drafted++; } catch (e) {
      // One bad review must not stop the others; after 3 failed attempts it stays 'new' and shows in the inbox.
      const { data: cur } = await admin().from("reviews").select("draft_attempts").eq("id", r.id).single();
      await admin().from("reviews").update({ draft_attempts: (cur?.draft_attempts ?? 0) + 1 }).eq("id", r.id);
      await captureError("draft", e, { review: r.id });
    }
  }
  return drafted;
}

// ─── 3. Signed action links (D103): 32 random bytes, only the SHA-256 is stored, single use, 7 days
export async function actionLink(o: { locationId: string; userId: string; action: string; reviewId: string }) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const { error } = await admin().from("action_tokens").insert({
    token_hash: await sha256Hex(token), location_id: o.locationId, user_id: o.userId, action: o.action,
    target_type: "review", target_id: o.reviewId, expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
  });
  if (error) throw error;
  return `${APP_URL}/a/${token}`;
}

// ─── 4. Owner emails
type PendingReview = { id: string; reviewer_name: string | null; star_rating: number; comment: string | null; urgency: string; state: string; is_backlog: boolean };

function localHour(tz: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
}
function localDate(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}
async function latestDraft(reviewId: string) {
  const { data } = await admin().from("reply_drafts").select("body, safety_ok").eq("review_id", reviewId).order("version", { ascending: false }).limit(1).maybeSingle();
  return data;
}
const quote = (s: string) => `<div style="margin:0 0 16px 0;padding:14px 16px;background:#F6F4EF;border-radius:14px;white-space:pre-wrap;">${esc(s)}</div>`;
const link = (url: string, label: string) => `<a href="${esc(url)}" style="color:#111111;font-weight:700;">${esc(label)}</a>`;

async function reviewBlock(loc: Loc, r: PendingReview, userId: string | null, withPost: boolean) {
  const draft = await latestDraft(r.id);
  const head = `<p style="margin:0 0 8px 0;"><strong>${esc(r.reviewer_name ?? "A customer")}</strong> · Rating ${r.star_rating} of 5</p>`;
  const reviewText = r.comment ? quote(r.comment) : `<p style="margin:0 0 16px 0;color:#5E5B55;">No written review, just a rating.</p>`;
  if (!userId) return { html: head + reviewText, text: `${r.reviewer_name}: ${r.star_rating}/5\n${r.comment ?? ""}` };
  const mk = (action: string) => actionLink({ locationId: loc.id, userId, action, reviewId: r.id });
  if (r.state === "blocked" || !draft?.safety_ok) {
    const open = await mk("open");
    return {
      html: head + reviewText + `<p style="margin:0 0 16px 0;">A reply couldn't be safely drafted for this one. Write your own reply in Kabsi, or ask us.</p><p style="margin:0;">${link(open, "Open in Kabsi")}</p>`,
      text: `${r.star_rating}/5: no safe draft. Open: ${open}`,
    };
  }
  if (r.urgency === "urgent" && !withPost) {
    const [see, mine] = await Promise.all([mk("see_draft"), mk("handle_myself")]);
    return {
      html: head + reviewText + `<p style="margin:0 0 16px 0;">Don't reply in anger. A calm draft is ready. If you can reach the customer, call them.</p><p style="margin:0;">${link(see, "See draft")} &nbsp;·&nbsp; ${link(mine, "I'll handle it")}</p>`,
      text: `Needs care. See draft: ${see}\nI'll handle it: ${mine}`,
    };
  }
  const [post, edit, skip] = await Promise.all([mk("post"), mk("edit"), mk("skip")]);
  return {
    html: head + reviewText + `<p style="margin:0 0 6px 0;font-size:14px;color:#5E5B55;">Drafted reply</p>` + quote(draft.body) +
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#FFD60A;border-radius:14px;"><a href="${esc(post)}" style="display:inline-block;padding:13px 24px;font-weight:700;color:#000000;text-decoration:none;">Post</a></td><td style="padding-left:18px;">${link(edit, "Edit")}</td><td style="padding-left:18px;">${link(skip, "Skip")}</td></tr></table>`,
    text: `Draft:\n${draft.body}\n\nPost: ${post}\nEdit: ${edit}\nSkip: ${skip}`,
  };
}

async function sendToLocation(loc: Loc, o: { kind: string; key: string; subject: string; title: string; preheader: string; build: (userId: string | null) => Promise<{ html: string; text: string }> }) {
  const { data: members } = await admin().rpc("location_member_recipients", { p_location: loc.id });
  const recipients = new Map<string, string | null>();
  for (const m of (members ?? []) as { user_id: string; email: string }[]) recipients.set(m.email, m.user_id);
  for (const e of loc.alert_emails ?? []) if (!recipients.has(e.toLowerCase())) recipients.set(e.toLowerCase(), null);
  for (const [to, userId] of recipients) {
    const body = await o.build(userId);
    await sendEmail({
      kind: o.kind, to, locationId: loc.id, dedupeKey: `${o.key}:${to}`, subject: o.subject,
      html: emailLayout({ preheader: o.preheader, title: o.title, bodyHtml: body.html, button: { label: "Open Kabsi", url: `${APP_URL}/app/inbox` } }),
      text: `${body.text}\n\nOpen Kabsi: ${APP_URL}/app/inbox`,
    });
  }
}

export async function notifyLocation(loc: Loc) {
  if (loc.emails_paused_until && Date.parse(loc.emails_paused_until) > Date.now()) return 0;
  const db = admin();
  const { data } = await db.from("reviews").select("id, reviewer_name, star_rating, comment, urgency, state, is_backlog")
    .eq("location_id", loc.id).in("state", ["drafted", "blocked"]).is("notified_at", null).order("review_created_at");
  const pending = (data ?? []) as PendingReview[];
  let sent = 0;
  const mark = (ids: string[]) => db.from("reviews").update({ notified_at: new Date().toISOString() }).in("id", ids);

  // Day-one backlog: one summary email (D221)
  const backlog = pending.filter((r) => r.is_backlog);
  if (backlog.length && !loc.backlog_emailed_at) {
    await sendToLocation(loc, {
      kind: "backlog_ready", key: `backlog:${loc.id}`, subject: `${backlog.length} reviews without a reply: drafts ready`,
      title: `${backlog.length} reviews are waiting`, preheader: "Drafts are ready in your Kabsi inbox.",
      build: async () => ({ html: `<p style="margin:0 0 16px 0;"><strong>${esc(loc.name)}</strong> has ${backlog.length} Google reviews without a reply. Kabsi drafted a reply for each one. Nothing is posted until you approve it.</p>`, text: `${backlog.length} reviews without a reply for ${loc.name}. Drafts are ready.` }),
    });
    await db.from("locations").update({ backlog_emailed_at: new Date().toISOString() }).eq("id", loc.id);
    sent++;
  }
  if (backlog.length) await mark(backlog.map((r) => r.id));

  // New reviews: ≤3★ or urgent → one email each, right away (D220)
  const fresh = pending.filter((r) => !r.is_backlog);
  for (const r of fresh.filter((x) => x.star_rating <= 3 || x.urgency === "urgent")) {
    const urgent = r.urgency === "urgent";
    await sendToLocation(loc, {
      kind: urgent ? "review_urgent" : "review_new", key: `review:${r.id}`,
      subject: urgent ? `A review for ${loc.name} needs care` : `New review for ${loc.name} (${r.star_rating} of 5)`,
      title: urgent ? "This review needs care" : "New review", preheader: (r.comment ?? "").slice(0, 90),
      build: (userId) => reviewBlock(loc, r, userId, false),
    });
    await mark([r.id]);
    sent++;
  }

  // 4–5★ → one daily digest at the owner's digest hour (D220)
  const good = fresh.filter((x) => x.star_rating >= 4 && x.urgency !== "urgent");
  if (good.length && localHour(loc.time_zone) >= loc.digest_hour) {
    await sendToLocation(loc, {
      kind: "review_digest", key: `digest:${loc.id}:${localDate(loc.time_zone)}:${good.map((r) => r.id).join(",").slice(0, 60)}`,
      subject: `${good.length} new review${good.length > 1 ? "s" : ""} for ${loc.name}`, title: "Today's good reviews",
      preheader: "Replies are drafted. Post each one with one tap.",
      build: async (userId) => {
        const parts = [];
        for (const r of good) parts.push(await reviewBlock(loc, r, userId, true));
        return { html: parts.map((p) => p.html).join('<hr style="border:0;border-top:1px solid #E4E0D7;margin:24px 0;">'), text: parts.map((p) => p.text).join("\n\n---\n\n") };
      },
    });
    await mark(good.map((r) => r.id));
    sent++;
  }
  return sent;
}

// ─── 5. Publish: the only path that writes a reply to Google (D202)
export async function publishReply(o: { reviewId: string; text: string; approvedBy: string; channel: "dashboard" | "email_link" }) {
  const db = admin();
  const text = o.text.trim();
  if (!text || text.length > 4000) throw new Error("bad_reply_text");
  const { data: rv, error } = await db.from("reviews")
    .select("id, state, google_review_id, location_id, locations(status, google_account_id, google_location_id)").eq("id", o.reviewId).single();
  if (error) throw error;
  const loc = rv.locations as unknown as { status: string; google_account_id: string | null; google_location_id: string | null };
  if (loc.status !== "active" || !loc.google_location_id) throw new Error("location_not_active");

  // D266: atomic claim. Two approvals racing for the same review (dashboard click + email-link click, or a
  // double click) can no longer both reach Google — only the request that flips drafted/blocked -> publishing
  // proceeds; the loser sees "already_posted" instead of posting a duplicate reply.
  const { data: claimed, error: claimErr } = await db.from("reviews").update({ state: "publishing" })
    .eq("id", rv.id).in("state", ["drafted", "blocked"]).select("id").maybeSingle();
  if (claimErr) throw claimErr;
  if (!claimed) throw new Error("already_posted");

  const { data: pub, error: pubErr } = await db.from("publications").insert({
    location_id: rv.location_id, target_type: "review_reply", target_id: rv.id, payload: { text },
    approved_by: o.approvedBy, channel: o.channel, status: "queued",
  }).select("id").single();
  if (pubErr) { await db.from("reviews").update({ state: rv.state }).eq("id", rv.id); throw pubErr; }
  try {
    const result = await putReply(loc.google_account_id!, loc.google_location_id, rv.google_review_id, text);
    await db.from("publications").update({ status: result.state, google_response: result.response }).eq("id", pub.id);
    await db.from("reviews").update({ state: "posted", existing_reply: text, reply_state: result.state }).eq("id", rv.id);
    return { publication: pub.id, state: result.state };
  } catch (e) {
    await db.from("publications").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", pub.id);
    if (isDefiniteGoogleRejection(e)) {
      await db.from("reviews").update({ state: rv.state }).eq("id", rv.id);
    } else {
      await captureError("publish_stuck", e, { review: rv.id, publication: pub.id, note: "left in publishing — verify against Google before retrying" });
    }
    throw e;
  }
}

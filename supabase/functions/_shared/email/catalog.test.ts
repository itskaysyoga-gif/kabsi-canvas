import assert from "node:assert/strict";
import { categoryOf, isStaffCategory, SYSTEM_WHY, type SystemCategory } from "../notify-categories.ts";
import { catalog } from "./catalog.ts";
import { BRAND_LINE, NOT_AFFILIATED, renderEmail } from "./template.ts";
import { TOKENS } from "./tokens.ts";

// P0.4-08 done-when: every email has exactly one yellow button; the review email subject matches R-30; plain text exists
// for every template; house style (no dashes, no exclamation marks, the business name first in the subject).
const render = (c: ReturnType<typeof catalog>[number]) => {
  const cat = categoryOf(c.category);
  return renderEmail(c.content, {
    appUrl: "https://kabsi.co", defaultWhy: cat?.why ?? SYSTEM_WHY[c.category as SystemCategory] ?? "You asked for this email.",
    unsubscribePage: cat?.switchable ? "https://kabsi.co/unsubscribe?t=SAMPLE" : null,
    staff: isStaffCategory(c.category),
  });
};
// What a reader sees: the HTML without its style block, the Outlook comments and the tags.
const visible = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/g, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ");
const yellow = (html: string) => html.match(new RegExp(`background:${TOKENS.yellow}`, "gi"))?.length ?? 0;

Deno.test("every email has exactly one yellow button with black text", () => {
  for (const c of catalog()) {
    const { html } = render(c);
    assert.equal(yellow(html), 1, c.kind);
    assert.match(html, new RegExp(`color:${TOKENS.black};text-decoration:none`), c.kind);
  }
});

Deno.test("the review email subject is exactly '<Business>: new <n>-star review, reply ready' (R-30)", () => {
  const review = catalog().find((c) => c.kind === "review_new")!;
  assert.equal(review.content.subject, "Rose Lane Salon: new 5-star review, reply ready");
  const medium = catalog().find((c) => c.kind === "review_new_medium")!;
  assert.equal(medium.content.subject, "Rose Lane Salon: new 2-star review, reply ready");
  assert.equal(catalog().find((c) => c.kind === "review_high_risk")!.content.subject, "Rose Lane Salon: a review needs a little more care");
  assert.equal(catalog().find((c) => c.kind === "review_no_safe_draft")!.content.subject, "Rose Lane Salon: new 5-star review, your reply is needed");
});

Deno.test("the single review email: the button is Approve reply, Edit, Skip and Open Kabsi are plain links", () => {
  const c = catalog().find((x) => x.kind === "review_new")!;
  assert.equal(c.content.button?.label, "Approve reply");
  assert.deepEqual(c.content.links?.map((l) => l.label), ["Edit", "Skip", "Open Kabsi"]);
  const { html, text } = render(c);
  assert.equal(yellow(html), 1);
  assert.match(text, /Approve reply: https:\/\/kabsi.co\/a\/POSTTOKEN/);
  assert.match(text, /Edit: https:\/\/kabsi.co\/a\/EDITTOKEN/);
});

// COPY.md 25 (Email 1) names the subjects that do not lead with the business; every other business email does (K-102).
const OWN_SUBJECTS: Record<string, string> = {
  life_welcome: "Welcome to Kabsi, one step left",
  access_granted: "Kabsi can now look after Rose Lane Salon",
  life_first_reply_approved: "Your first reply is on Google",
  life_trial_day11: "Your Kabsi trial ends on 15 October",
  receipt: "Receipt: Kabsi Pro, monthly",
  payment_failed: "Your payment for Kabsi did not go through",
  plan_cancelled: "Your Kabsi plan is cancelled",
  profile_check: "Rose Lane Salon: your Google Profile Check",
  team_invite: "Rose Lane Salon: you're invited to Kabsi",
};
Deno.test("a business email puts the business name first in the subject (K-102), except COPY.md 25's own subjects", () => {
  for (const c of catalog().filter((x) => x.business)) {
    if (OWN_SUBJECTS[c.kind]) assert.equal(c.content.subject, OWN_SUBJECTS[c.kind], c.kind);
    else assert.ok(c.content.subject.startsWith("Rose Lane Salon:"), `${c.kind}: ${c.content.subject}`);
  }
  const subjects = catalog().map((c) => c.content.subject);
  assert.ok(subjects.includes("Rose Lane Salon: one step left in your setup"));
  assert.ok(subjects.includes("Rose Lane Salon: a reply is ready for your yes"));
  assert.ok(subjects.includes("Rose Lane Salon: Kabsi's Google access stopped working"));
  assert.ok(subjects.includes("Rose Lane Salon: your Results Report for 19 October to 25 October"));
});

Deno.test("every email has a preview line and a plain-text version with its button address and the footer", () => {
  for (const c of catalog()) {
    const { text } = render(c);
    assert.ok(c.content.preheader.length > 0, c.kind);
    assert.ok(c.content.text.trim().length > 20, c.kind);
    assert.ok(text.includes(c.content.button!.url), `${c.kind}: the button address is in the text`);
    if (isStaffCategory(c.category)) {
      // P0.8-02b: mail for the Kabsi team has a plain staff footer (tested below).
      assert.match(text, /Why you got this: /, c.kind);
      assert.match(text, /Kabsi is operated by Rashid Abou Hamzy\. Contact: hello@kabsi\.co\./, c.kind);
    } else {
      // COPY.md 25's footer: brand line, non-affiliation, Facebook, Instagram, the operator line.
      assert.match(text, /Why you got this: /, c.kind);
      assert.ok(text.includes(BRAND_LINE) && text.includes(NOT_AFFILIATED), c.kind);
      assert.match(text, /Facebook: https:\/\/www\.facebook\.com\//, c.kind);
      assert.match(text, /Instagram: https:\/\/www\.instagram\.com\/kabsi\.co/, c.kind);
      assert.match(text, /Kabsi is operated by Rashid Abou Hamzy\. Contact: hello@kabsi\.co\./, c.kind);
    }
    assert.doesNotMatch(text, /<[a-z][^>]*>/i, `${c.kind}: no HTML in the plain text`);
  }
});

Deno.test("every email: the card, the footer, 600 px, 16 px body, no leftovers", () => {
  for (const c of catalog()) {
    const { html } = render(c);
    assert.match(html, /max-width:600px/, c.kind);
    assert.match(html, /font-size:16px;line-height:1\.6/, c.kind);
    assert.match(html, new RegExp(`background:${TOKENS.sand}`), c.kind);
    assert.match(html, new RegExp(`background:${TOKENS.white};border:1px solid ${TOKENS.hairline};border-radius:16px`), c.kind);
    assert.match(html, /Why you got this:/, c.kind);
    if (!isStaffCategory(c.category)) {
      assert.match(html, />Facebook</, c.kind);
      assert.match(html, />Instagram</, c.kind);
      assert.ok(html.includes(NOT_AFFILIATED), c.kind);
    }
    assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/, c.kind);
    assert.doesNotMatch(html, /undefined|\[object|NaN|\{\{/, c.kind);
  }
});

Deno.test("only mail the owner can switch off carries an unsubscribe link", () => {
  for (const c of catalog()) {
    const { html, text } = render(c);
    const switchable = !!categoryOf(c.category)?.switchable;
    assert.equal(html.includes("Unsubscribe from these emails"), switchable, c.kind);
    assert.equal(text.includes("Unsubscribe from these emails"), switchable, c.kind);
  }
});

Deno.test("house style: no em dash, no en dash, no exclamation mark; never a banned product name", () => {
  for (const c of catalog()) {
    const { html, text } = render(c);
    const all = `${c.content.subject}\n${c.content.preheader}\n${c.content.title}\n${text}\n${visible(html)}`;
    assert.doesNotMatch(all, /[–—!]/, c.kind);
    assert.doesNotMatch(all, /Profile Score|Do now|Listing Shield|Put mine back|Profile Care|Monday Report|Review Link and Card/, c.kind);
    assert.doesNotMatch(all, /approved by Google|partner of Google|automatically/i, c.kind);
  }
});

Deno.test("the digest email is grouped and has one button", () => {
  const d = catalog().find((c) => c.kind === "digest")!;
  assert.equal(d.content.subject, "Rose Lane Salon: 2 new reviews, 1 profile change and 1 post or photo to approve");
  const { html } = render(d);
  assert.equal(yellow(html), 1);
  assert.match(html, /2 new reviews/);
});

Deno.test("the catalog covers every kind of email Kabsi sends", () => {
  const kinds = catalog().map((c) => c.kind);
  for (const needed of ["review_new", "review_high_risk", "backlog_ready", "digest", "access_granted", "access_lost", "deletion_scheduled", "renew_r5",
    "weekly_report", "weekly_post", "shield_alert_urgent", "team_invite", "profile_check",
    "assistant_report", "assistant_handoff", "assistant_handoff_ack", "life_welcome", "life_no_access_1h", "life_trial_day7", "life_trial_day14", "life_winback_30"]) assert.ok(kinds.includes(needed), needed);
  assert.equal(new Set(kinds).size, kinds.length);
});

Deno.test("retired emails stay gone (P0.8-01, K-123 to K-127): no partner, payment-method or Lebanon mail", () => {
  const kinds = catalog().map((c) => c.kind);
  for (const gone of ["payment_received", "partner_invite", "partner_invoice", "partner_paid", "usdt_claim_alert"]) assert.ok(!kinds.includes(gone), gone);
  for (const c of catalog()) {
    const { html, text } = render(c);
    const all = `${c.content.subject}\n${text}\n${visible(html)}`;
    assert.doesNotMatch(all, /usdt|binance|whish|\bomt\b|nowpayments|lebanon|lebanese|\+961|resale|partner/i, c.kind);
    assert.doesNotMatch(all, /\bcash\b|NFC card(s)? (order|price)|order (a|your) card/i, c.kind);
  }
});

Deno.test("P0.8-02: the two win-backs have different subjects", () => {
  const s17 = catalog().find((c) => c.kind === "life_winback_17")!.content.subject;
  const s30 = catalog().find((c) => c.kind === "life_winback_30")!.content.subject;
  assert.notEqual(s17, s30);
  assert.ok(s17.startsWith("Rose Lane Salon: ") && s30.startsWith("Rose Lane Salon: "));
});

Deno.test("P0.8-02: no email keeps the old Weekly Care Report subject or the old deletion wording", () => {
  for (const c of catalog()) {
    const all = `${c.content.subject}\n${c.content.title}\n${c.content.preheader}`;
    assert.doesNotMatch(all, /Your week on Google/, c.kind);
    assert.doesNotMatch(all, /will be deleted from Kabsi/, c.kind);
  }
  // 30.18 section 3: the Monday email is the Results Report; "Weekly Care Report" is retired everywhere.
  assert.equal(catalog().find((c) => c.kind === "weekly_report")!.content.subject, "Rose Lane Salon: your Results Report for 19 October to 25 October");
  for (const c of catalog()) {
    const { html, text } = render(c);
    assert.doesNotMatch(`${c.content.subject}\n${text}\n${html}`, /Weekly Care Report/, c.kind);
  }
});

Deno.test("P0.8-02b: one set of trial emails, the lifecycle set; the old trial_d7, trial_d1 and trial_d0 are gone", () => {
  const kinds = catalog().map((c) => c.kind);
  for (const gone of ["trial_d7", "trial_d1", "trial_d0"]) assert.ok(!kinds.includes(gone), gone);
  assert.deepEqual(kinds.filter((k) => /trial/.test(k)), ["life_trial_day2", "life_trial_day7", "life_trial_day11", "life_trial_day14"]);
  for (const c of catalog()) {
    const { html, text } = render(c);
    assert.doesNotMatch(`${text}\n${html}`, /reply drafts, Google Protection and the Weekly Care Report stop/, c.kind);
  }
});

Deno.test("P0.8-02b: the trial emails match the 7 day grace rule (P0.4-06): watching and drafting go on, nothing is published", () => {
  for (const kind of ["life_trial_day11", "life_trial_day14"]) {
    const { text } = render(catalog().find((c) => c.kind === kind)!);
    assert.match(text, /keeps? watching/, kind);
    assert.match(text, /drafting/, kind);
    assert.match(text, /publishes nothing/, kind);
    assert.match(text, /7 (more )?days/, kind);
    assert.doesNotMatch(text, /Kabsi stops publishing on/, kind);
  }
});

Deno.test("P0.8-02b: the retired trial reminder job sends nothing", async () => {
  const { trialsJob } = await import("../../api/cron.ts");
  assert.deepEqual(await trialsJob(), { reminders: 0, retired: true });
});

Deno.test("P0.8-02b: wording fixes (the Profile Check, access and report emails, the review email, no cards)", () => {
  const find = (k: string) => catalog().find((c) => c.kind === k)!;
  const profile = render(find("profile_check"));
  assert.equal(find("profile_check").content.button?.label, "Start your free trial");
  assert.equal(find("profile_check").content.button?.url, "https://kabsi.co/get-started");
  assert.doesNotMatch(profile.text + profile.html, /Join early access/);
  assert.equal(profile.text.split("This check uses public information").length - 1, 1);
  for (const k of ["access_removed", "access_removing", "weekly_report"]) {
    const { text, html } = render(find(k));
    assert.doesNotMatch(`${text}\n${html}`, /\bcards?\b|Card and link/i, k);
  }
  assert.match(render(find("weekly_report")).text, /From your Kabsi review link: opened 9 times\. An open is not a review\./);
  assert.match(render(find("access_granted")).text, /Or on your Business Profile/);
  for (const k of ["review_new", "review_new_medium"]) {
    assert.equal(find(k).content.button?.label, "Approve reply", k);
    assert.doesNotMatch(render(find(k)).text, /Review reply/, k);
  }
  for (const k of ["life_no_access_1h", "life_no_access_24h", "life_no_access_72h"]) {
    const { text } = render(find(k));
    assert.match(text, /Why you got this: You started setting up Kabsi and one step is left\./, k);
    assert.match(text, /https:\/\/kabsi\.co\/start\/resume\/3f9a1c7e5b2d4086a1ce/, k);
    assert.doesNotMatch(text, /Why you got this: This is Kabsi's own notice/, k);
  }
});

Deno.test("P0.8-02b: staff-only emails have a plain staff footer: no approval promise, no settings, no unsubscribe", () => {
  const staff = ["assistant_handoff", "assistant_report"];
  for (const kind of staff) {
    const c = catalog().find((x) => x.kind === kind)!;
    assert.equal(c.category, "internal", kind);
    const { html, text } = render(c);
    const all = `${visible(html)}\n${text}`;
    assert.match(text, /This notice is for the Kabsi team only\./, kind);
    assert.match(text, /Why you got this: This is a notice for the Kabsi team\./, kind);
    assert.doesNotMatch(all, /Nothing is published until you approve it/, kind);
    assert.doesNotMatch(all, /Email settings|Unsubscribe|unsubscribe/, kind);
    assert.equal(yellow(html), 1, kind);
  }
  // An owner email keeps its footer, and the review email says the approval promise in its body (COPY.md 22).
  const owner = render(catalog().find((x) => x.kind === "review_new")!);
  assert.match(owner.text, /Nothing is published until you approve it\./);
  assert.ok(owner.text.includes(BRAND_LINE));
});

Deno.test("P0.8-02b: the sample reviews are realistic: a careful draft for a refund complaint, two different reviews in the digest", () => {
  const medium = catalog().find((x) => x.kind === "review_new_medium")!;
  const { text } = render(medium);
  assert.doesNotMatch(text, /glad you enjoyed/i);
  assert.match(text, /refund/i);
  assert.match(text, /sorry/i);
  assert.doesNotMatch(text, /\b(we will|we.ll) (refund|give you)|full refund|guarantee/i, "a careful draft promises no refund");
  const digest = catalog().find((x) => x.kind === "digest")!;
  const { text: dtext } = render(digest);
  assert.match(dtext, /Maya K\./);
  assert.match(dtext, /Omar H\./);
  const reviewers = [...dtext.matchAll(/^([A-Z][a-z]+ [A-Z]\.): \d of 5$/gm)].map((m) => m[1]);
  assert.deepEqual(reviewers, ["Maya K.", "Omar H."]);
});

// ─── Email 1 (master plan 30.18 sections 2 and 3) ─────────────────────────────────────────────────────────────────
const EMOJI = /\p{Extended_Pictographic}/u;
const ACCOUNT_CATEGORIES = new Set(["access", "billing", "account", "direct", "help", "internal"]);

Deno.test("Email 1: emoji only as small section markers, at most one per card, never in an account-mail subject", () => {
  for (const c of catalog()) {
    if (ACCOUNT_CATEGORIES.has(c.category)) assert.doesNotMatch(c.content.subject, EMOJI, c.kind);
    const { html, text } = render(c);
    // Each card is one table; no card carries more than one emoji, and no emoji stands in a sentence of the plain text.
    for (const cardHtml of html.split('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">').slice(1)) {
      const inCard = cardHtml.slice(0, cardHtml.indexOf("</table>"));
      assert.ok((inCard.match(/\p{Extended_Pictographic}/gu) ?? []).length <= 1, c.kind);
    }
    assert.doesNotMatch(text, EMOJI, `${c.kind}: the plain text never needs an emoji`);
  }
});

Deno.test("Email 1: every link is absolute and on kabsi.co, except the social links, Google's third-party page and mailto", () => {
  const allowed = /^(https:\/\/kabsi\.co(\/|$)|https:\/\/www\.facebook\.com\/profile\.php\?id=|https:\/\/www\.instagram\.com\/kabsi\.co$|https:\/\/support\.google\.com\/business\/answer\/7163406$|mailto:)/;
  for (const c of catalog()) {
    const { html } = render(c);
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const href = m[1]!.replace(/&amp;/g, "&");
      assert.match(href, allowed, `${c.kind}: ${href}`);
    }
    for (const m of html.matchAll(/src="([^"]+)"/g)) assert.match(m[1]!, /^https:\/\/kabsi\.co\//, `${c.kind}: ${m[1]}`);
    assert.doesNotMatch(html, /cid:/, `${c.kind}: the logo is hosted, never an attachment`);
  }
});

Deno.test("Email 1: under 100 KB of HTML, light and dark, the logo with alt text, a VML button for Outlook", () => {
  for (const c of catalog()) {
    const { html } = render(c);
    assert.ok(new TextEncoder().encode(html).length < 100_000, `${c.kind}: ${html.length} bytes`);
    assert.match(html, /<meta name="color-scheme" content="light dark">/, c.kind);
    assert.match(html, /@media \(prefers-color-scheme:dark\)/, c.kind);
    assert.match(html, /\[data-ogsc\] /, c.kind);
    assert.match(html, /<img src="https:\/\/kabsi\.co\/email\/kabsi-mark\.png" width="32" height="32" alt="Kabsi"/, c.kind);
    if (c.content.button) assert.match(html, /<v:roundrect [^>]*fillcolor="#FFD60A"/, c.kind);
  }
});

Deno.test("Email 1: the Results Report is the work receipt; a row without real numbers hides", async () => {
  const { renderReport } = await import("./report-body.ts");
  const { REPORT_NO_GOOGLE } = await import("./catalog.ts");
  const c = catalog().find((x) => x.kind === "weekly_report")!;
  const { text, html } = render(c);
  assert.match(text, /What Kabsi did: Replies published 4/);
  assert.match(text, /Waiting for your yes: A reply to Maya K\.'s review/);
  assert.match(text, /One next step: Send your review link/);
  assert.match(text, /- Calls: 18 \(4 more than last week\)/);
  assert.match(text, /- Direction requests: 31 \(2 fewer than last week\)/);
  assert.equal(c.content.button?.label, "Review and approve");
  assert.doesNotMatch(`${text}\n${html}`, /example figures/i, "a real owner's report never shows example figures");
  const none = renderReport({ name: "Rose Lane Salon" }, REPORT_NO_GOOGLE as never);
  assert.doesNotMatch(none.text, /Calls|Direction requests|Website clicks/);
  assert.match(none.text, /From Kabsi's record of your reviews: 3 new reviews\./);
});

Deno.test("Email 1: lifecycle mail goes from send.kabsi.co until news.kabsi.co is verified, account mail always from send", async () => {
  const { NEWS_DOMAIN_VERIFIED, streamOf } = await import("./streams.ts");
  assert.equal(NEWS_DOMAIN_VERIFIED, false, "news.kabsi.co is not a Resend domain yet (27 Oct 2026)");
  for (const cat of ["trial", "review_new", "billing", "access", "account", "weekly_report"]) assert.equal(streamOf(cat), "send", cat);
});

Deno.test("Email 1: the 30.15 section 6 set is in the catalog with COPY.md 25's lines", () => {
  const find = (k: string) => catalog().find((c) => c.kind === k)!;
  assert.equal(find("life_no_access_24h").content.subject, "Rose Lane Salon: one step left in your setup");
  assert.equal(find("life_no_access_24h").content.button?.url, "https://kabsi.co/start/resume/3f9a1c7e5b2d4086a1ce");
  assert.match(render(find("one_reminder")).text, /This is the only reminder Kabsi sends for this reply\./);
  assert.match(render(find("receipt")).text, /Payments are processed by Creem, our merchant of record\./);
  assert.equal(find("life_trial_day11").content.button?.label, "Choose my plan");
  assert.match(find("life_trial_day11").content.text, /Or let it end\./);
  assert.equal(find("payment_failed").content.button?.label, "Update my card");
  assert.equal(find("plan_cancelled").content.button?.label, "Keep my plan");
  assert.equal(find("receipt").content.note, "Payments are processed by Creem, our merchant of record.");
  assert.equal(find("life_welcome").content.button?.label, "Add Kabsi as a Manager");
  assert.match(find("life_welcome").content.note ?? "", /Google Business Profile is free from Google\. Kabsi is an independent paid service\./);
  // Account mail a person cannot switch off has no unsubscribe link (checked for every email above).
  for (const k of ["receipt", "payment_failed", "plan_cancelled", "access_granted", "access_lost", "life_trial_day11"]) {
    assert.doesNotMatch(render(find(k)).html, /Unsubscribe from these emails/, k);
  }
});

Deno.test("Email 1: the examples are Rose Lane Salon in Dubai, never a Beirut address or a real business", () => {
  for (const c of catalog()) {
    const { html, text } = render(c);
    assert.doesNotMatch(`${c.content.subject}\n${text}\n${html}`, /Beirut|Hamra|Yawmiyati|man'oushe|manakish/i, c.kind);
  }
});

Deno.test("Email 1: the plain text says each line once (the note is added by the template, not repeated by the email)", () => {
  for (const c of catalog()) {
    const { text } = render(c);
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 30 && !/^[A-Z][a-z ]+: https?:/.test(l));
    const seen = new Set<string>();
    for (const l of lines) {
      assert.ok(!seen.has(l), `${c.kind}: "${l}" appears twice`);
      seen.add(l);
    }
  }
});

import assert from "node:assert/strict";
import { categoryOf, isStaffCategory, SYSTEM_WHY, type SystemCategory } from "../notify-categories.ts";
import { catalog } from "./catalog.ts";
import { renderEmail } from "./template.ts";
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
  assert.equal(review.content.subject, "Yawmiyati: new 5-star review, reply ready");
  const medium = catalog().find((c) => c.kind === "review_new_medium")!;
  assert.equal(medium.content.subject, "Yawmiyati: new 2-star review, reply ready");
  assert.equal(catalog().find((c) => c.kind === "review_high_risk")!.content.subject, "Yawmiyati: a review needs a little more care");
  assert.equal(catalog().find((c) => c.kind === "review_no_safe_draft")!.content.subject, "Yawmiyati: new 5-star review, your reply is needed");
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

Deno.test("a business email puts the business name first in the subject (K-102)", () => {
  for (const c of catalog().filter((x) => x.business && x.kind !== "profile_check" && x.kind !== "team_invite")) {
    assert.ok(c.content.subject.startsWith("Yawmiyati:"), `${c.kind}: ${c.content.subject}`);
  }
  assert.equal(catalog().find((c) => c.kind === "profile_check")!.content.subject, "Yawmiyati: your Google Profile Check");
  assert.equal(catalog().find((c) => c.kind === "team_invite")!.content.subject, "Yawmiyati: you're invited to Kabsi");
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
      assert.match(text, /Nothing is published until you approve it\./, c.kind);
      assert.match(text, /Why you got this: /, c.kind);
      assert.match(text, /Email settings: https:\/\/kabsi.co\/app\/settings#choices/, c.kind);
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
    assert.match(html, new RegExp(`background:${TOKENS.white};border-radius:14px`), c.kind);
    assert.match(html, /Why you got this:/, c.kind);
    if (!isStaffCategory(c.category)) {
      assert.match(html, />Email settings</, c.kind);
      assert.match(html, /not affiliated with, sponsored by or endorsed by Google/, c.kind);
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
    const all = `${c.content.subject}\n${c.content.preheader}\n${c.content.title}\n${text}\n${html.replace(/<[^>]+>/g, " ")}`;
    assert.doesNotMatch(all, /[–—!]/, c.kind);
    assert.doesNotMatch(all, /Profile Score|Do now|Listing Shield|Put mine back|Profile Care|Monday Report|Review Link and Card/, c.kind);
    assert.doesNotMatch(all, /approved by Google|partner of Google|automatically/i, c.kind);
  }
});

Deno.test("the digest email is grouped and has one button", () => {
  const d = catalog().find((c) => c.kind === "digest")!;
  assert.equal(d.content.subject, "Yawmiyati: 2 new reviews, 1 profile change and 1 post or photo to approve");
  const { html } = render(d);
  assert.equal(yellow(html), 1);
  assert.match(html, /2 new reviews/);
});

Deno.test("the catalog covers every kind of email Kabsi sends", () => {
  const kinds = catalog().map((c) => c.kind);
  for (const needed of ["review_new", "review_high_risk", "backlog_ready", "digest", "access_granted", "access_lost", "deletion_scheduled", "renew_r5",
    "weekly_report", "weekly_post", "shield_alert_urgent", "team_invite", "profile_check",
    "assistant_report", "assistant_handoff", "assistant_handoff_ack", "lead_alert", "life_welcome", "life_no_access_1h", "life_trial_day7", "life_trial_day14", "life_winback_30"]) assert.ok(kinds.includes(needed), needed);
  assert.equal(new Set(kinds).size, kinds.length);
});

Deno.test("retired emails stay gone (P0.8-01, K-123 to K-127): no partner, payment-method or Lebanon mail", () => {
  const kinds = catalog().map((c) => c.kind);
  for (const gone of ["payment_received", "partner_invite", "partner_invoice", "partner_paid", "usdt_claim_alert"]) assert.ok(!kinds.includes(gone), gone);
  for (const c of catalog()) {
    const { html, text } = render(c);
    const all = `${c.content.subject}\n${text}\n${html.replace(/<[^>]+>/g, " ")}`;
    assert.doesNotMatch(all, /usdt|binance|whish|\bomt\b|nowpayments|lebanon|lebanese|\+961|resale|partner/i, c.kind);
    assert.doesNotMatch(all, /\bcash\b|NFC card(s)? (order|price)|order (a|your) card/i, c.kind);
  }
});

Deno.test("P0.8-02: the two win-backs have different subjects", () => {
  const s17 = catalog().find((c) => c.kind === "life_winback_17")!.content.subject;
  const s30 = catalog().find((c) => c.kind === "life_winback_30")!.content.subject;
  assert.notEqual(s17, s30);
  assert.ok(s17.startsWith("Yawmiyati: ") && s30.startsWith("Yawmiyati: "));
});

Deno.test("P0.8-02: no email keeps the old Weekly Care Report subject or the old deletion wording", () => {
  for (const c of catalog()) {
    const all = `${c.content.subject}\n${c.content.title}\n${c.content.preheader}`;
    assert.doesNotMatch(all, /Your week on Google/, c.kind);
    assert.doesNotMatch(all, /will be deleted from Kabsi/, c.kind);
  }
  assert.equal(catalog().find((c) => c.kind === "weekly_report")!.content.subject, "Yawmiyati: your Weekly Care Report");
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
  assert.match(render(find("weekly_report")).text, /Review link and QR code opens/);
  assert.match(render(find("access_granted")).text, /Or on your Business Profile/);
  for (const k of ["review_new", "review_new_medium"]) {
    assert.equal(find(k).content.button?.label, "Approve reply", k);
    assert.doesNotMatch(render(find(k)).text, /Review reply/, k);
  }
  for (const k of ["life_no_access_1h", "life_no_access_24h", "life_no_access_72h"]) {
    const { text } = render(find(k));
    assert.match(text, /Why you got this: You started setting up Kabsi\./, k);
    assert.doesNotMatch(text, /Why you got this: This is Kabsi's own notice/, k);
  }
});

Deno.test("P0.8-02b: staff-only emails have a plain staff footer: no approval promise, no settings, no unsubscribe", () => {
  const staff = ["assistant_handoff", "assistant_report", "lead_alert"];
  for (const kind of staff) {
    const c = catalog().find((x) => x.kind === kind)!;
    assert.equal(c.category, "internal", kind);
    const { html, text } = render(c);
    const all = `${html.replace(/<[^>]+>/g, " ")}\n${text}`;
    assert.match(text, /This notice is for the Kabsi team only\./, kind);
    assert.match(text, /Why you got this: This is a notice for the Kabsi team\./, kind);
    assert.doesNotMatch(all, /Nothing is published until you approve it/, kind);
    assert.doesNotMatch(all, /Email settings|Unsubscribe|unsubscribe/, kind);
    assert.equal(yellow(html), 1, kind);
  }
  // An owner email keeps its footer.
  const owner = render(catalog().find((x) => x.kind === "review_new")!);
  assert.match(owner.text, /Nothing is published until you approve it\./);
  assert.match(owner.text, /Email settings:/);
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
  assert.match(dtext, /Sarah/);
  assert.match(dtext, /Omar/);
  const reviewers = [...dtext.matchAll(/^([A-Z][a-z]+): \d of 5$/gm)].map((m) => m[1]);
  assert.deepEqual(reviewers, ["Sarah", "Omar"]);
});

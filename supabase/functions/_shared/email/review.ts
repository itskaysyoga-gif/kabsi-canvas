// The review emails (K-13, K-102, R-30), as pure functions: what one review looks like in an email, from data the
// caller has already read. reviews.ts reads the draft and makes the approval links; this file only writes the words.
//   one review      "<Business>: new <n>-star review, reply ready" with the one yellow button "Approve reply", and the
//                   plain links Edit, Skip and Open Kabsi
//   a risky review  "<Business>: a review needs a little more care": the checklist, no draft, one button "Open Kabsi"
//   a digest line   the review and its draft with text links only, so the digest keeps its one button
import { esc } from "../email-layout.ts";
import { HIGH_RISK_TITLE, issueLines } from "../ai/risk.ts";
import { highRiskBlock } from "../review-risk.ts";
import { type EmailContent, PROMISE } from "./template.ts";
import { TOKENS } from "./tokens.ts";
import { highRiskSubject, reviewSubject } from "./copy.ts";
import { emailLink, label, quoteBox } from "../email-layout.ts";

export type ReviewInput = {
  business: string;
  reviewer: string | null;
  stars: number;
  comment: string | null;
  risk: string;
  riskReasons: string[] | null;
  state: string;
  /** The latest draft, or null when there is none. */
  draft: { body: string; safe: boolean } | null;
  /** The signed links for this person, or null for an address with no Kabsi account (it gets the review, no links). */
  links: { post: string; edit: string; skip: string; open: string } | null;
  appUrl: string;
};

const quote = quoteBox;

type Block = { html: string; text: string; button?: { label: string; url: string }; links?: { label: string; url: string }[] };

/** One review as the body of an email (or of a digest line when withPost is true). */
export function reviewBlock(i: ReviewInput, withPost: boolean): Block {
  const inbox = `${i.appUrl}/app/reviews?f=needs`;
  const head = `<p style="margin:0 0 8px 0;"><strong>${esc(i.reviewer ?? "A customer")}</strong> · Rating ${i.stars} of 5</p>`;
  const reviewText = i.comment ? quote(i.comment) : `<p class="kb-t2" style="margin:0 0 16px 0;color:${TOKENS.stone};">No written review, just a rating.</p>`;
  const plainHead = `${i.reviewer ?? "A customer"}: ${i.stars} of 5\n${i.comment ?? "No written review, just a rating."}`;
  if (!i.links) return { html: head + reviewText, text: plainHead };
  // K-13: a high-risk review has no draft and no approve link; the email is the checklist. A holding reply the owner
  // asked for is approved in Kabsi, signed in.
  if (i.risk === "high") {
    const b = highRiskBlock({ risk_reasons: i.riskReasons }, head + reviewText);
    return { html: b.html, text: `${plainHead}\n\n${b.text}` };
  }
  if (i.state === "blocked" || !i.draft?.safe) {
    return {
      html: head + reviewText + `<p style="margin:0 0 16px 0;">A reply couldn't be safely drafted for this one. Write your own reply in Kabsi, or ask us.</p>`,
      text: `${plainHead}\n\nA reply couldn't be safely drafted for this one. Write your own reply in Kabsi, or ask us.`,
      button: { label: "Open in Kabsi", url: i.links.open },
    };
  }
  // K-13: a medium review shows its issue on top of the draft.
  const issues = i.risk === "medium" ? issueLines(i.riskReasons ?? []) : [];
  const issueHtml = issues.length ? `<p class="kb-line" style="margin:0 0 16px 0;padding:12px 14px;border:1px solid ${TOKENS.hairline};border-radius:12px;">${issues.map(esc).join("<br>")}</p>` : "";
  const issueText = issues.length ? `${issues.join("\n")}\n\n` : "";
  const drafted = head + reviewText + issueHtml + label("Reply ready") + quote(i.draft.body);
  const plain = `${plainHead}\n\n${issueText}Reply ready:\n${i.draft.body}`;
  if (withPost) {
    return {
      html: drafted + `<div style="margin:0;">${emailLink("Approve reply", i.links.post)}${emailLink("Edit", i.links.edit)}${emailLink("Skip", i.links.skip)}</div>`,
      text: `${plain}\n\nApprove reply: ${i.links.post}\nEdit: ${i.links.edit}\nSkip: ${i.links.skip}`,
    };
  }
  return {
    html: drafted, text: plain, button: { label: "Approve reply", url: i.links.post },
    links: [{ label: "Edit", url: i.links.edit }, { label: "Skip", url: i.links.skip }, { label: "Open Kabsi", url: inbox }],
  };
}

/** The whole email for one review and one person. In digest mode only the digest line is used, so it carries no button. */
export function reviewEmail(i: ReviewInput, mode: "send" | "hold" | "digest"): EmailContent {
  const high = i.risk === "high";
  const b = reviewBlock(i, mode === "digest");
  const ready = !!i.links && i.state !== "blocked" && !!i.draft?.safe;
  const subject = high ? highRiskSubject(i.business) : reviewSubject(i.business, i.stars, { replyReady: ready });
  return {
    subject, title: high ? HIGH_RISK_TITLE.replace(/\.$/, "") : ready ? "A reply is ready." : "New review", preheader: i.comment ? i.comment.slice(0, 90) : PROMISE,
    ...(mode !== "digest" ? { note: PROMISE } : {}),
    bodyHtml: b.html, text: b.text, button: b.button ?? { label: "Open Kabsi", url: `${i.appUrl}/app/reviews?f=needs` }, ...(b.links ? { links: b.links } : {}),
    ...(mode === "digest" ? { digest: { html: b.html, text: b.text } } : {}),
  };
}

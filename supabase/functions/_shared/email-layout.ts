// The pieces every Kabsi email is made of (Email 1, master plan 30.18 section 3): the yellow button (a table for every
// client, VML for Outlook on Windows), the text link, cards with a label, chips, small status icons, the week-on-week
// number cards, escaping and the shared constants. The page itself (light and dark, the logo, the footer) is
// email/template.ts. Pure functions, no environment access.
//
// Dark mode: every coloured element carries a kb-* class that email/template.ts re-colours under
// prefers-color-scheme: dark (Apple Mail, iOS Mail, Outlook for Mac) and under Outlook.com's [data-ogsc] and [data-ogsb]
// hooks; Gmail, which reads neither, inverts the light colours itself and leaves the button's background-image alone.
import { FONT, HEAD_FONT, TOKENS } from "./email/tokens.ts";
export { SOCIAL_LINKS } from "./social-links.ts";

// The logo is a hosted PNG on kabsi.co (no cid attachment), with alt text, so it reads with images off too.
export const LOGO_URL = "https://kabsi.co/email/kabsi-mark.png";
// Kabsi's WhatsApp number (K-122) comes from the one setting, whatsapp-setting.ts. While it is empty WHATSAPP_URL is
// null and every email leaves the WhatsApp line out (hello@kabsi.co stays).
import { WHATSAPP_DIGITS, WHATSAPP_NUMBER, WHATSAPP_ON } from "./whatsapp-setting.ts";
export { WHATSAPP_NUMBER, WHATSAPP_ON };
export const WHATSAPP_URL: string | null = WHATSAPP_ON
  ? `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent("Hello Kabsi, I have a question about an email I got from Kabsi.")}`
  : null;
// The Kabsi Clients Google group owners add as Manager. Keep equal to KABSI_GROUP_ID in src/lib/site.ts (tests/notifications.test.ts checks it).
export const KABSI_GROUP_ID = "5481006796";
// Who operates Kabsi (R-55). Keep equal to OPERATOR_NAME in src/lib/site.ts (tests/notifications.test.ts checks it).
export const OPERATOR_NAME = "Rashid Abou Hamzy";
export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Email rules (K-102, 30.18 section 3): one column, 16 px body text, exactly one yellow main action per email, buttons
// at least 44 px tall, nothing side by side that would squeeze on a phone. Secondary actions are text links that wrap.
// The VML copy is what Outlook on Windows draws; every other client reads the table. background-image keeps the yellow
// in Gmail's dark mode, which inverts background colours but not images.
export function emailButton(label: string, url: string) {
  const href = esc(url), text = esc(label);
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="50%" stroke="f" fillcolor="${TOKENS.yellow}"><w:anchorlock/><center style="color:${TOKENS.black};font-family:Segoe UI,Arial,sans-serif;font-size:17px;font-weight:bold;">${text}</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0 0;max-width:320px;"><tr><td align="center" class="kb-btn" style="background:${TOKENS.yellow};background-image:linear-gradient(${TOKENS.yellow},${TOKENS.yellow});border-radius:999px;"><a href="${href}" style="display:block;padding:14px 26px;font-family:${FONT};font-size:17px;line-height:24px;font-weight:700;color:${TOKENS.black};text-decoration:none;text-align:center;border-radius:999px;">${text}</a></td></tr></table><!--<![endif]-->`;
}
// A text link with a tap area of at least 44 px (12 px above and below a 20 px line).
export function emailLink(label: string, url: string) {
  return `<a href="${esc(url)}" class="kb-t1" style="display:inline-block;padding:12px 18px 12px 0;font-size:16px;line-height:20px;font-weight:700;color:${TOKENS.ink};text-decoration:underline;">${esc(label)}</a>`;
}

/** A paragraph in the card. The colour comes from the card, so it follows dark mode. */
export const para = (html: string, o: { muted?: boolean; top?: number } = {}) =>
  `<p${o.muted ? ' class="kb-t2"' : ""} style="margin:${o.top ?? 0}px 0 16px 0;${o.muted ? `color:${TOKENS.stone};font-size:15px;line-height:1.55;` : ""}">${html}</p>`;

/** A section heading inside the card. */
export const heading2 = (s: string) =>
  `<h2 class="kb-t1" style="margin:24px 0 10px 0;font-family:${HEAD_FONT};font-size:19px;line-height:1.3;font-weight:700;color:${TOKENS.ink};">${esc(s)}</h2>`;

/** A small grey label above a block ("Reply ready", "Waiting for your yes"). */
export const label = (s: string) =>
  `<p class="kb-t2" style="margin:0 0 6px 0;font-size:13px;line-height:1.4;font-weight:700;color:${TOKENS.stone};">${esc(s)}</p>`;

// Status icons are a word's helper, never the word: a small round mark beside text that already says the state.
export type Status = "ok" | "wait" | "bad";
const STATUS = {
  ok: { glyph: "&#10003;", fg: TOKENS.greenInk, bg: TOKENS.greenSoft, cls: "kb-ok" },
  wait: { glyph: "&bull;", fg: TOKENS.amber, bg: TOKENS.amberSoft, cls: "kb-warn" },
  bad: { glyph: "&times;", fg: TOKENS.redInk, bg: TOKENS.redSoft, cls: "kb-bad" },
} as const;
export const statusIcon = (s: Status, size = 20) =>
  `<span class="${STATUS[s].cls} ${STATUS[s].cls}-bg" aria-hidden="true" style="display:inline-block;width:${size}px;height:${size}px;line-height:${size}px;border-radius:999px;text-align:center;font-size:${size - 7}px;font-weight:700;vertical-align:middle;color:${STATUS[s].fg};background:${STATUS[s].bg};">${STATUS[s].glyph}</span>`;

/**
 * A card: a soft panel with a label (and at most one small emoji as a section marker, 30.18 section 3), then its content.
 * The emoji is decoration: it is hidden from screen readers and never stands in for a word.
 */
export function card(o: { label?: string; marker?: string; html: string; tone?: Status }) {
  const edge = o.tone === "bad" ? TOKENS.redInk : o.tone === "wait" ? TOKENS.amber : null;
  const marker = o.marker ? `<span aria-hidden="true" style="font-size:15px;line-height:1;margin-right:6px;">${o.marker}</span>` : "";
  const head = o.label ? `<p class="kb-t2" style="margin:0 0 6px 0;font-size:13px;line-height:1.4;font-weight:700;color:${TOKENS.stone};">${marker}${esc(o.label)}</p>` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr><td class="kb-soft" style="background:${TOKENS.sand};border-radius:12px;padding:14px 16px;${edge ? `border-left:3px solid ${edge};` : ""}">${head}<div style="font-size:16px;line-height:1.55;">${o.html}</div></td></tr></table>`;
}

/** Chips: short labels with a count, wrapping on a phone ("Replies published 4"). */
export function chips(list: { label: string; count?: number; status?: Status }[]) {
  return `<div style="margin:0 0 8px 0;font-size:0;line-height:0;">${list.map((c) =>
    `<span class="kb-chip" style="display:inline-block;margin:0 6px 6px 0;padding:5px 11px 5px ${c.status ? 6 : 11}px;border:1px solid ${TOKENS.hairline};border-radius:999px;background:${TOKENS.white};font-family:${FONT};font-size:14px;line-height:20px;font-weight:700;color:${TOKENS.ink};">${c.status ? `${statusIcon(c.status, 18)} ` : ""}${esc(c.label)}${c.count != null ? ` <span class="kb-t2" style="font-weight:400;color:${TOKENS.stone};">${c.count}</span>` : ""}</span>`
  ).join("")}</div>`;
}

/** A list with a status icon on each line (the trial's work, the steps). */
export const ticks = (lines: string[], s: Status = "ok") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">${lines.map((l) =>
    `<tr><td width="28" valign="top" style="padding:3px 0 6px 0;">${statusIcon(s)}</td><td valign="top" style="padding:2px 0 6px 0;font-size:16px;line-height:1.5;">${esc(l)}</td></tr>`
  ).join("")}</table>`;

/**
 * Number cards, two to a row (stacked under 480 px): Google's figures week on week, each with its label and its change.
 * Built only from real numbers; a caller with none leaves the row out (30.18 section 3).
 */
export function statCards(list: { label: string; value: string; change: string; tone?: Status }[]) {
  const cell = (s: (typeof list)[number]) =>
    `<td class="kb-stat" width="50%" valign="top" style="padding:0 4px 8px 4px;"><div class="kb-soft" style="background:${TOKENS.sand};border-radius:12px;padding:12px 14px;"><div class="kb-t2" style="font-size:13px;line-height:1.4;font-weight:700;color:${TOKENS.stone};">${esc(s.label)}</div><div class="kb-t1" style="font-family:${HEAD_FONT};font-size:26px;line-height:1.2;font-weight:700;color:${TOKENS.ink};">${esc(s.value)}</div><div class="kb-t2" style="font-size:14px;line-height:1.4;color:${TOKENS.stone};">${esc(s.change)}</div></div></td>`;
  const rows: string[] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(`<tr>${cell(list[i]!)}${list[i + 1] ? cell(list[i + 1]!) : '<td class="kb-stat" width="50%"></td>'}</tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -4px 8px -4px;width:calc(100% + 8px);">${rows.join("")}</table>`;
}

/** Quoted text (a review, a draft) in a soft box that keeps its line breaks. */
export const quoteBox = (s: string) =>
  `<div class="kb-soft" style="margin:0 0 16px 0;padding:14px 16px;background:${TOKENS.sand};border-radius:12px;white-space:pre-wrap;font-size:16px;line-height:1.55;">${esc(s)}</div>`;

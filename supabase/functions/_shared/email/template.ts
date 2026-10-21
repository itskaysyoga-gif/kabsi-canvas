// The one email template (K-102, P0.4-08). Every Kabsi email is structured content in, HTML and plain text out:
// sand background, one white card with the mark, the heading, the content, at most one yellow button with black text
// (everything else is a plain link), then the footer: the approval promise, why you got this, the Email settings link
// (and a one-click unsubscribe where the owner can switch the email off), the questions line, the legal seller and
// the Google notice. 600 px at most, 16 px body text, taps at least 44 px tall. The notification engine
// (notify-engine.ts) is the only caller. Pure functions, no environment access, so Deno tests can import it.
import { emailButton, emailLink, esc, LEGAL_SELLER, LOGO, WHATSAPP_NUMBER, WHATSAPP_URL } from "../email-layout.ts";
import { FONT, SIZES, TOKENS } from "./tokens.ts";

export type EmailContent = {
  /** K-102: the business name first, then the action ("Yawmiyati: new 5-star review, reply ready"). */
  subject: string;
  /** The line the inbox shows after the subject. */
  preheader: string;
  title: string;
  bodyHtml: string;
  /** The plain-text body. The footer is added for you. */
  text: string;
  /** The one yellow button. */
  button?: { label: string; url: string };
  /** Plain text links: "Edit first", "Skip", "Open Kabsi". */
  links?: { label: string; url: string }[];
  note?: string;
  /** "Why you got this", one line. Without it the category's line is used. */
  why?: string;
  /** What this item looks like inside a daily digest. Without it the digest shows the in-app title and link. */
  digest?: { html: string; text: string };
};

export type RenderCtx = {
  appUrl: string;
  /** The category's "why you got this" line, used when the content has none. */
  defaultWhy: string;
  /** Set for mail the owner can switch off: the page on kabsi.co that asks and then unsubscribes, shown in the footer. */
  unsubscribePage?: string | null;
};

export const SETTINGS_PATH = "/app/settings#choices";
export const PROMISE = "Nothing is published until you approve it.";
const QUESTIONS = "Questions? Reply to this email or write to hello@kabsi.co.";
export const GOOGLE_NOTICE = "Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google.";
export const operatorLine = () => `Kabsi is operated by ${LEGAL_SELLER}. Contact: hello@kabsi.co`;

export type Rendered = { html: string; text: string };

export function renderEmail(c: EmailContent, ctx: RenderCtx): Rendered {
  const why = c.why ?? ctx.defaultWhy;
  const settings = `${ctx.appUrl}${SETTINGS_PATH}`;
  const button = c.button ? emailButton(c.button.label, c.button.url) : "";
  const links = c.links?.length ? `<div style="margin:${c.button ? "8px" : "16px"} 0 0 0;">${c.links.map((l) => emailLink(l.label, l.url)).join("")}</div>` : "";
  const note = c.note ? `<p style="margin:20px 0 0 0;font-size:14px;line-height:1.6;color:${TOKENS.stone};">${esc(c.note)}</p>` : "";
  const foot = `font-family:${FONT};font-size:13px;line-height:1.6;color:${TOKENS.stone};`;
  const link = (label: string, url: string) => `<a href="${esc(url)}" style="color:${TOKENS.ink};text-decoration:underline;">${esc(label)}</a>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(c.title)}</title></head>
<body style="margin:0;padding:0;background:${TOKENS.sand};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${TOKENS.sand};">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${TOKENS.sand};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${SIZES.width}px;">
<tr><td style="padding:0 4px 20px 4px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO}" width="32" height="32" alt="Kabsi" style="display:block;border:0;width:32px;height:32px;"></td>
<td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:22px;font-weight:700;color:${TOKENS.black};">kabsi</td></tr></table></td></tr>
<tr><td style="background:${TOKENS.white};border-radius:14px;padding:32px 24px;font-family:${FONT};color:${TOKENS.ink};font-size:${SIZES.body}px;line-height:1.6;">
<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:700;">${esc(c.title)}</h1>${c.bodyHtml}${button}${links}${note}</td></tr>
<tr><td style="padding:20px 4px 0 4px;${foot}">${esc(PROMISE)}<br>
<strong style="color:${TOKENS.ink};">Why you got this:</strong> ${esc(why)}<br>
${link("Email settings", settings)}${ctx.unsubscribePage ? ` &nbsp;|&nbsp; ${link("Unsubscribe from these emails", ctx.unsubscribePage)}` : ""}<br>
${esc(QUESTIONS)} You can also message us on <a href="${esc(WHATSAPP_URL)}" style="color:${TOKENS.ink};">WhatsApp ${WHATSAPP_NUMBER}</a>.<br>
${esc(GOOGLE_NOTICE)}<br>
${esc(operatorLine())}</td></tr>
</table></td></tr></table></body></html>`;
  // The button and the links are in the plain text too, unless the text already carries the address.
  const body = c.text.trim();
  const extra = [...(c.button ? [c.button] : []), ...(c.links ?? [])].filter((l) => !body.includes(l.url)).map((l) => `${l.label}: ${l.url}`);
  const text = [
    body,
    ...(extra.length ? [extra.join("\n")] : []),
    ...(c.note ? [c.note] : []),
    ["--", PROMISE, `Why you got this: ${why}`, `Email settings: ${settings}`, ...(ctx.unsubscribePage ? [`Unsubscribe from these emails: ${ctx.unsubscribePage}`] : [])].join("\n"),
    [`${QUESTIONS} WhatsApp ${WHATSAPP_NUMBER}.`, GOOGLE_NOTICE, operatorLine()].join("\n"),
  ].join("\n\n");
  return { html, text };
}

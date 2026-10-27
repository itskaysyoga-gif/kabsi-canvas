// The one email layout (K-102, P0.4-08; redrawn by Email 1, master plan 30.18 section 3, from the design studio's /emails).
// Every Kabsi email is structured content in, HTML and plain text out: the page ground, the hosted Kabsi mark, one card
// with the heading and the content, at most one yellow button with black text (everything else is a plain link), then
// the footer of COPY.md 25: why you got this, the brand line, the non-affiliation line, Facebook and Instagram (the one
// SOCIAL_LINKS constant), "Unsubscribe from these emails" only where a person can switch the email off, and the operator
// line. Light and dark: prefers-color-scheme for Apple Mail, iOS Mail and Outlook for Mac, [data-ogsc] and [data-ogsb] for
// Outlook.com, and Gmail's own inversion, which the button's background-image survives. 600 px at most, phone first at
// 390 px, 16 px body text, taps at least 44 px tall, readable with images off (the mark has alt text and the word Kabsi
// beside it). The notification engine (notify-engine.ts) is the only caller that sends. Pure: no environment access.
import { emailButton, emailLink, esc, LOGO_URL, OPERATOR_NAME, SOCIAL_LINKS, WHATSAPP_NUMBER, WHATSAPP_URL } from "../email-layout.ts";
import { DARK_LINE, FONT, HEAD_FONT, HEAD_FONT_URL, SIZES, TOKENS } from "./tokens.ts";

export type EmailContent = {
  /** K-102: the business name first for business mail ("Rose Lane Salon: new 5-star review, reply ready"); COPY.md 25 names the exceptions. */
  subject: string;
  /** The line the inbox shows after the subject. */
  preheader: string;
  title: string;
  bodyHtml: string;
  /** The plain-text body. The footer is added for you. */
  text: string;
  /** The one yellow button. */
  button?: { label: string; url: string };
  /** Plain text links: "Edit", "Skip", "Open Kabsi". */
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
  /** Mail for the Kabsi team (category "internal"): a plain staff footer, no brand line, no unsubscribe. */
  staff?: boolean;
  /** Previews and test sends with invented data carry the Example badge beside the mark. Never set for a real owner. */
  example?: boolean;
};

export const SETTINGS_PATH = "/app/settings#choices";
/** The approval promise, said in the body of every email that asks for a yes. */
export const PROMISE = "Nothing is published until you approve it.";
// Keep equal to BRAND_LINE and NOT_AFFILIATED in src/lib/site.ts (tests/email-template.test.ts checks them).
export const BRAND_LINE = "Your business on Google. Taken care of.";
export const NOT_AFFILIATED = "Kabsi is independent and not affiliated with Google.";
/** The longer notice, kept for the staff and help pages that quote it. */
export const GOOGLE_NOTICE = "Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google.";
export const operatorLine = () => `Kabsi is operated by ${OPERATOR_NAME}. Contact: hello@kabsi.co.`;
export const UNSUBSCRIBE_LABEL = "Unsubscribe from these emails";

export type Rendered = { html: string; text: string };

export const STAFF_FOOTER = "This notice is for the Kabsi team only.";

const D = {
  page: TOKENS.night, card: TOKENS.carbon, soft: TOKENS.graphite, t1: TOKENS.paper, t2: TOKENS.mute,
  ok: TOKENS.greenOnDark, bad: TOKENS.redOnDark, warn: TOKENS.amberOnDark,
};
// The dark colours, once for prefers-color-scheme and once for each Outlook.com hook.
const darkRules = (p: string) => `${p}.kb-page{background:${D.page} !important}
${p}.kb-panel{background:${D.card} !important;border-color:${DARK_LINE} !important}
${p}.kb-soft{background:${D.soft} !important}
${p}.kb-t1,${p}.kb-t1 a,${p}.kb-word{color:${D.t1} !important}
${p}.kb-t2,${p}.kb-t2 a{color:${D.t2} !important}
${p}.kb-line{border-color:${DARK_LINE} !important}
${p}.kb-chip{background:${D.soft} !important;color:${D.t1} !important;border-color:${DARK_LINE} !important}
${p}.kb-ok{color:${D.ok} !important}${p}.kb-ok-bg{background:rgba(95,211,155,0.16) !important}
${p}.kb-bad{color:${D.bad} !important}${p}.kb-bad-bg{background:rgba(255,138,128,0.16) !important}
${p}.kb-warn{color:${D.warn} !important}${p}.kb-warn-bg{background:rgba(245,185,74,0.16) !important}
${p}.kb-badge{color:${D.t2} !important;border-color:${D.t2} !important}
${p}.kb-btn a{color:${TOKENS.black} !important}`;

const STYLE = `<style>
@font-face{font-family:'Bricolage Grotesque';font-style:normal;font-weight:200 800;font-display:swap;src:url(${HEAD_FONT_URL}) format('woff2')}
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important}
@media (max-width:480px){.kb-pad{padding:24px 18px !important}}
@media (max-width:340px){.kb-stat{display:block !important;width:100% !important;box-sizing:border-box}}
@media (prefers-color-scheme:dark){
${darkRules("")}
}
${darkRules("[data-ogsc] ")}
${darkRules("[data-ogsb] ")}
</style>`;

export function renderEmail(c: EmailContent, ctx: RenderCtx): Rendered {
  const why = c.why ?? ctx.defaultWhy;
  const button = c.button ? emailButton(c.button.label, c.button.url) : "";
  const links = c.links?.length ? `<div style="margin:${c.button ? "8px" : "16px"} 0 0 0;">${c.links.map((l) => emailLink(l.label, l.url)).join("")}</div>` : "";
  const note = c.note ? `<p class="kb-t2" style="margin:20px 0 0 0;font-size:14px;line-height:1.6;color:${TOKENS.stone};">${esc(c.note)}</p>` : "";
  const small = `font-family:${FONT};font-size:13px;line-height:1.6;color:${TOKENS.stone};`;
  const flink = (label: string, url: string) => `<a href="${esc(url)}" class="kb-t2" style="display:inline-block;padding:8px 16px 8px 0;color:${TOKENS.stone};text-decoration:underline;">${esc(label)}</a>`;
  const badge = ctx.example ? `<td align="right" style="vertical-align:middle;"><span class="kb-badge" style="display:inline-block;padding:3px 10px;border:1px solid ${TOKENS.stone};border-radius:999px;font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;color:${TOKENS.stone};">Example</span></td>` : "";
  // Spacers after the preheader keep the start of the body out of the inbox preview line.
  const filler = "&#847;&zwnj;&nbsp;".repeat(40);
  const footer = ctx.staff
    ? `<p class="kb-t2" style="margin:0 0 6px 0;${small}">${esc(STAFF_FOOTER)}</p>
<p class="kb-t2" style="margin:0 0 6px 0;${small}">Why you got this: ${esc(why)}</p>
<p class="kb-t2" style="margin:0;${small}">${esc(operatorLine())}</p>`
    : `<p class="kb-t2" style="margin:0 0 10px 0;${small}">Why you got this: ${esc(why)}</p>
<p class="kb-t1" style="margin:0 0 4px 0;font-family:${HEAD_FONT};font-size:15px;line-height:1.4;font-weight:700;color:${TOKENS.ink};">${esc(BRAND_LINE)}</p>
<p class="kb-t2" style="margin:0;${small}">${esc(NOT_AFFILIATED)}</p>
<p class="kb-t2" style="margin:0;${small}">${SOCIAL_LINKS.map((s) => flink(s.name, s.href)).join("")}${ctx.unsubscribePage ? flink(UNSUBSCRIBE_LABEL, ctx.unsubscribePage) : ""}</p>
${WHATSAPP_URL ? `<p class="kb-t2" style="margin:0 0 6px 0;${small}">Questions? Message us on <a href="${esc(WHATSAPP_URL)}" class="kb-t2" style="color:${TOKENS.stone};">WhatsApp ${esc(WHATSAPP_NUMBER)}</a>.</p>\n` : ""}<p class="kb-t2" style="margin:0;${small}">${esc(operatorLine())}</p>`;
  const html = `<!doctype html><html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(c.title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>td,p,a,h1,h2,span,div{font-family:Segoe UI,Arial,sans-serif !important}</style><![endif]-->
${STYLE}</head>
<body class="body kb-page" style="margin:0;padding:0;background:${TOKENS.sand};"><div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${TOKENS.sand};">${esc(c.preheader)}${filler}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="kb-page" style="background:${TOKENS.sand};"><tr><td align="center" style="padding:24px 12px 32px 12px;">
<!--[if mso]><table role="presentation" width="${SIZES.width}" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${SIZES.width}px;margin:0 auto;">
<tr><td style="padding:0 4px 16px 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;width:42px;"><a href="https://kabsi.co" style="text-decoration:none;"><img src="${LOGO_URL}" width="32" height="32" alt="Kabsi" style="display:block;border:0;width:32px;height:32px;font-family:${FONT};font-size:12px;color:${TOKENS.ink};"></a></td>
<td style="vertical-align:middle;font-family:${HEAD_FONT};font-size:22px;line-height:28px;font-weight:700;color:${TOKENS.ink};" class="kb-word">Kabsi</td>${badge}</tr></table></td></tr>
<tr><td class="kb-panel kb-pad kb-t1" style="background:${TOKENS.white};border:1px solid ${TOKENS.hairline};border-radius:16px;padding:32px 28px;font-family:${FONT};color:${TOKENS.ink};font-size:${SIZES.body}px;line-height:1.6;">
<h1 class="kb-t1" style="margin:0 0 14px 0;font-family:${HEAD_FONT};font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;color:${TOKENS.ink};">${esc(c.title)}</h1>${c.bodyHtml}${button}${links}${note}</td></tr>
<tr><td style="padding:22px 4px 0 4px;">${footer}</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  // The button and the links are in the plain text too, unless the text already carries the address.
  const body = c.text.trim();
  const extra = [...(c.button ? [c.button] : []), ...(c.links ?? [])].filter((l) => !body.includes(l.url)).map((l) => `${l.label}: ${l.url}`);
  const text = [
    body,
    ...(extra.length ? [extra.join("\n")] : []),
    ...(c.note ? [c.note] : []),
    ctx.staff
      ? ["--", STAFF_FOOTER, `Why you got this: ${why}`, operatorLine()].join("\n")
      : ["--", `Why you got this: ${why}`, BRAND_LINE, NOT_AFFILIATED, ...SOCIAL_LINKS.map((s) => `${s.name}: ${s.href}`),
        ...(ctx.unsubscribePage ? [`${UNSUBSCRIBE_LABEL}: ${ctx.unsubscribePage}`] : []),
        ...(WHATSAPP_URL ? [`Questions? WhatsApp ${WHATSAPP_NUMBER}.`] : []), operatorLine()].join("\n"),
  ].join("\n\n");
  return { html, text };
}

/** What a reader sees of an email's HTML: without the style block, Outlook's conditional comments and the tags (for tests). */
export const visibleText = (html: string) =>
  html.replace(/<style>[\s\S]*?<\/style>/g, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<!doctype html>/i, " ").replace(/<[^>]+>/g, " ");

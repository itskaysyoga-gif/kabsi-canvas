// Shared look for every Kabsi email. Same look as emails/build.py. Pure functions, no environment access.
const LOGO = "https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/brand/mark.png";
const FONT = "'Readex Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
// Email rules (K-102): one column, 16 px body text, exactly one yellow primary button per email, buttons at least
// 44 px tall, nothing side by side that would squeeze on a phone. Secondary actions are text links that wrap.
export function emailButton(label: string, url: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;max-width:320px;"><tr><td align="center" style="background:#FFD60A;border-radius:14px;"><a href="${esc(url)}" style="display:block;padding:14px 26px;font-family:${FONT};font-size:17px;line-height:24px;font-weight:700;color:#000000;text-decoration:none;text-align:center;">${esc(label)}</a></td></tr></table>`;
}
// A text link with a tap area of at least 44 px (12 px above and below a 20 px line).
export function emailLink(label: string, url: string) {
  return `<a href="${esc(url)}" style="display:inline-block;padding:12px 18px 12px 0;font-size:16px;line-height:20px;font-weight:700;color:#111111;text-decoration:underline;">${esc(label)}</a>`;
}
export function emailLayout(o: { preheader: string; title: string; bodyHtml: string; button?: { label: string; url: string }; links?: { label: string; url: string }[]; note?: string }) {
  const button = o.button ? emailButton(o.button.label, o.button.url) : "";
  const links = o.links?.length ? `<div style="margin:${o.button ? "8px" : "16px"} 0 0 0;">${o.links.map((l) => emailLink(l.label, l.url)).join("")}</div>` : "";
  const note = o.note ? `<p style="margin:20px 0 0 0;font-size:14px;line-height:1.6;color:#5E5B55;">${o.note}</p>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#F6F4EF;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F4EF;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px 4px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO}" width="32" height="32" alt="Kabsi" style="display:block;border:0;width:32px;height:32px;"></td>
<td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:22px;font-weight:700;color:#000000;">kabsi</td></tr></table></td></tr>
<tr><td style="background:#FFFFFF;border-radius:14px;padding:32px 24px;font-family:${FONT};color:#111111;font-size:16px;line-height:1.6;">
<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:700;">${esc(o.title)}</h1>${o.bodyHtml}${button}${links}${note}</td></tr>
<tr><td style="padding:20px 4px 0 4px;font-family:${FONT};font-size:13px;line-height:1.6;color:#5E5B55;">Nothing is published until you approve it.<br>Questions? Reply to this email or write to <a href="mailto:hello@kabsi.co" style="color:#111111;">hello@kabsi.co</a>.<br>Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google.<br>Kabsi is operated by Hussein Slim, Dubai, United Arab Emirates. Contact: hello@kabsi.co</td></tr>
</table></td></tr></table></body></html>`;
}


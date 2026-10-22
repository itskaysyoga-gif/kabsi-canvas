// The pieces every Kabsi email is made of: the yellow button, the text link, escaping and the shared constants. The page
// itself (sand background, white card, footer) is email/template.ts. Pure functions, no environment access.
import { FONT, TOKENS } from "./email/tokens.ts";
export const LOGO = "https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/brand/mark.png?v=2";
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
// Email rules (K-102): one column, 16 px body text, exactly one yellow primary button per email, buttons at least
// 44 px tall, nothing side by side that would squeeze on a phone. Secondary actions are text links that wrap.
export function emailButton(label: string, url: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;max-width:320px;"><tr><td align="center" style="background:${TOKENS.yellow};border-radius:14px;"><a href="${esc(url)}" style="display:block;padding:14px 26px;font-family:${FONT};font-size:17px;line-height:24px;font-weight:700;color:${TOKENS.black};text-decoration:none;text-align:center;">${esc(label)}</a></td></tr></table>`;
}
// A text link with a tap area of at least 44 px (12 px above and below a 20 px line).
export function emailLink(label: string, url: string) {
  return `<a href="${esc(url)}" style="display:inline-block;padding:12px 18px 12px 0;font-size:16px;line-height:20px;font-weight:700;color:${TOKENS.ink};text-decoration:underline;">${esc(label)}</a>`;
}

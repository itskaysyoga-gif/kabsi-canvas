// The pieces every Kabsi email is made of: the yellow button, the text link, escaping and the shared constants. The page
// itself (sand background, white card, footer) is email/template.ts. Pure functions, no environment access.
import { FONT, TOKENS } from "./email/tokens.ts";
// The mark sits inside every email as an inline image (session 10, docs/LATER.md): a 64 px PNG of about 1.2 KB sent as a
// Resend attachment with this content id, so Zoho and Outlook show it without "Display now". The alt text is empty
// because the word Kabsi sits beside it. LOGO_URL is the hosted copy for previews and the auth emails.
export const LOGO_CID = "kabsi-mark";
export const LOGO = `cid:${LOGO_CID}`;
export const LOGO_URL = "https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/brand/mark.png?v=2";
export const LOGO_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAwFBMVEUAAAD+1QoAAAD+/v7+4wr7+/v///8XFQn+/v5TSQOZhwbpyAn+/v7////o6OiIiIiUlJQ3Nzf///8pJAFlZWX9/f1WVlbJycmLegVkVwR3d3fU1NTRtwgrKytHR0fm5uYiHgGmkgempqbW1tahjQc7NAJEPAJ0ZgSwsLBdUgS8vLzdxAk/Pz9/f3+qqqrKysp+cQWRkZEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmE/jBAAAAQHRSTlP+/wAD//fQ/mv///9Mrf3+/v2O//4x/v////7///z9D////w3///////8G/wQFBAz/BwAAAAAAAAAAAAAAAAAAxAUlNwAAA0ZJREFUeNq1V4mSoyAQRRHwxFtj7nMy9+z+/88tolFQUGtS21VJlUo/6EfTvAbm2CBkf5fcTgLMLUjs/MDfw/FgMHavf3aAafkarTNm6+i1pDiw8/bjNEA9iR+gTVQQIBgpog0K/M8xBBi7Y3qOgcLiiGK/DVADwGenIQEaI+sGQgcAzZ8ERVp3DhGh5CIhANE/x5sYzFhc4lxEAIK/jyKwwEJkC0SAnj4bZWCRFSJCB8D892ChxSgxBwC1/zh8cnOY3YgCwX4ggC7+4fyOu/UMi5nhbV2H6BBAy/8g/nTlMc/OLMtz0wEP7V4ATuAFS/yTlSF4txiGK60ixAdOJAcwk420+I+RO4f4cMRRm4ZI0AQgEvhH6c4hVsKwHfJrhBrgSwrA1fozBFcK4p0FAfgOkGX+AwRa7wQDeMdh//I+6S9HscYXBsAWQPsFODP+DEFgkjIWGEBw7vfvw5g1r58uChiACYUtWMkLqLOwzkYdDTHLJmDafQ6kg9S5OikhqeMO0qrPyY3NAIJIvQDr1A1MT5Z6CWFgggMuumdPnOcupt1dzcIeQZD3eyBugXWXj18lfnvrSKc+sEtVDlmnYQkQP167t6UNktfuaSss8zgqLkJ82+7tOQE9h8IQKWMVOX7sWQR4/Xi4qdNNxdDL42WGAc5UI9IxwFGFrwPwVNeTEGHVV7b/BLA4hAI/T+KvtjEVtlGTSGRxImlS+bo4lXWHqZo4TJV4mITjTKTjLCFU+uOsLyhul/HEnSgoEyXNcx1G99FxPV1JK+uS9kRR3dVFFYoxyCwsK+tPXywmEwdroAti5mo7tJcrXX65nsaXqwm/l1/vJ+l6/4ENALvfd2BJFCOB8a2ROJ5a4nhv4qgyMDuNBA+iRKgzb4nIgp3I4iqpkGWeOyPz9o1C6oXmSKiSt+vWaISmsT1V00JTJ3XTF6eqnJdxgdz1YrkX2wmKnxDbjdwvlsr9ZCz3G4Tw9w1H2/KUuzn3XYl9dctTI1wSFJKZ6YODrulq2j5M13qImbaPE/FpYxppG0/772Tj2Sziq259w73c+u7DkrW+73Ot76N1z+0A0fIcZllRFFl4Lilqm2843723XT70efuPEG//fahr//8BrHo0RIg5GDIAAAAASUVORK5CYII=";
/** The Resend attachment that carries the mark, for any email whose HTML uses it. */
export const logoAttachment = (html: string) =>
  html.includes(LOGO) ? [{ filename: "kabsi.png", content: LOGO_PNG_B64, content_type: "image/png", content_id: LOGO_CID }] : [];
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

// Contact details and prices in replies and posts (K-113.4, K-14, K-116.3). Google filters and can reject replies
// and posts that carry phone numbers, emails, links, social handles or hashtags, and a price is stated only when the
// owner's facts carry it. Checked in code, whatever the model check says. Posts keep their one button link, which
// lives outside the text.

const DATES = /\p{Nd}{1,4}[\/.-]\p{Nd}{1,2}[\/.-]\p{Nd}{2,4}/gu;
const PHONE = /\+?(?:\p{Nd}[\s().\/-]*){7,}/u; // 7 or more digits in one run, spaces and dashes allowed
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/u;
const URL = /\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|net|org|co|io|me|info|biz|app|shop|store|site|online|lb|ae|uk|us|ca|au|nz|sg|ie)\b/i;
const HANDLE = /(?:^|[^\p{L}\p{N}_.@])@[\p{L}\p{N}_.]{2,}/u;
const HASHTAG = /(?:^|[^\p{L}\p{N}_&])#(?=[\p{L}\p{N}_]*\p{L})[\p{L}\p{N}_]+/u;
const PRICE = /(?:[$€£]\s?(\p{Nd}[\p{Nd},.]*))|(?:(\p{Nd}[\p{Nd},.]*)\s?(?:\$|€|£|usd|eur|gbp|aed|lbp|sar|dollars?|euros?|pounds?|dirhams?|lira|ل\.ل|درهم|دولار)(?![\p{L}]))/giu;

const num = (s: string) => s.replace(/[,.]+$/, "").replace(/,/g, "");

/** Problems found in a reply or post text. `allowedText` is the owner's facts (and note), where prices may appear. */
export function contactIssues(text: string, o: { allowedText: string }): string[] {
  const issues: string[] = [];
  if (PHONE.test(text.replace(DATES, ""))) issues.push("contains a phone number (use the details on the profile instead)");
  if (EMAIL.test(text)) issues.push("contains an email address");
  if (URL.test(text.replace(EMAIL, ""))) issues.push("contains a link or web address");
  if (HANDLE.test(text.replace(EMAIL, ""))) issues.push("contains a social media handle");
  if (HASHTAG.test(text)) issues.push("contains a hashtag");
  const allowed = new Set([...o.allowedText.matchAll(/\p{Nd}[\p{Nd},.]*/gu)].map((m) => num(m[0])));
  for (const m of text.matchAll(PRICE)) {
    if (!allowed.has(num(m[1] ?? m[2] ?? ""))) { issues.push("states a price that is not in the owner's facts"); break; }
  }
  return issues;
}

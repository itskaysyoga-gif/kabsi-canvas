// Likely typos in the email's domain, shown as a hint only, never applied by themselves (App 4, 30.31 item 3).
const DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "icloud.co": "icloud.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.con": "icloud.com",
};

export function emailTypoSuggestion(value: string): string | null {
  const at = value.lastIndexOf("@");
  if (at < 1) return null;
  const fixed = DOMAIN_TYPOS[value.slice(at + 1).toLowerCase()];
  return fixed ? `${value.slice(0, at)}@${fixed}` : null;
}

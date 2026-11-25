// The mail-tester.com check (OUTBOUND-3, master plan 30.39 item 8): in test mode only, Email 1 of a fictional US business,
// built exactly as a real one (the templates, the postal address footer, the same headers), goes to a mail-tester.com
// address; the score is then read and recorded. 10 of 10 is required before lane R opens sending (the settings trigger
// refuses it otherwise). Never a warm-up service.
import { emailOne, kindWords, pickDetail } from "./rules.ts";
import { fixtureRows } from "./fixture.ts";

/** A mail-tester.com test address, as its home page gives it. */
export const MAIL_TESTER_ADDRESS = /^[a-z0-9][a-z0-9-]{2,60}@srv\d{1,3}\.mail-tester\.com$/;
export const mailTesterAddressOk = (a: unknown): a is string => typeof a === "string" && MAIL_TESTER_ADDRESS.test(a.trim().toLowerCase());

/** Email 1 of the fictional US business of test mode, with the postal address footer. */
export function mailTesterEmail(postal: string, now: Date): { subject: string; body: string } {
  const row = fixtureRows("00000000").find((r) => r.country === "US")!;
  const detail = pickDetail(row.html, now, "service", "US");
  if (!detail) throw new Error("mail-tester: the fixture has no detail");
  return emailOne({ business: row.business_name, kind: kindWords(row.industry, "US"), city: row.city, detail: detail.sentence, country: "US", postal });
}

/** The JSON report's URL for a test address (its local part is the test's id). The query string form is the one that answers
 * JSON: "/<id>&format=json" is redirected to a page that answers HTML (FIX-4, 25 Nov 2026). */
export function reportUrl(address: string): string {
  return `https://www.mail-tester.com/${encodeURIComponent(address.split("@")[0])}?format=json`;
}

const OUT_OF_TEN = /(\d+(?:\.\d+)?)\s*\/\s*10\b/;

/** The score out of 10 from mail-tester's JSON report, or null when it is not there yet. The report's own `mark` field is 0
 * in a real 10/10 report (read 25 Nov 2026), so the displayed text "10/10" is read first and `mark` only when there is none. */
export function scoreOf(report: unknown): number | null {
  if (!report || typeof report !== "object") return null;
  const r = report as Record<string, unknown>;
  for (const key of ["displayedMark", "commentedMark"]) {
    const m = typeof r[key] === "string" ? OUT_OF_TEN.exec(r[key] as string) : null;
    if (m) {
      const n = Number(m[1]);
      if (n >= 0 && n <= 10) return Math.round(n * 10) / 10;
    }
  }
  const mark = typeof r.mark === "number" ? r.mark : Number.NaN;
  if (Number.isFinite(mark) && mark > 0 && mark <= 10) return Math.round(mark * 10) / 10;
  return null;
}

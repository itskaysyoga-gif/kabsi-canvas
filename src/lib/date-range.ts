// The Results Report's dates on the Reports page, the same words as the email and WhatsApp
// (supabase/functions/_shared/email/report-body.ts dateRange; tests/date-range.test.ts keeps the two equal).
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The report's dates (Eval 1): "19 to 25 October" within a month, "28 October to 3 November" across months. The period
 *  holds YYYY-MM-DD days in the business's time zone; a report stored before Eval 1 holds other words and keeps them. */
export function dateRange(p: { from: string; to: string }): string {
  const a = ISO_DAY.exec(p.from),
    b = ISO_DAY.exec(p.to);
  if (!a || !b) return `${p.from} to ${p.to}`;
  const day = (m: RegExpExecArray) => Number(m[3]),
    month = (m: RegExpExecArray) => MONTHS[Number(m[2]) - 1];
  return a[1] === b[1] && a[2] === b[2]
    ? `${day(a)} to ${day(b)} ${month(b)}`
    : `${day(a)} ${month(a)} to ${day(b)} ${month(b)}`;
}

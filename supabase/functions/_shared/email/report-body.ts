// The body of the Weekly Care Report email (D222, K-28): facts only, one column so nothing squeezes on a phone. No
// review text and no quotes (K-113.3, R-19), no advice and no claims about causes. Pure, so a test can read it.
import { esc } from "../email-layout.ts";
import { TOKENS } from "./tokens.ts";

export type ReportData = {
  period: { from: string; to: string };
  rating: number | null; rating_count: number | null; rating_change: number | null; rating_drop: boolean;
  new_reviews: number; new_avg: number | null; replied: number; waiting: number;
  taps: { total: number; nfc: number; qr: number };
};

// One column on every screen: the label sits above its value instead of beside it, so nothing squeezes on a phone.
function row(label: string, value: string) {
  return `<div style="padding:12px 0;border-bottom:1px solid ${TOKENS.hairline};"><div style="color:${TOKENS.stone};font-size:16px;line-height:1.4;">${esc(label)}</div><div style="font-weight:700;font-size:16px;line-height:1.5;">${value}</div></div>`;
}

export function renderReport(loc: { name: string }, r: ReportData) {
  const ratingText = r.rating == null ? "Not available"
    : `${r.rating.toFixed(1)}${r.rating_change == null ? "" : r.rating_change === 0 ? " (no change)" : ` (${r.rating_change > 0 ? "+" : ""}${r.rating_change.toFixed(1)})`}`;
  const rows = [
    row("Google rating", esc(ratingText) + (r.rating_count != null ? `<br><span style="font-weight:400;color:${TOKENS.stone};font-size:14px;">${r.rating_count} reviews in total</span>` : "")),
    row("New reviews", String(r.new_reviews) + (r.new_avg != null ? `<br><span style="font-weight:400;color:${TOKENS.stone};font-size:14px;">average ${r.new_avg.toFixed(1)} of 5</span>` : "")),
    row("Replied", `${r.replied} of ${r.new_reviews}`),
    row("Review link and QR code opens", r.taps.total ? `${r.taps.total}<br><span style="font-weight:400;color:${TOKENS.stone};font-size:14px;">${r.taps.nfc} by NFC tag · ${r.taps.qr} by QR code</span>` : "0"),
  ].join("");
  // Honest about what a tap is (D257): an open of the review page, not a review.
  const tapNote = `<p style="margin:10px 0 0 0;color:${TOKENS.stone};font-size:14px;">Opens count how often your review link or QR code opened your Google review page. They don't show whether a review was written.</p>`;
  const drop = r.rating_drop ? `<p style="margin:0 0 16px 0;padding:12px 14px;border:2px solid ${TOKENS.ink};border-radius:14px;">Your Google rating went down ${Math.abs(r.rating_change!).toFixed(1)} this week.</p>` : "";
  const waiting = r.waiting ? `<p style="margin:18px 0 0 0;">${r.waiting} ${r.waiting === 1 ? "review is" : "reviews are"} waiting for your reply.</p>` : "";
  const html = `<p style="margin:0 0 16px 0;color:${TOKENS.stone};">${esc(loc.name)} · ${esc(r.period.from)} to ${esc(r.period.to)}</p>${drop}
<div style="font-size:16px;">${rows}</div>${tapNote}${waiting}`;
  const text = [
    `${loc.name}, ${r.period.from} to ${r.period.to}`,
    `Google rating: ${ratingText}`,
    `New reviews: ${r.new_reviews}`, `Replied: ${r.replied} of ${r.new_reviews}`, `Review link and QR code opens: ${r.taps.total} (opens of your review page, not reviews)`,
    r.waiting ? `${r.waiting} waiting for your reply.` : "",
  ].filter(Boolean).join("\n");
  return { html, text };
}


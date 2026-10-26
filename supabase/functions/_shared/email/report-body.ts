// The body of the Weekly Care Report email (D222, K-28): facts only, one column so nothing squeezes on a phone. No
// review text and no quotes (K-113.3, R-19), no advice and no claims about causes. Pure, so a test can read it.
import { esc } from "../email-layout.ts";
import { TOKENS } from "./tokens.ts";

export type ReportData = {
  period: { from: string; to: string };
  rating: number | null; rating_count: number | null; rating_change: number | null; rating_drop: boolean;
  new_reviews: number; new_avg: number | null; replied: number; waiting: number;
  taps: { total: number; nfc: number; qr: number; message?: number };
  // P0.5-04: what Kabsi did, counted from the audit log; reports from before it have none of these.
  care?: { headline: string; things: number; profile_line: string; counts: { posts_published: number; hours_updates: number; profile_updates: number; photos_published: number } };
  time_saved?: { minutes: number; words: string; formula: string };
  needs?: { title: string; path: string }[];
  needs_total?: number;
  plan?: { title: string; path: string }[];
  activity?: { example: boolean; views: { this: number; change: string }; calls: { this: number }; website_clicks: { this: number }; directions: { this: number } };
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
    row("Review link and QR code opens", r.taps.total ? `${r.taps.total}<br><span style="font-weight:400;color:${TOKENS.stone};font-size:14px;">${r.taps.nfc} by NFC tag · ${r.taps.qr} by QR code · ${r.taps.message ?? 0} from your message</span>` : "0"),
  ].join("");
  // Honest about what a tap is (D257): an open of the review page, not a review.
  const tapNote = `<p style="margin:10px 0 0 0;color:${TOKENS.stone};font-size:14px;">Opens count how often your review link or QR code opened your Google review page. They don't show whether a review was written.</p>`;
  const drop = r.rating_drop ? `<p style="margin:0 0 16px 0;padding:12px 14px;border:2px solid ${TOKENS.ink};border-radius:14px;">Your Google rating went down ${Math.abs(r.rating_change!).toFixed(1)} this week.</p>` : "";
  const waiting = r.waiting ? `<p style="margin:18px 0 0 0;">${r.waiting} ${r.waiting === 1 ? "review is" : "reviews are"} waiting for your reply.</p>` : "";
  // P0.5-04: the week in Kabsi's own counts first, then the Google facts.
  const c = r.care;
  const updates = c ? c.counts.posts_published + c.counts.hours_updates + c.counts.profile_updates : 0;
  const act = r.activity;
  const careRows = c ? [
    row("Google Profile", esc(c.profile_line)),
    row("Content", `${updates} ${updates === 1 ? "update" : "updates"} and ${c.counts.photos_published} ${c.counts.photos_published === 1 ? "photo" : "photos"} published`),
    act ? row(act.example ? "Customer activity (example figures)" : "Customer activity",
      `${act.calls.this} calls, ${act.website_clicks.this} website clicks, ${act.directions.this} direction requests<br><span style="font-weight:400;color:${TOKENS.stone};font-size:14px;">Your profile was seen ${act.views.this} times${act.views.change ? `, ${esc(act.views.change)} than the week before` : ""}</span>`) : "",
  ].join("") : "";
  const saved = r.time_saved?.words
    ? `<p style="margin:18px 0 0 0;"><strong>${esc(r.time_saved.words)} saved.</strong><br><span style="color:${TOKENS.stone};font-size:14px;">An estimate: ${esc(r.time_saved.formula)}</span></p>` : "";
  const needs = r.needs?.length
    ? `<p style="margin:18px 0 6px 0;font-weight:700;">What needs you</p>${r.needs.map((n) => `<p style="margin:0 0 6px 0;">${esc(n.title)}</p>`).join("")}`
    : c ? `<p style="margin:18px 0 0 0;">Nothing needs you right now.</p>` : "";
  const plan = r.plan?.length
    ? `<p style="margin:18px 0 6px 0;font-weight:700;">Your profile this week</p>${r.plan.map((n) => `<p style="margin:0 0 6px 0;">${esc(n.title)}</p>`).join("")}` : "";
  const html = `<p style="margin:0 0 16px 0;color:${TOKENS.stone};">${esc(loc.name)} · ${esc(r.period.from)} to ${esc(r.period.to)}</p>${c ? `<p style="margin:0 0 16px 0;font-size:20px;font-weight:700;line-height:1.3;">${esc(c.headline)}</p>` : ""}${drop}
<div style="font-size:16px;">${careRows}${rows}</div>${tapNote}${saved}${needs}${plan}${waiting}`;
  const text = [
    `${loc.name}, ${r.period.from} to ${r.period.to}`,
    c ? c.headline : "", c ? `Google Profile: ${c.profile_line}` : "", c ? `Content: ${updates} updates and ${c.counts.photos_published} photos published` : "",
    act ? `Customer activity${act.example ? " (example figures)" : ""}: ${act.calls.this} calls, ${act.website_clicks.this} website clicks, ${act.directions.this} direction requests` : "",
    `Google rating: ${ratingText}`,
    `New reviews: ${r.new_reviews}`, `Replied: ${r.replied} of ${r.new_reviews}`, `Review link and QR code opens: ${r.taps.total} (opens of your review page, not reviews)`,
    r.waiting ? `${r.waiting} waiting for your reply.` : "",
    r.time_saved?.words ? `${r.time_saved.words} saved (an estimate: ${r.time_saved.formula})` : "",
    r.needs?.length ? `What needs you: ${r.needs.map((n) => n.title).join("; ")}` : c ? "Nothing needs you right now." : "",
    r.plan?.length ? `Your profile this week: ${r.plan.map((n) => n.title).join("; ")}` : "",
  ].filter(Boolean).join("\n");
  return { html, text };
}


// The Monday Results Report as the visual work receipt (master plan 30.15 section 3.6, 30.18 section 3; Email 1). In this
// order: what Kabsi did as chips, what waits for a yes (the email's one button goes there), one next step, then Google's
// numbers as small week-on-week cards with calls and direction requests apart, each block with its source label. The data
// is V4's receipt (results-report/receipt.ts): Google's figures are there only when they were read live from the owner's
// own profile, so a real owner's email never shows example figures; a block without real numbers is left out. The demo
// business keeps its labelled examples. No review text and no quotes (K-113.3, R-19). Pure, so a test can read it.
import { card, chips, esc, label, para, statCards } from "../email-layout.ts";
import { didChips, type Receipt } from "../results-report/receipt.ts";
import type { Counts } from "../care-report/compose.ts";
import { TOKENS } from "./tokens.ts";

export type ReportData = {
  period: { from: string; to: string };
  rating: number | null; rating_count: number | null; rating_change: number | null; rating_drop: boolean;
  new_reviews: number; new_avg: number | null; replied: number; waiting: number;
  taps: { total: number; nfc: number; qr: number; message?: number };
  care?: { headline: string; things: number; profile_line: string; counts: Partial<Counts> & { posts_published: number; hours_updates: number; profile_updates: number; photos_published: number } };
  needs?: { title: string; path: string }[];
  needs_total?: number;
  plan?: { title: string; path: string }[];
  receipt?: Receipt;
};

/** "4 more than last week", "2 fewer than last week", "Same as last week". */
export function weekChange(now: number, last: number): string {
  const d = now - last;
  return d === 0 ? "Same as last week" : `${Math.abs(d)} ${d > 0 ? "more" : "fewer"} than last week`;
}

const counts = (c: ReportData["care"]): Counts => ({
  replies_prepared: 0, replies_published: 0, photo_batches: 0, profile_checks: 0, changes_found: 0, changes_kept: 0, changes_put_back: 0,
  ...(c?.counts ?? { posts_published: 0, hours_updates: 0, profile_updates: 0, photos_published: 0 }),
});

export type RenderedReport = { html: string; text: string; dates: string; preheader: string; button: { label: string; path: string } };

export function renderReport(loc: { name: string }, r: ReportData): RenderedReport {
  const dates = `${r.period.from} to ${r.period.to}`;
  const rc = r.receipt;
  const did = rc?.did ?? didChips(counts(r.care));
  const waiting = rc?.waiting ?? { count: r.needs_total ?? r.waiting, items: (r.needs ?? []).slice(0, 3) };
  // One next step that is not the item already waiting for a yes (that one has the button).
  const firstWaiting = waiting.items[0]?.title;
  const candidates = [rc?.next_step ?? null, ...(r.plan ?? []), ...(r.needs ?? [])].filter((x): x is { title: string; path: string } => !!x);
  const next = candidates.find((x) => x.title.replace(/\.$/, "") !== firstWaiting?.replace(/\.$/, "")) ?? null;
  const google = rc?.google ?? null;
  const growth = rc?.growth ?? null;

  const parts: string[] = [];
  const text: string[] = [`${loc.name}, ${dates}`];
  parts.push(para(`<strong>${esc(loc.name)}</strong> · ${esc(dates)}`, { muted: true }));

  // What Kabsi did
  parts.push(label("What Kabsi did"));
  if (did.length) {
    parts.push(chips(did.map((c) => ({ label: c.label, count: c.count, status: "ok" as const }))));
    text.push(`What Kabsi did: ${did.map((c) => `${c.label} ${c.count}`).join(", ")}.`);
  } else {
    parts.push(para("A quiet week. Kabsi kept watching your Google profile."));
    text.push("What Kabsi did: a quiet week. Kabsi kept watching your Google profile.");
  }
  if (r.care?.profile_line) {
    parts.push(para(esc(r.care.profile_line), { muted: true }));
    text.push(r.care.profile_line);
  }

  // What waits for a yes
  const waitLines = waiting.items.map((n) => esc(n.title));
  const more = waiting.count > waiting.items.length ? `<br><span class="kb-t2" style="color:${TOKENS.stone};">And ${waiting.count - waiting.items.length} more in Kabsi.</span>` : "";
  parts.push(card({
    label: "Waiting for your yes", marker: "⏳", tone: waiting.count ? "wait" : undefined,
    html: waiting.count ? waitLines.join("<br>") + more : "Nothing is waiting for your yes.",
  }));
  text.push(waiting.count ? `Waiting for your yes: ${waiting.items.map((n) => n.title).join("; ")}${more ? ` (${waiting.count} in all)` : ""}.` : "Nothing is waiting for your yes.");

  // One next step
  if (next) {
    parts.push(card({ label: "One next step", marker: "👉", html: esc(next.title) }));
    text.push(`One next step: ${next.title}.`.replace(/\.\.$/, "."));
  }

  // Google's numbers, week on week, calls and direction requests apart
  if (google) {
    const ex = google.example ? " (example figures)" : "";
    parts.push(label(`From your Google Business Profile${ex}`));
    const stats = [
      { label: "Calls", value: String(google.calls.this), change: weekChange(google.calls.this, google.calls.last) },
      { label: "Direction requests", value: String(google.directions.this), change: weekChange(google.directions.this, google.directions.last) },
      { label: "Website clicks", value: String(google.website_clicks.this), change: weekChange(google.website_clicks.this, google.website_clicks.last) },
      { label: "New reviews", value: String(r.new_reviews), change: r.new_avg != null ? `Average ${r.new_avg.toFixed(1)} stars` : "None this week" },
    ];
    parts.push(statCards(stats));
    text.push(`From your Google Business Profile${ex}:\n${stats.map((s) => `- ${s.label}: ${s.value} (${s.change})`).join("\n")}`);
  } else if (r.new_reviews) {
    // Kabsi's own record of the reviews still counts when Google's figures are not in, under its own source label.
    parts.push(label("From Kabsi's record of your reviews"));
    parts.push(statCards([{ label: "New reviews", value: String(r.new_reviews), change: r.new_avg != null ? `Average ${r.new_avg.toFixed(1)} stars` : "This week" }]));
    text.push(`From Kabsi's record of your reviews: ${r.new_reviews} new reviews.`);
  }

  // The review link: opens are never reviews
  if (growth && growth.link_opens) {
    parts.push(label("From your Kabsi review link"));
    parts.push(para(`Your review link was opened ${growth.link_opens} ${growth.link_opens === 1 ? "time" : "times"}. An open is not a review.`));
    text.push(`From your Kabsi review link: opened ${growth.link_opens} ${growth.link_opens === 1 ? "time" : "times"}. An open is not a review.`);
  }
  if (rc?.competitor) {
    parts.push(card({ label: "Competitor Watch", html: esc(rc.competitor) }));
    text.push(rc.competitor);
  }
  if (rc?.ai) {
    parts.push(card({ label: rc.ai.heading, html: `${esc(rc.ai.line)}<br><span class="kb-t2" style="font-size:14px;color:${TOKENS.stone};">${esc(rc.ai.label)}</span>` }));
    text.push(`${rc.ai.heading}: ${rc.ai.line} ${rc.ai.label}`);
  }

  const first = waiting.items[0];
  const button = waiting.count && first ? { label: "Review and approve", path: first.path } : { label: "Open your report", path: "/app/report" };
  const preheader = did.length
    ? `Kabsi did ${did.reduce((s, c) => s + c.count, 0)} things this week. ${waiting.count ? `${waiting.count} waiting for your yes.` : "Nothing waits for your yes."}`
    : `A quiet week. ${waiting.count ? `${waiting.count} waiting for your yes.` : "Nothing waits for your yes."}`;
  return { html: parts.join(""), text: text.join("\n\n"), dates, preheader, button };
}

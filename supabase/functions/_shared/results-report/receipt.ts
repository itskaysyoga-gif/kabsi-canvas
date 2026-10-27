// The Monday Results Report as a work receipt (master plan 30.15 section 3.6, 30.18 section 3; V4 item 4). Data and WhatsApp
// text only; Email 1 designs the email. In this order: what Kabsi did, what waits for a yes, one next step. Then Google's numbers,
// with calls and direction requests shown apart; review link opens, never counted as reviews; once a month "An answer customers
// might see" (30.15 3.8); and a Competitor Watch line only when something changed that matters (3.9).
//
// A real owner's report never shows example figures (30.18 section 3): Google's numbers appear only when they were read live
// from the owner's own profile. The demo business keeps its labelled examples. Pure.
import type { Counts, Line, WeekActivity } from "../care-report/compose.ts";
import { updatesCount } from "../care-report/compose.ts";

export type Chip = { key: string; label: string; count: number };
export type GrowthStats = { days: number; new_reviews: number; opens_message: number; opens_qr: number; opens_tag: number };
export type AiAnswer = {
  question: string; provider: "chatgpt" | "perplexity" | string; asked_at: string; named: boolean;
  sources: { domain: string; title: string }[]; noticed: string | null;
};
export type RivalChange = { name: string; theirs: number; mine: number };

export const AI_LABEL = "Answers from ChatGPT and Perplexity through their API, which can differ from their apps.";
export const OPEN_NOTE = "An open is not a review.";
const ASSISTANT: Record<string, string> = { chatgpt: "ChatGPT", perplexity: "Perplexity" };

/** What Kabsi did this week, as chips: only the kinds that happened, most owner-visible first. */
export function didChips(c: Counts): Chip[] {
  return [
    { key: "replies", label: "Replies sent to Google", count: c.replies_published },
    { key: "posts", label: "Posts sent to Google", count: c.posts_published },
    { key: "photos", label: "Photos sent to Google", count: c.photos_published },
    { key: "hours", label: "Hours updated", count: c.hours_updates },
    { key: "details", label: "Profile details updated", count: c.profile_updates },
    { key: "put_back", label: "Changes put back", count: c.changes_put_back },
    { key: "drafts", label: "Replies prepared", count: Math.max(c.replies_prepared - c.replies_published, 0) },
  ].filter((x) => x.count > 0);
}

/**
 * Competitor Watch speaks only when something changed that matters: a watched business gained at least 5 reviews in the period
 * and at least twice as many as the owner. Routine counts are never a line. At most one line, the biggest gap first.
 */
export function rivalLine(changes: RivalChange[]): string | null {
  const c = changes
    .filter((x) => x.theirs >= 5 && x.theirs >= 2 * Math.max(x.mine, 1) && x.theirs > x.mine)
    .sort((a, b) => b.theirs - b.mine - (a.theirs - a.mine))[0];
  if (!c) return null;
  const w = (n: number) => (n === 1 ? "review" : "reviews");
  return `${c.name} got ${c.theirs} ${w(c.theirs)} this month. You got ${c.mine}.`;
}

/** The AI block, monthly only (the first report of each month), never urgent, never a score. */
export function aiBlock(a: AiAnswer | null, tz: string) {
  if (!a) return null;
  const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: tz }).format(new Date(a.asked_at));
  const who = ASSISTANT[a.provider] ?? a.provider;
  return {
    heading: "An answer customers might see",
    question: a.question,
    assistant: who,
    asked_on: when,
    named: a.named,
    line: `${who} was asked "${a.question}" on ${when}. ${a.named ? "It named you." : "It did not name you."}`,
    sources: a.sources.slice(0, 3),
    noticed: a.noticed,
    label: AI_LABEL,
  };
}

/** The first Monday report of a month carries the AI block: the report date is in the first 7 days of the month. */
export const monthlyWeek = (localDate: string) => Number(localDate.slice(8, 10)) <= 7;

export function receipt(o: {
  business: string;
  counts: Counts;
  needs: Line[];
  needsTotal: number;
  plan: Line[];
  activity: WeekActivity | null;
  demo: boolean;
  growth: GrowthStats | null;
  ai: AiAnswer | null;
  aiThisWeek: boolean;
  rivals: RivalChange[];
  tz: string;
}) {
  const did = didChips(o.counts);
  const waiting = { count: o.needsTotal, items: o.needs.slice(0, 3).map((n) => ({ title: n.title, path: n.path })) };
  const next = o.needs[0] ?? o.plan[0] ?? null;
  // Never example figures for a real owner: Google's numbers only when read live (the demo keeps its labelled examples).
  const a = o.activity && (o.activity.source === "live" || o.demo) ? o.activity : null;
  const google = a
    ? {
      example: a.example, from: a.from, to: a.to,
      views: a.views, website_clicks: a.website_clicks,
      // 30.15 3.6: calls and direction requests apart, each its own line.
      calls: a.calls, directions: a.directions,
      lines: [
        `Calls from your Google profile: ${a.calls.this} (${a.calls.change}).`,
        `Direction requests: ${a.directions.this} (${a.directions.change}).`,
      ],
    }
    : null;
  const opens = o.growth ? o.growth.opens_message + o.growth.opens_qr + o.growth.opens_tag : 0;
  const growth = o.growth
    ? {
      new_reviews: o.growth.new_reviews, link_opens: opens,
      by: { message: o.growth.opens_message, qr: o.growth.opens_qr, tag: o.growth.opens_tag },
      line: `${o.growth.new_reviews} new ${o.growth.new_reviews === 1 ? "review" : "reviews"} on Google. Your review link was opened ${opens} ${opens === 1 ? "time" : "times"}. ${OPEN_NOTE}`,
    }
    : null;
  const ai = o.aiThisWeek ? aiBlock(o.ai, o.tz) : null;
  const rival = rivalLine(o.rivals);
  return {
    v: 3 as const,
    did, did_total: did.reduce((s, c) => s + c.count, 0), updates: updatesCount(o.counts),
    waiting, next_step: next ? { title: next.title, path: next.path } : null,
    google, growth, ai, competitor: rival,
    whatsapp: receiptText({ business: o.business, did, waiting: waiting.count, next: next?.title ?? null, google, growth, ai, rival }),
  };
}
export type Receipt = ReturnType<typeof receipt>;

/** The WhatsApp version: short, the work first. */
export function receiptText(o: {
  business: string; did: Chip[]; waiting: number; next: string | null;
  google: { example: boolean; lines: string[] } | null; growth: { line: string } | null;
  ai: { line: string; label: string } | null; rival: string | null;
}): string {
  const parts: string[] = [];
  parts.push(o.did.length
    ? `${o.business}, this week Kabsi did: ${o.did.map((c) => `${c.label.toLowerCase().replace(/\bgoogle\b/g, "Google")} ${c.count}`).join(", ")}.`
    : `${o.business}, a quiet week. Kabsi kept watching your Google profile.`);
  parts.push(o.waiting ? `Waiting for your yes: ${o.waiting}.` : "Nothing is waiting for your yes.");
  if (o.next) parts.push(`Next step: ${o.next}.`.replace(/\.\.$/, "."));
  if (o.google) parts.push(`From your Google profile${o.google.example ? " (example figures)" : ""}: ${o.google.lines.join(" ")}`);
  if (o.growth) parts.push(o.growth.line);
  if (o.rival) parts.push(o.rival);
  if (o.ai) parts.push(`${o.ai.line} ${o.ai.label}`);
  return parts.join("\n\n");
}

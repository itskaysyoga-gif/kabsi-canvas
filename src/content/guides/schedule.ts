// Guides 3, part A (scheduled publishing): which guides are public at a given moment. Every function takes the moment
// as an argument, so the server passes its own clock on each request and the tests pass a fake one. Nothing here reads
// the browser's clock: a guide whose publishAt is in the future is not in the list, the related links, the sitemap,
// llms.txt or Nora's facts, and its address answers 404.
import type { GuideDoc, GuideMeta } from "./types";

/** Guide 1 became public when Guides 3 part A merged (5 Nov 2026). */
export const FIRST_PUBLISH = "2026-11-05T00:00:00Z";

/**
 * Guides 4 part A (master plan 30.32 item 2): guides 2 to 20 are public from this one moment, the minute that part merged.
 * It is one value, here and nowhere else; every one of those content files reads it. It replaces the every-2-days
 * schedule of Guides 3, because holding finished, checked guides back gives Google nothing.
 */
export const PUBLISH_ALL_AT = "2026-11-05T15:05:00Z";
const PUBLISH_ALL_MS = Date.parse(PUBLISH_ALL_AT);

/** New guides from 16 Nov 2026: one a week, each at 06:00 UTC (30.32 item 2). The 28th guide is weeklyAt(0). */
export const WEEKLY_START = Date.parse("2026-11-16T06:00:00Z");
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The publishing moment of the n-th weekly guide (0 is the first, the 28th guide). */
export function weeklyAt(n: number): string {
  return new Date(WEEKLY_START + n * WEEK_MS).toISOString().replace(".000Z", "Z");
}

export const isPublic = (g: Pick<GuideDoc, "publishAt">, now: Date) =>
  Date.parse(g.publishAt) <= now.getTime();

/**
 * Public guides in the order the guides list shows them. A guide scheduled after PUBLISH_ALL_AT (a weekly one) comes
 * first, newest first. The rest keep the order of the array passed in: the Guides 3 order, then the earlier guides
 * (src/content/guides/index.ts), so the order of Guides 3 stays.
 */
export function publicGuides<T extends Pick<GuideDoc, "publishAt">>(all: T[], now: Date): T[] {
  const open = all.filter((g) => isPublic(g, now));
  const newer = open
    .filter((g) => Date.parse(g.publishAt) > PUBLISH_ALL_MS)
    .sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt));
  return [...newer, ...open.filter((g) => Date.parse(g.publishAt) <= PUBLISH_ALL_MS)];
}

/** Seconds until the next guide becomes public, so a cached sitemap or llms.txt never outlives it; at most an hour. */
export function cacheSeconds(all: Pick<GuideDoc, "publishAt">[], now: Date, max = 3600): number {
  const next = all
    .map((g) => Date.parse(g.publishAt) - now.getTime())
    .filter((ms) => ms > 0)
    .sort((a, b) => a - b)[0];
  if (next === undefined) return max;
  return Math.max(0, Math.min(max, Math.floor(next / 1000)));
}

/** The publishing date as YYYY-MM-DD. */
export const publishedDay = (g: Pick<GuideDoc, "publishAt">) => g.publishAt.slice(0, 10);

/** A reading time from the words a reader sees, at 200 words a minute. */
export const minutesFor = (words: number) => Math.max(1, Math.round(words / 200));

export function metaOf(g: GuideDoc, words: number): GuideMeta {
  return {
    slug: g.slug,
    title: g.title,
    description: g.description,
    publishAt: g.publishAt,
    updated: g.updated,
    checked: g.checked,
    topic: g.topic,
    industries: g.industries,
    related: g.related,
    summary: g.summary,
    ...(g.faqs?.length ? { faqs: g.faqs } : {}),
    minutes: minutesFor(words),
  };
}

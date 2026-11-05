// Guides 3, part A (scheduled publishing): which guides are public at a given moment. Every function takes the moment
// as an argument, so the server passes its own clock on each request and the tests pass a fake one. Nothing here reads
// the browser's clock: a guide whose publishAt is in the future is not in the list, the related links, the sitemap,
// llms.txt or Nora's facts, and its address answers 404.
import type { GuideDoc, GuideMeta } from "./types";

/** The first new guide is public when part A merges; then one every 2 days at 06:00 UTC (Guides 3, A.3). */
export const FIRST_PUBLISH = "2026-11-05T00:00:00Z";
export const SCHEDULE_START = Date.parse("2026-11-05T06:00:00Z");
export const EVERY_MS = 2 * 24 * 60 * 60 * 1000;

/** The publishing moment of the guide at position i (0 is the first) of the Guides 3 order. */
export function scheduledAt(i: number): string {
  if (i === 0) return FIRST_PUBLISH;
  return new Date(SCHEDULE_START + i * EVERY_MS).toISOString().replace(".000Z", "Z");
}

export const isPublic = (g: Pick<GuideDoc, "publishAt">, now: Date) =>
  Date.parse(g.publishAt) <= now.getTime();

/** Public guides, newest first (the order the guides list shows). */
export function publicGuides<T extends Pick<GuideDoc, "publishAt">>(all: T[], now: Date): T[] {
  return all
    .filter((g) => isPublic(g, now))
    .sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt));
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

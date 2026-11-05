// Guides 3 (master plan 30.15, 30.20 section 3): the shape of one guide. Each guide is one content file in this folder
// (src/content/guides/<slug>.tsx) that exports `guide`. src/content/guides/index.ts lists them in publishing order and
// src/content/guides/schedule.ts decides, on the server and on each request, which ones are public.
import type { ReactNode } from "react";

/** A page the guide's facts come from, with the day it was read for this guide. */
export type GuideSource = {
  /** The page's own title, for example "Google: Edit your business hours". */
  title: string;
  url: string;
  /** The day the page was read (YYYY-MM-DD). */
  read: string;
};

/** One section: the heading is the question an owner asks, the answer is one plain paragraph under it. */
export type GuideSection = {
  /** The anchor for the contents list (lower case, hyphens). */
  id: string;
  heading: string;
  /** One paragraph that answers the heading on its own. */
  answer: string;
  /** Steps, lists and detail after the answer. */
  body?: ReactNode;
};

export type GuideFaq = { q: string; a: string };

export type GuideDoc = {
  slug: string;
  /** The H1: the question an owner asks, 60 characters or fewer. */
  title: string;
  /** Search result description, under 160 characters. */
  description: string;
  /** When the guide becomes public (ISO, UTC). Before this moment it is not shown anywhere. */
  publishAt: string;
  /** The last change to the text (YYYY-MM-DD). */
  updated: string;
  /** The day the sources were read (YYYY-MM-DD): "Checked against Google's help pages on <date>." */
  checked: string;
  /** A short label on the cover, for example "Google Maps". */
  topic: string;
  /** The answer in two sentences, at the top of the page. */
  answer: string;
  /** The "In short" box: three or four plain lines. */
  inShort: string[];
  sections: GuideSection[];
  /** What Kabsi does for this problem today, from the facts only (or that it does not). Shown once, near the end. */
  kabsi: { heading: string; body: ReactNode };
  /** Real questions owners ask, each with a short answer. Only these become FAQPage data. */
  faqs?: GuideFaq[];
  sources: GuideSource[];
  /** Industry pages (src/content/industries slugs) this guide links to, and that link back to it. */
  industries: string[];
  /** Other guides worth reading next (slugs). A guide that is not public yet is left out. */
  related: string[];
  /** One line for llms.txt. */
  summary: string;
};

/** What every page that is not the guide itself needs: no body, so it can travel from the server as data. */
export type GuideMeta = Pick<
  GuideDoc,
  | "slug"
  | "title"
  | "description"
  | "publishAt"
  | "updated"
  | "checked"
  | "topic"
  | "industries"
  | "related"
  | "summary"
  | "faqs"
> & { minutes: number };

// One content file per industry (brief section 16, item 3). The page component (d5-industry.tsx) only lays these
// out; every line a reader sees about the trade comes from the trade's own file, written from its own facts.
import type { Photo } from "@/components/kabsi/photos";

export type HubId =
  | "beauty-and-wellness"
  | "food-and-drink"
  | "health"
  | "auto"
  | "home-services"
  | "hospitality"
  | "fitness-and-sport"
  | "retail"
  | "professional-services";

export type Hub = {
  id: HubId;
  name: string;
  lead: string;
  /** Wave 2 trades (master plan 30.17 section 2): named, not linked, until their pages exist. */
  coming: string[];
};

export type ChatLine = {
  from: "kabsi" | "owner";
  text: string;
  /** Reply buttons under a Kabsi message. */
  buttons?: string[];
};

export type Industry = {
  slug: string;
  hub: HubId;
  /** Singular, lower case: "Your hair salon on Google." */
  name: string;
  /** "Hair salons", for lists and hubs. */
  plural: string;
  /** Finished pages are indexed and linked; the rest stay noindex and unlinked until Content 1 finishes them. */
  finished: boolean;
  lead: string;
  /** The search the free check is prefilled with. */
  keyword: string;
  /** The invented business on this page (Example) and its nearby check. */
  example: {
    business: string;
    city: string;
    /** "salon" in "Near your salon". */
    kind: string;
    rival: string;
    rival2: string;
    /** B and C on the nearby drawing. Example names; kabsi-canvas takes them from the checked points. */
    near: [string, string];
  };
  /** The first is the hero photo. */
  photos: [Photo, ...Photo[]];
  /** object-position for the hero crop. */
  focus?: string;
  /** What customers type. Content 1 replaces these with DataForSEO keyword data before a page is indexed. */
  searches: string[];
  /** The five recurring Google tasks of the trade. */
  tasks: [Task, Task, Task, Task, Task];

  /* The rest is written for the finished pages; template pages leave them out and the section hides. */
  categories?: { primary: string; more: string[]; note: string };
  reviewThemes?: { theme: string; text: string }[];
  story?: { title: string; lead: string; lines: ChatLine[] };
  posts?: string[];
  photoTips?: { title: string; text: string }[];
  holidays?: { when: string; text: string }[];
  faqs?: { q: string; a: string }[];
  /** Two guide slugs from GUIDES (d2-data.ts). */
  guides?: [string, string];
};

export type Task = { title: string; text: string };

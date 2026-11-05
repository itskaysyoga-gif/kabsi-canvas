// Guides 3: every guide, one content file each in this folder. ORDER is the Guides 3 publishing order: the guide at
// position i becomes public at scheduledAt(i) (schedule.ts). The earlier guides (EARLIER) were public before Guides 3.
// Read on the server only (the server functions in src/lib/guides-server.ts, the sitemap and llms.txt routes): the
// guide page itself loads its one content file on demand (load.ts).
import type { GuideDoc } from "./types";
import { LEGACY_GUIDES } from "@/lib/guides";

export const ORDER = [
  "why-is-my-business-not-on-google-maps",
  "how-to-verify-google-business-profile",
  "google-business-profile-suspended",
  "someone-changed-my-hours-on-google",
  "how-to-set-holiday-hours-on-google",
  "choose-google-business-profile-categories",
  "google-business-description-examples",
  "google-posts-for-local-businesses",
  "photos-for-google-business-profile",
  "how-to-ask-for-google-reviews",
  "report-fake-google-reviews",
  "review-gating-google",
  "should-you-reply-to-every-google-review",
  "add-services-and-prices-to-google",
  "google-profile-checklist-hair-salons-barbers",
  "google-profile-checklist-restaurants-cafes",
  "transfer-google-business-profile-ownership",
  "remove-old-employee-or-agency-from-google-profile",
  "duplicate-google-listings",
  "how-google-chooses-local-results",
] as const;

export const EARLIER = [
  "how-to-reply-to-google-reviews",
  "how-to-respond-to-negative-google-reviews",
  "can-you-remove-a-google-review",
  "add-manager-google-business-profile",
  "google-review-link-and-qr-code",
  "why-chatgpt-describes-your-business-wrongly",
  "keep-your-hours-and-details-the-same-everywhere",
] as const;

const files = import.meta.glob<{ guide: GuideDoc }>("./*.tsx", { eager: true });
const bySlug = new Map<string, GuideDoc>();
for (const mod of Object.values(files)) bySlug.set(mod.guide.slug, mod.guide);
// An earlier guide not yet moved to its own file comes from src/lib/guides.tsx in the same shape.
for (const g of LEGACY_GUIDES) if (!bySlug.has(g.slug)) bySlug.set(g.slug, g);

/** Every guide, public or not, in the order: the Guides 3 schedule, then the earlier guides. */
export const ALL_GUIDES: GuideDoc[] = [...ORDER, ...EARLIER]
  .map((s) => bySlug.get(s))
  .filter((g): g is GuideDoc => Boolean(g));

export const guideDoc = (slug: string) => bySlug.get(slug);

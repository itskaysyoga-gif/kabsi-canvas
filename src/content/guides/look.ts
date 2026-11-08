// Style 1 part A (master plan 30.33 item 2): each guide's photo, its group on the guides list and the phrase of its title
// on the highlight bar. `photo` is a file name in src/assets/photos (docs/PHOTOS.md) without its size; no photo is used for
// more than two guides (tests/style1.test.ts). scripts/guide-covers.mjs reads this file for the social images, so keep one
// entry per line in this shape. The choices are listed in docs/COPY.md section 55.

export const GUIDE_GROUPS = [
  "Reviews",
  "Hours and details",
  "Photos and posts",
  "Setting up",
  "Problems and fixes",
  "Checklists",
  "AI answers",
] as const;
export type GuideGroup = (typeof GUIDE_GROUPS)[number];

export type GuideLook = { photo: string; group: GuideGroup; mark: string };

// prettier-ignore
export const GUIDE_LOOK: Record<string, GuideLook> = {
  "why-is-my-business-not-on-google-maps": { photo: "bakery-window", group: "Problems and fixes", mark: "Google Maps" },
  "how-to-verify-google-business-profile": { photo: "salon-tablet", group: "Setting up", mark: "verify" },
  "google-business-profile-suspended": { photo: "phone-shop", group: "Problems and fixes", mark: "What do I do?" },
  "someone-changed-my-hours-on-google": { photo: "cafe-counter", group: "Hours and details", mark: "How do I fix it?" },
  "how-to-set-holiday-hours-on-google": { photo: "bakery-counter", group: "Hours and details", mark: "holiday hours" },
  "choose-google-business-profile-categories": { photo: "florist-wide", group: "Hours and details", mark: "categories" },
  "google-business-description-examples": { photo: "spa-facial", group: "Hours and details", mark: "business description" },
  "google-posts-for-local-businesses": { photo: "restaurant-cooks", group: "Photos and posts", mark: "what and how often?" },
  "photos-for-google-business-profile": { photo: "restaurant-dining", group: "Photos and posts", mark: "Which photos" },
  "how-to-ask-for-google-reviews": { photo: "cafe-barista", group: "Reviews", mark: "the right way?" },
  "report-fake-google-reviews": { photo: "phone-reading", group: "Reviews", mark: "fake or spam reviews" },
  "review-gating-google": { photo: "phone-typing", group: "Reviews", mark: "review gating" },
  "should-you-reply-to-every-google-review": { photo: "phone-reading", group: "Reviews", mark: "every Google review?" },
  "add-services-and-prices-to-google": { photo: "barber-shave", group: "Hours and details", mark: "services and prices" },
  "google-profile-checklist-hair-salons-barbers": { photo: "barber-cut", group: "Checklists", mark: "salons and barbers" },
  "google-profile-checklist-restaurants-cafes": { photo: "restaurant-kitchen", group: "Checklists", mark: "restaurants and cafes" },
  "transfer-google-business-profile-ownership": { photo: "auto-garage", group: "Setting up", mark: "transfer ownership" },
  "remove-old-employee-or-agency-from-google-profile": { photo: "salon-wash", group: "Setting up", mark: "old employee or agency" },
  "duplicate-google-listings": { photo: "pet-grooming-wide", group: "Problems and fixes", mark: "find and fix them" },
  "how-google-chooses-local-results": { photo: "restaurant-dining", group: "Problems and fixes", mark: "show nearby?" },
  "how-to-reply-to-google-reviews": { photo: "phone-typing", group: "Reviews", mark: "reply to Google reviews" },
  "how-to-respond-to-negative-google-reviews": { photo: "phone-shop", group: "Reviews", mark: "negative Google review" },
  "can-you-remove-a-google-review": { photo: "dental-clinic-wide", group: "Reviews", mark: "remove a Google review?" },
  "add-manager-google-business-profile": { photo: "salon-tablet", group: "Setting up", mark: "add a manager" },
  "google-review-link-and-qr-code": { photo: "cafe-counter", group: "Reviews", mark: "review link and QR code" },
  "why-chatgpt-describes-your-business-wrongly": { photo: "florist-wide", group: "AI answers", mark: "wrongly?" },
  "keep-your-hours-and-details-the-same-everywhere": { photo: "bakery-counter", group: "Hours and details", mark: "the same everywhere?" },
  "uae-national-day-and-eid-hours-on-google": { photo: "salon-studio", group: "Hours and details", mark: "National Day and Eid" },
  "christmas-and-bank-holiday-hours-on-google-uk": { photo: "nail-desk", group: "Hours and details", mark: "Christmas and bank holiday hours" },
  "reply-to-bad-google-review-salon": { photo: "salon-wash", group: "Reviews", mark: "bad Google review" },
  "what-to-post-on-google-as-a-barber": { photo: "barber-cut", group: "Photos and posts", mark: "post on Google?" },
  "reply-to-review-that-names-your-stylist": { photo: "beauty-salon-wide", group: "Reviews", mark: "names my stylist?" },
  "reply-to-reviews-about-no-shows-and-cancellation-fees": { photo: "nail-technician", group: "Reviews", mark: "cancellation fee?" },
  "where-to-put-your-google-review-link-salon": { photo: "barber-shave", group: "Reviews", mark: "review link?" },
  "why-google-shows-wrong-details-for-your-salon": { photo: "spa-facial", group: "Problems and fixes", mark: "wrong details" },
};

/** The look of a guide, with a safe default for a new guide that has no entry yet (the test fails before it ships). */
export const guideLook = (slug: string): GuideLook =>
  GUIDE_LOOK[slug] ?? { photo: "salon-tablet", group: "Setting up", mark: "" };

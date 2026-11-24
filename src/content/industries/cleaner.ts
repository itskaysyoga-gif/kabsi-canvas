import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// SITE-2 (blueprint 3.1 section 5): the cleaning business page. The industry pages are one template now, so this file holds
// only what the /for list and the free check need; the page's own example review and Google fact are in blueprint.ts.
// Brightside Cleaning, Leeds, is invented (Example).
export const cleaner: Industry = {
  slug: "cleaner",
  name: "cleaning business",
  plural: "Cleaners",
  finished: true,
  lead: "A reply ready for every review, your areas and hours kept right, and nothing goes live without your yes.",
  keyword: "house cleaner",
  example: {
    business: "Brightside Cleaning",
    city: "Leeds",
    kind: "cleaning business",
    rival: "Fresh Home Co",
    rival2: "Tidy Team",
    near: ["Near the centre", "By the park"],
  },
  photos: [PHOTOS.phoneShop, PHOTOS.phoneReading],
  searches: [
    "house cleaner near me",
    "domestic cleaning",
    "end of tenancy cleaning",
    "office cleaning",
    "cleaning services near me",
  ],
  services: ["Regular home clean", "Deep clean", "End of tenancy", "Office clean", "Oven clean"],
  profile: [],
  page: {
    query: "cleaning business Google Business Profile",
    title: "Cleaning business Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your cleaning business Google Business Profile: a reply for every review, your areas and hours kept right, nothing live without your yes.",
    h1: "Your cleaning business on Google. Taken care of.",
    mark: "Taken care of.",
    line: "Kabsi looks after your cleaning business Google Business Profile, and you approve every change.",
    card: "A reply for every review, your areas kept right.",
    answer:
      "For a cleaning business Google Business Profile, Kabsi prepares a reply for every review and checks your profile every day, all for your yes.",
    watch: {
      business: "Brightside Cleaning, Leeds",
      line: "Kabsi compares your hours and website with what you told it, every day.",
      fields: ["Opening hours", "Website", "Phone", "Main category"],
      what: "Website",
      google: "Old site",
      owner: "New site",
      message: "Google shows your old website. You told me the new one.",
    },
    post: {
      owner: "Spring offer on deep cleans.",
      quote: "Spring deep cleans are open for booking.",
    },
    jobs: [
      { title: "A reply for every review", text: "Ready for your yes." },
      { title: "Your profile, checked", text: "Hours and website, every day." },
      { title: "Proof of the work", text: "A short summary every week." },
    ],
    ai: { question: "", answer: "", sources: ["", ""] },
    related: ["pet-grooming", "car-wash", "florist", "auto-repair", "hair-salon", "restaurant"],
  },
  guides: [
    "how-to-reply-to-google-reviews",
    "google-review-link-and-qr-code",
    "how-to-set-holiday-hours-on-google",
  ],
};

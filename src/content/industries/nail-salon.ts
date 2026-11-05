import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the nail salon page written for its own trade. Every Google
// sentence has its row in docs/claims/nail-salon.md (section "Design 8"); the Kabsi sentences follow
// knowledge/kabsi-facts.md. Polish Room, Brighton, is invented (Example).
export const nailSalon: Industry = {
  slug: "nail-salon",
  hub: "beauty-and-wellness",
  name: "nail salon",
  plural: "Nail salons",
  finished: true,
  lead: "Seasonal designs as posts, photos of your work checked, holiday hours asked in time and a reply for every review. Kabsi gets each one ready, and you approve it.",
  keyword: "nail salon",
  example: {
    business: "Polish Room",
    city: "Brighton",
    kind: "salon",
    rival: "Nail Lounge",
    rival2: "The Nail Studio",
    near: ["Near the station", "By the seafront"],
  },
  photos: [PHOTOS.nailTechnician, PHOTOS.nailDesk],
  focus: "50% 50%",
  searches: ["nail salon near me", "gel nails", "manicure", "acrylic nails", "nail art"],
  tasks: [
    {
      title: "Seasonal designs, as posts",
      text: "Autumn colours, Christmas sets, summer brights. Each season's designs become a post with your photo, ready for your yes.",
    },
    {
      title: "Photos that show the work",
      text: "Send the photo you are proud of. Kabsi checks it first and tells you when one is dark, blurry or too small, before anything goes to Google.",
    },
    {
      title: "A price list people understand",
      text: "Gel manicure, infill, soak off, pedicure. Google can show each service with a price and a description, so nobody has to phone to ask. Kabsi's Profile Coach lists what your profile is missing.",
    },
    {
      title: "Thank the technician by name",
      text: "A review that names Mia gets a reply that passes the thanks on. Kabsi uses only the names on your team list.",
    },
    {
      title: "Holiday hours, asked in time",
      text: "Five days before each bank holiday Kabsi asks: normal hours, closed, or custom. Google keeps them as special hours.",
    },
  ],
  faqs: [
    {
      q: "Will Kabsi change my prices on Google without asking?",
      a: "No. Kabsi does not edit prices on Google today, and nothing reaches Google until you approve it.",
    },
    {
      q: "What happens with a review about a reaction or an infection?",
      a: "Kabsi shows it to you with no draft, so you decide how to answer.",
    },
    {
      q: "Does Kabsi message my clients?",
      a: "No. Kabsi talks only to you. It gives you a review link and a QR card to share after a real visit.",
    },
    {
      q: "Can I create a category called 'nail bar'?",
      a: "No. Google does not let a business create its own category. Pick the most specific one from Google's list.",
    },
  ],
  guides: ["how-to-choose-your-primary-category", "how-to-reply-to-google-reviews"],
  d8: {
    seo: {
      title: "Kabsi for nail salons: Google posts, photos and review replies",
      description:
        "Kabsi keeps a nail salon's Google profile right: seasonal designs as posts, photos checked, bank holiday hours asked in time, and a reply ready for every review.",
    },
    business: "Polish Room, Brighton",
    card: {
      label: "Post",
      text: "Christmas designs post ready with your photo:",
      quote:
        "Our Christmas designs are in: red velvet, gold foil and snowflakes, until 24 December.",
      buttons: ["Approve", "Edit", "Skip"],
      time: "10:05",
    },
    jobsTitle: "The Google jobs that come back for a nail salon.",
    searchText:
      "People search for the service as well as the salon: gel nails, a manicure, nail art. Then they choose by the photos. Your services and your latest designs answer both.",
    check: [
      {
        label: "Photos",
        value: "4",
        tone: "warn",
        next: "Kabsi asks for photos of your work from your phone, checks each one and sends it to Google once you say yes.",
      },
      { label: "Reviews", value: "27, rated 4.7", tone: "ok" },
      { label: "Opening hours", value: "Shown", tone: "ok" },
      { label: "Website", value: "Shown", tone: "ok" },
    ],
    checkText:
      "For a nail salon the free check starts with your photos, because clients choose by the work they see, then your reviews, hours and links. Example result for an invented salon in Brighton.",
    guide: [
      {
        title: "Designs and photos, season by season",
        paras: [
          "A nail salon's work changes with the calendar: darker colours in autumn, sparkle before Christmas, brights for summer. A post is the place for each new set, with a photo and a button to your own website. An offer or an event is a separate kind of post on Google. Google archives posts after six months unless a date range is set, so last winter's set does not linger into spring.",
          "Google asks for photos without significant alterations or excessive filters. Take the hand from above in daylight, keep the colour in the photo the colour on the nail, and send it to Kabsi. Kabsi checks it before it goes to Google. Photos need to be JPG or PNG, in focus and well lit.",
        ],
      },
      {
        title: "Prices, names and the right category",
        paras: [
          "Google gives each service its own price and description. Keep the price out of the name, because Google rejects a custom name that has one. A list of your main services with prices answers the question people would otherwise phone to ask.",
          "Google's own example of choosing a specific category is 'Nail salon' instead of 'Salon', and you cannot create a category of your own. Add a second category only for work you really do in the salon. When a review names the technician, a reply that passes the thanks on tells the next client who to book. Kabsi uses only the names on your team list, so a technician who has left is never thanked once you take their name off the list. When a review is unhappy about a nail that lifted, the reply asks the client to get in touch through the details on your profile, and never offers anything in return for changing the review.",
        ],
      },
    ],
    related: ["hair-salon", "barbershop"],
  },
};

import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the hair salon page written for its own trade. Every Google
// sentence has its row in docs/claims/hair-salon.md (written in Web 4c before the page was indexed); the Kabsi
// sentences follow knowledge/kabsi-facts.md. Hollis Hair, Bristol, is invented (Example).
export const hairSalon: Industry = {
  slug: "hair-salon",
  name: "hair salon",
  plural: "Hair salons",
  finished: true,
  lead: "New stylists announced, colour work as posts, holiday hours asked in time and replies ready. You approve each one.",
  keyword: "hair salon",
  example: {
    business: "Hollis Hair",
    city: "Bristol",
    kind: "salon",
    rival: "Juniper Hair Studio",
    rival2: "Lark Salon",
    near: ["Near the station", "By the park"],
  },
  photos: [PHOTOS.salonWash, PHOTOS.salonStudio],
  focus: "50% 30%",
  searches: ["hair salon near me", "hairdressers", "balayage", "hair colour near me", "blow dry"],
  // Industries 3 (master plan 30.33 item 2): the two old guide sections as short cards. Each line keeps a fact of
  // docs/claims/hair-salon.md, whose "Industries 3" section maps it to its row.
  // Industry 1 (R-144): the services this trade lists on Google (Example names, not a full list).
  services: [
    "Cut and blow dry",
    "Full head colour",
    "Balayage",
    "Highlights",
    "Root touch up",
    "Toner and gloss",
    "Wedding hair",
    "Children's cuts",
  ],
  profile: [
    {
      title: "Services with a price",
      text: "Each service can carry a price. Google rejects a custom name that has one.",
    },
    {
      title: "A new stylist on the team",
      text: "Add them to your team list. Reviews that name them get a reply thanking them.",
    },
    {
      title: "The booking link",
      text: "Google lets you add your own link. Check it each time you change tools.",
    },
    {
      title: "Photos true to the chair",
      text: "Sharp, bright photos of real work. Kabsi looks at every one before Google does.",
    },
  ],
  reviews: [
    {
      title: "A stylist named in the review",
      text: "The reply thanks that stylist, when the name is on your team list.",
    },
    {
      title: "Colour that came out wrong",
      text: "A calm draft asking the client to get in touch through your profile.",
    },
    {
      title: "A scalp reaction to dye",
      text: "A health matter: no draft, only a short checklist for you.",
    },
  ],
  holidays: [
    {
      title: "Bank holidays, asked ahead",
      text: "Five days before, Kabsi asks: normal, closed or your own hours.",
    },
    {
      title: "Christmas week 2026",
      text: "Christmas Day is Friday 25 December; the Boxing Day holiday is Monday 28.",
    },
    {
      title: "A training day, closed",
      text: "One day is special hours. Seven days or more is temporarily closed.",
    },
  ],
  photoCards: [
    {
      title: "Colour by the window",
      text: "Shoot the finished colour in daylight. Kabsi flags a dark or blurry one.",
    },
    {
      title: "The lengths, not the face",
      text: "The back of the head or the ends. Kabsi does not look for faces.",
    },
    {
      title: "The chair and the basin",
      text: "A photo with no words goes on as a profile photo, after your yes.",
    },
  ],
  posts: [
    {
      title: "A stylist's first day",
      text: "Their name, what they love doing and when bookings with them open.",
    },
    {
      title: "Colour of the month",
      text: "One photo of the shade and one line from you.",
    },
    {
      title: "Late nights before Christmas",
      text: "Which evenings you stay open, once they are set as special hours.",
    },
  ],
  categories: {
    primary: "Hairdresser",
    more: ["Beauty salon"],
    line: "Hairdresser is the name in Google's own example; the label can change by country, so open your category box first.",
  },
  page: {
    query: "hair salon Google Business Profile",
    title: "Hair salon Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your hair salon Google Business Profile: a reply for every review, new stylists announced, colour work posted, holiday hours asked in time.",
    h1: "Your salon on Google, taken care of.",
    mark: "taken care of.",
    line: "Kabsi looks after your hair salon Google Business Profile: replies, colour posts, holiday hours and stylists, each for your yes.",
    card: "Stylists thanked by name, colour work as posts.",
    answer:
      "For a hair salon Google Business Profile, Kabsi prepares review replies, turns colour work into posts and asks about holiday hours, all for your yes.",
    watch: {
      business: "Hollis Hair, Bristol",
      line: "Clients check your hours and booking link before they come. Kabsi compares them with what you told it, every day.",
      fields: [
        "Opening hours",
        "Special hours",
        "Website",
        "Phone",
        "Main category",
        "Description",
      ],
      what: "Website",
      google: "Old booking page",
      owner: "New booking page",
      message: "Google shows your old booking page as your website. You told me the new one.",
    },
    post: {
      owner: "Amber joins us for colour and balayage. Booking from Tuesday.",
      quote: "New to the team: Amber, colour and balayage. Book with her from Tuesday.",
    },
    jobs: [
      {
        title: "A reply for every review",
        text: "Thanks Amber when a review names her, using only names on your team list.",
      },
      {
        title: "Colour work, as posts",
        text: "Send the photo with a line. Kabsi writes the post and checks the photo first.",
      },
      {
        title: "Bank holiday hours",
        text: "Kabsi asks five days before each bank holiday and sets your answer after your yes.",
      },
    ],
    ai: {
      question: "Which hair salon in Clifton, Bristol does balayage on Saturdays?",
      answer: "Hollis Hair on Gloucester Road does balayage and is open on Saturdays from 9 am.",
      sources: ["Hollis Hair's Google profile", "Hollis Hair's website"],
    },
    related: [
      "barbershop",
      "nail-salon",
      "lash-and-brow-studio",
      "spa-and-massage",
      "tattoo-studio",
      "medical-and-aesthetic-clinic",
    ],
  },
  faqs: [
    {
      q: "Can Kabsi add a new service to my Google profile?",
      a: "Not yet. Kabsi's Profile Coach lists the services your profile is missing; adding them on Google for you comes later.",
    },
    {
      q: "Will a reply thank the right stylist?",
      a: "Only when the review names them. Kabsi uses the names on the team list you give it, and never guesses one.",
    },
    {
      q: "Does Kabsi work with my salon booking system?",
      a: "No, Kabsi looks after the salon's Google profile; appointments stay in your own system.",
    },
    {
      q: "How does Kabsi know what my salon is like?",
      a: "You tell it once, in About your business: services, team, hours and anything it should never say. Every draft uses those facts.",
    },
    {
      q: "Where does the review QR card go in a salon?",
      a: "At each station by the mirror and at reception. Hand it over the same way after every visit.",
    },
  ],
  guides: [
    "google-profile-checklist-hair-salons-barbers",
    "how-to-reply-to-google-reviews",
    "how-to-set-holiday-hours-on-google",
  ],
  d8: {
    seo: {
      title: "Kabsi for hair salons: Google posts, hours and review replies",
      description:
        "Kabsi keeps a hair salon's Google profile right: new stylists announced, colour work as posts, bank holiday hours asked in time, and a reply ready for every review.",
    },
    business: "Hollis Hair, Bristol",
    card: {
      label: "Post",
      text: "Amber starts on Tuesday. Post ready:",
      quote: "New to the team: Amber, colour and balayage, from Tuesday.",
      buttons: ["Approve", "Edit", "Skip"],
      time: "09:20",
    },
    jobsTitle: "Google jobs that come back.",
    check: [
      {
        label: "Opening hours",
        value: "Missing",
        tone: "warn",
        next: "Kabsi asks you for your hours and sends them to Google once you say yes.",
      },
      { label: "Reviews", value: "38, rated 4.8", tone: "ok" },
      { label: "Photos", value: "10 or more", tone: "ok" },
      { label: "Website", value: "Shown", tone: "ok" },
    ],
    checkText:
      "For a hair salon the free check starts with your hours, because a client checks you are open before booking, then your reviews, photos and website. Example result for an invented salon in Bristol.",
  },
};

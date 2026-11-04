import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the barbershop page written for its own trade. Every Google
// sentence has its row in docs/claims/barbershop.md (section "Design 8"); the Kabsi sentences follow
// knowledge/kabsi-facts.md. Fade and Co, Leeds, is invented (Example).
export const barbershop: Industry = {
  slug: "barbershop",
  hub: "beauty-and-wellness",
  name: "barbershop",
  plural: "Barbershops",
  finished: true,
  lead: "Walk-in times, bank holiday hours, posts about new cuts and a reply for every review. Kabsi gets each one ready, and you approve it.",
  keyword: "barber",
  example: {
    business: "Fade and Co",
    city: "Leeds",
    kind: "shop",
    rival: "Kings Cut Barbers",
    rival2: "The Barber Room",
    near: ["Near the station", "By the market"],
  },
  photos: [PHOTOS.barberCut, PHOTOS.barberShave],
  focus: "50% 40%",
  searches: ["barber near me", "walk in barber", "skin fade", "beard trim", "barber open now"],
  tasks: [
    {
      title: "Walk-in times, posted when they change",
      text: "A quiet Tuesday afternoon or a late Thursday is a post with the times, and a button to your own website. You say yes, it goes up.",
    },
    {
      title: "Bank holiday hours, asked five days ahead",
      text: "Before Easter Monday or Boxing Day, Kabsi asks: normal hours, closed, or custom. Google keeps those as special hours and your normal week stays as it is.",
    },
    {
      title: "New cuts on your price list",
      text: "Started doing hot towel shaves or a kids' cut? Google can show each service with a price and a short description. Kabsi's Profile Coach lists what your profile is missing, services included.",
    },
    {
      title: "Thank the barber the review names",
      text: "A review that says 'ask for Jay' gets a reply that passes the thanks on. Kabsi only uses the names on your team list, so a barber who left is never named once you take their name off the list.",
    },
    {
      title: "A calm reply after the Saturday queue",
      text: "Walk-in shops make people wait. The reply says sorry for the wait once, gives no excuse it cannot back up, and never argues.",
    },
  ],
  faqs: [
    {
      q: "Will a reply know which barber did the cut?",
      a: "Only if the review says so. Kabsi uses the names on the team list you give it, and never guesses a name.",
    },
    {
      q: "Is Kabsi a booking system?",
      a: "No. Kabsi looks after your Google profile: hours, replies, posts and photos. It does not take bookings.",
    },
    {
      q: "What does a reply to an unhappy customer say?",
      a: "It thanks them for telling you, names the problem in one sentence and asks them to get in touch through the details on your profile. It never argues and never offers a free cut to change a review.",
    },
    {
      q: "Does Kabsi message my customers?",
      a: "No. Kabsi talks only to you. It gives you a review link and a QR card, and you share them after a real visit.",
    },
  ],
  guides: ["google-review-link-and-qr-code", "how-to-set-holiday-hours-on-google"],
  d8: {
    seo: {
      title: "Kabsi for barbershops: walk-in times, bank holiday hours and replies on Google",
      description:
        "Kabsi keeps a barbershop's Google profile right: walk-in times as posts, bank holiday hours, the barber thanked by name, and a reply ready for every review.",
    },
    business: "Fade and Co, Leeds",
    card: {
      label: "Post",
      text: "Walk-in post ready for today:",
      quote: "Walk-ins until 6 pm today. Two chairs free from 2 pm.",
      buttons: ["Approve", "Edit", "Skip"],
      time: "11:40",
    },
    jobsTitle: "The Google jobs that come back for a barbershop.",
    searchText:
      "People look for a barber when they want a cut today, so they search for what is near and open. Your hours, your services and your latest replies are what they read before they walk in.",
    check: [
      { label: "Opening hours", value: "Shown", tone: "ok" },
      {
        label: "Reviews",
        value: "7, rated 4.6",
        tone: "warn",
        next: "Kabsi gives you a review link and a QR card to hand to every customer.",
      },
      { label: "Photos", value: "10 or more", tone: "ok" },
      { label: "Phone", value: "Shown", tone: "ok" },
    ],
    checkText:
      "For a barbershop the free check starts with what a walk-in customer relies on: your hours, your reviews and your photos. Example result for an invented shop in Leeds.",
    guide: [
      {
        title: "Hours a walk-in customer can trust",
        paras: [
          "A barbershop lives on people who decide in the moment. If Google says you are open until 7 and the door is locked at 6, that customer goes next door and remembers it. Google keeps your weekly hours apart from special hours, so a bank holiday or a staff training afternoon can differ without touching the normal week. It is a good idea, in Google's own words, to confirm your hours for official holidays.",
          "In 2027 Good Friday is 26 March and Easter Monday is 29 March in England and Wales. Christmas Day and Boxing Day fall on a weekend, so the bank holidays move to Monday 27 and Tuesday 28 December. Kabsi asks you five days before each one what the shop will do, and sets the hours on Google once you say yes. If you also want to say when the last walk-in is taken, that goes in a post.",
        ],
      },
      {
        title: "Services, prices and the barber by name",
        paras: [
          "Google can show each service with a price and a description. Keep the price out of the service name itself: Google rejects a custom service name that has a price in it. A clear list (skin fade, beard line up, hot towel shave, the under 12 cut) answers the question people would otherwise phone to ask.",
          "When a review names the barber, a reply that passes the thanks on tells the next reader who to ask for. Kabsi drafts it in your voice, using only what the review says and only the names on your team list. A reply never includes a phone number or a link, and it never offers a free cut to change a review: Google does not allow anything in exchange for a review.",
        ],
      },
    ],
    related: ["hair-salon", "nail-salon"],
  },
};

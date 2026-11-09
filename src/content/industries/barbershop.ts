import { PHOTOS } from "@/components/kabsi/photos";
import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the barbershop page written for its own trade. Every Google
// sentence has its row in docs/claims/barbershop.md (section "Design 8"); the Kabsi sentences follow
// knowledge/kabsi-facts.md. Fade and Co, Leeds, is invented (Example).
export const barbershop: Industry = {
  slug: "barbershop",
  name: "barbershop",
  plural: "Barbershops",
  finished: true,
  lead: "Walk-in times, bank holiday hours, posts about new cuts and a reply for every review. You approve each one.",
  keyword: "barber",
  example: {
    business: "Fade and Co",
    city: "Leeds",
    kind: "shop",
    rival: "Kings Cut Barbers",
    rival2: "The Barber Room",
    near: ["Near the station", "By the market"],
  },
  photos: [PHOTOS.barberCut, MORE_PHOTOS.barberShaveTall],
  focus: "50% 40%",
  searches: ["barber near me", "walk in barber", "skin fade", "beard trim", "barber open now"],
  // Industries 3 (master plan 30.33 item 2): the two old guide sections as short cards. Each line keeps a fact of
  // docs/claims/barbershop.md, whose "Industries 3" section maps it to its row.
  // Industry 1 (R-144): the services this trade lists on Google (Example names, not a full list).
  services: [
    "Skin fade",
    "Scissor cut",
    "Beard trim",
    "Hot towel shave",
    "Line up",
    "Kids' cut",
    "Head shave",
  ],
  profile: [
    {
      title: "Hours a walk-in can trust",
      text: "Google keeps weekly hours apart from special hours, so a bank holiday can differ.",
    },
    {
      title: "Cuts with a price",
      text: "Each cut can carry a price. Google rejects a custom name that has one.",
    },
    {
      title: "Walk-ins or bookings, said once",
      text: "Write in your description which days take walk-ins and which need booking.",
    },
    {
      title: "Your phone, for walk-in questions",
      text: "Kabsi checks the number Google shows against yours every day.",
    },
  ],
  reviews: [
    {
      title: "The barber, by name",
      text: "A reply passes the thanks on, and never offers a free cut for a review.",
    },
    {
      title: "A long Saturday wait",
      text: "One apology, no excuse, and no promise of a shorter queue.",
    },
    {
      title: "A nick from the razor",
      text: "That is an injury: no draft, just a checklist sent to you.",
    },
  ],
  holidays: [
    {
      title: "Easter and Christmas 2027",
      text: "England and Wales: Good Friday 26 March, Easter Monday 29 March, 27 and 28 December.",
    },
    {
      title: "The rush before a bank holiday",
      text: "Kabsi asks five days ahead, so extra chairs and hours are set in time.",
    },
  ],
  photoCards: [
    {
      title: "The fade from behind",
      text: "Clean neckline, plain wall, good light. The cut is the subject.",
    },
    {
      title: "The shop from the street",
      text: "Google says an outside photo helps people recognise you as they arrive.",
    },
    {
      title: "Chairs at opening time",
      text: "Empty chairs and a tidy counter show a walk-in what to expect.",
    },
  ],
  posts: [
    {
      title: "Walk-in hours this week",
      text: "A late Thursday or an early Saturday start, said plainly.",
    },
    {
      title: "A new barber joins",
      text: "Their name and the cuts they do best, drafted for your yes.",
    },
    {
      title: "Your price list",
      text: "A photo of the board, posted only as you wrote it.",
    },
  ],
  categories: {
    primary: "Barber shop",
    more: [],
    line: "Barber shop has its own place in Google's list, apart from hair salons. Read the name in your own category box.",
  },
  page: {
    query: "barber shop Google Business Profile",
    title: "Barber shop Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your barber shop Google Business Profile: walk-in hours right, bank holidays asked in time, new cuts posted and a reply to every review.",
    h1: "Your barber shop on Google, kept sharp.",
    mark: "kept sharp.",
    line: "Kabsi looks after your barber shop Google Business Profile: walk-in hours, fresh cuts as posts, a reply to every review.",
    card: "Walk-in hours right, fresh cuts as posts.",
    answer:
      "For a barber shop Google Business Profile, Kabsi prepares review replies, turns fresh cuts into posts and checks your hours daily, all for your yes.",
    watch: {
      business: "Fade and Co, Leeds",
      line: "Walk-in customers trust the hours Google shows. Kabsi compares them with yours every day and asks before anything changes.",
      fields: ["Opening hours", "Special hours", "Phone", "Address", "Open status"],
      what: "Saturday",
      google: "Closed",
      owner: "08:00 to 18:00",
      message: "Google shows you closed on Saturday. You told me 08:00 to 18:00.",
    },
    post: {
      owner: "Skin fade and beard trim from this morning. Walk-ins until 6 today.",
      quote: "Fresh skin fade and a sharp beard trim. Walk in until 6 today.",
    },
    jobs: [
      {
        title: "Replies that name the right barber",
        text: "Only when the review names him, and only names on your team list.",
      },
      {
        title: "Fresh cuts, as posts",
        text: "A photo from the chair becomes a post. Kabsi checks the photo first.",
      },
      {
        title: "Walk-in hours that match the door",
        text: "Kabsi checks your hours daily and asks before each bank holiday.",
      },
    ],
    ai: {
      question: "Which barber near Leeds city centre takes walk-ins on Saturday?",
      answer: "Fade and Co on Call Lane takes walk-ins on Saturdays from 8 am to 6 pm.",
      sources: ["Fade and Co's Google profile", "Fade and Co's website"],
    },
    related: [
      "hair-salon",
      "tattoo-studio",
      "nail-salon",
      "lash-and-brow-studio",
      "spa-and-massage",
      "gym-and-fitness",
    ],
  },
  faqs: [
    {
      q: "Will a reply know which barber did the cut?",
      a: "Only if the review says so. Kabsi uses the names on the team list you give it, and never guesses a name.",
    },
    {
      q: "Is Kabsi a booking system?",
      a: "No, Kabsi looks after your Google profile: hours, replies, posts and photos. It does not take bookings.",
    },
    {
      q: "What does a reply to an unhappy customer say?",
      a: "It thanks them, names the problem and points to your contact details. It never argues or offers a free cut to change a review.",
    },
    {
      q: "Does Kabsi message my customers?",
      a: "No, Kabsi messages the shop owner, never the customer in the chair. You hand out the review card after a cut.",
    },
    {
      q: "Can Kabsi post our prices?",
      a: "Yes, the prices on your board, word for word, once you approve the post. It never makes up a deal.",
    },
  ],
  guides: [
    "google-profile-checklist-hair-salons-barbers",
    "how-to-set-holiday-hours-on-google",
    "how-to-reply-to-google-reviews",
  ],
  d8: {
    seo: {
      title: "Kabsi for barbershops: Google posts, hours and review replies",
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
    jobsTitle: "Google jobs that come back.",
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
  },
};

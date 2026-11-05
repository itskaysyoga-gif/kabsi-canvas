import { PHOTOS } from "@/components/kabsi/photos";
import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/auto-repair.md, approved by lane R on 27 Oct 2026 (brief section 18). Westgate Auto Repair is
// invented (Example). Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const autoRepair: Industry = {
  slug: "auto-repair",
  name: "garage",
  plural: "Auto repair",
  finished: true,
  lead: "Your jobs listed, your phone number and hours exact on Google, and calm replies drafted. You approve each one.",
  keyword: "car repair",
  example: {
    business: "Westgate Auto Repair",
    city: "Manchester",
    kind: "garage",
    rival: "Fast Fit Garage",
    rival2: "Ring Road Motors",
    near: ["Past the ring road", "By the retail park"],
  },
  photos: [PHOTOS.autoGarage, MORE_PHOTOS.autoMechanicTall],
  focus: "50% 55%",
  searches: [
    "car repair",
    "garage",
    "mechanic",
    "car repair near me",
    "mot test",
    "car service",
    "brake repair",
    "car ac repair",
    "tyre shop",
    "garage open Saturday",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/auto-repair.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Every job on the list",
      text: "Service, brakes, air conditioning. Google can show each with a price; drop what you stopped.",
    },
    {
      title: "The MOT or the inspection",
      text: "In Great Britain most cars need a yearly MOT from three years. Post free slots.",
    },
    {
      title: "Phone and hours, exact",
      text: "Kabsi watches both every day for changes you did not make.",
    },
    {
      title: "If you come to the car",
      text: "No workshop? One profile for the area, address hidden. A garage with bays shows it.",
    },
  ],
  reviews: [
    {
      title: "The bill against the quote",
      text: "Calm, never argues or promises a refund. You read it first: no quick Post button.",
    },
    {
      title: "The same fault came back",
      text: "No argument, no admission of fault. It asks them to contact the garage.",
    },
    {
      title: "A safety problem with the car",
      text: "No draft: a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Auto repair shop",
    more: ["Tyre shop"],
    line: "Google's guidelines name both in a tyre and service chain example. Add 'Tyre shop' only if you sell and fit tyres.",
  },
  holidays: [
    {
      title: "Bank holiday Mondays, England and Wales",
      text: "3 May, 31 May and 30 August 2027. Say until when keys can be collected.",
    },
    {
      title: "Eid al-Fitr, UAE",
      text: "1 to 3 Shawwal, by the moon. Special hours, and when you take cars again.",
    },
    {
      title: "Ramadan, UAE",
      text: "Private sector hours drop by two a day. Check key collection against the shorter day.",
    },
  ],
  photoCards: [
    {
      title: "A car on the lift",
      text: "Tidy tools, good light, no customer's number plate in focus.",
    },
    {
      title: "The front and the parking",
      text: "Google says an outside photo helps people recognise you. Show where to leave the car.",
    },
    {
      title: "Post ideas",
      text: "Brake checks with the price, free MOT slots, air con checks before summer, Saturday hours.",
    },
  ],
  story: {
    title: "A bill that was more than the quote.",
    lead: "Kabsi writes the reply, then makes you read it first. Nothing about the bill is argued in public.",
    lines: [
      {
        from: "kabsi",
        text: "Westgate Auto Repair: a new 2-star review says the bill was higher than the quote. I wrote a calm reply for you to read first. Open it on your Kabsi account.",
        buttons: ["Open the draft", "Skip"],
      },
      { from: "owner", text: "Open the draft" },
      {
        from: "kabsi",
        text: "The reply thanks them, names the problem in one sentence and asks them to get in touch through the details on your profile. It does not argue or promise a refund. Edit it there, then approve it.",
      },
      {
        from: "kabsi",
        text: "Nothing is published until you say yes. Also ready: a post, 'Brake checks this week, from 25 pounds. Book on our page.' Reply Yes to post.",
        buttons: ["Yes", "Edit", "Skip"],
      },
    ],
  },
  page: {
    query: "auto repair shop Google Business Profile",
    title: "Auto repair shop Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your auto repair shop Google Business Profile: the phone and hours right, calm replies to price complaints, and work photos as posts.",
    h1: "Your garage on Google, running right.",
    mark: "running right.",
    line: "Kabsi looks after your auto repair shop Google Business Profile: the right phone, exact hours, and calm replies you approve.",
    card: "The right phone number, calm replies.",
    answer:
      "On an auto repair shop Google Business Profile, the phone comes first. Kabsi checks phone and hours daily, drafts calm replies, and you approve.",
    watch: {
      business: "Westgate Auto Repair, Manchester",
      line: "Drivers call the number Google shows. Kabsi compares it with yours every day.",
      fields: ["Phone", "Opening hours", "Address", "Website", "Main category"],
      what: "Phone",
      google: "An old number",
      owner: "Your workshop line",
      message: "Google shows a phone number that is not the one you gave me.",
    },
    post: {
      owner: "Air con check before summer.",
      quote: "Air con not cold any more? Book an air con check before the summer.",
    },
    jobs: [
      {
        title: "The right phone number",
        text: "Checked every day. When it differs, you choose which stays.",
      },
      {
        title: "Calm replies about price",
        text: "Drafts never argue, admit fault or promise a refund, and wait for you.",
      },
      {
        title: "Workshop photos, as posts",
        text: "A photo and a line become a post, with no price you did not give.",
      },
    ],
    nearby: { kind: "garage", term: "car repair" },
    ai: {
      question: "Which garage in Salford, Manchester does same day MOTs?",
      answer: "Westgate Auto Repair in Salford offers same day MOTs when you book before 10 am.",
      sources: ["Westgate Auto Repair's Google profile", "Westgate Auto Repair's website"],
    },
    related: [
      "car-wash",
      "optician",
      "pet-grooming",
      "veterinary-clinic",
      "dental-clinic",
      "barbershop",
    ],
  },
  faqs: [
    {
      q: "What does Kabsi say when a customer claims the repair was not done properly?",
      a: "A calm draft that never admits fault or argues. A reply never changes your UK duty of reasonable care and skill. Not legal advice.",
    },
    {
      q: "Will Kabsi write prices into a post?",
      a: "Only prices you give it. Kabsi never invents a price, offer or discount, and you approve each post.",
    },
    {
      q: "I come to the customer's car. What does my profile show?",
      a: "Google says a business serving customers at their location should have one profile and hide its address. Your profile then shows the area you serve.",
    },
    {
      q: "Where does the review QR code go in a garage?",
      a: "Where customers pay and collect keys, on the invoice, and in the message that says the car is ready. Ask every customer the same way.",
    },
    {
      q: "Does Kabsi see my customers' records?",
      a: "No. Kabsi works with your Google profile and the reviews on it. It does not connect to your customer records.",
    },
  ],
  guides: [
    "someone-changed-my-hours-on-google",
    "how-to-respond-to-negative-google-reviews",
    "google-posts-for-local-businesses",
  ],
};

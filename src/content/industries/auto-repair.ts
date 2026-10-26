import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/auto-repair.md, noindex until lane R approves it. Westgate Auto Repair is
// invented (Example). Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const autoRepair: Industry = {
  slug: "auto-repair",
  hub: "auto",
  name: "garage",
  plural: "Auto repair",
  finished: false,
  lead: "Kabsi lists the jobs you do, keeps your phone number and hours exact on Google, and writes calm replies to reviews about price and honesty that never argue or promise a refund. You approve each one on WhatsApp.",
  keyword: "car repair",
  example: {
    business: "Westgate Auto Repair",
    city: "Manchester",
    kind: "garage",
    rival: "Fast Fit Garage",
    rival2: "Ring Road Motors",
    near: ["Past the ring road", "By the retail park"],
  },
  photos: [PHOTOS.autoGarage, PHOTOS.autoMechanic],
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
  tasks: [
    {
      title: "Put each job on the list: service, brakes, air conditioning",
      text: "Google can show a service with a price and a description, and a real auto repair profile lists jobs such as air conditioning and filter replacement. Add the work you do and drop what you stopped.",
    },
    {
      title: "Say what you do about the MOT or the inspection",
      text: "In the UK most cars need an MOT by their third anniversary, then every year, and it can be taken up to a month early without losing the renewal date. A garage that tests cars posts its free slots. In Dubai the RTA requires an inspection appointment to register or renew a car.",
    },
    {
      title: "Keep the phone number and the hours exact",
      text: "Kabsi watches the phone number and the hours for changes you did not make. Google expects the garage to be staffed and open for the hours it states.",
    },
    {
      title: "Answer price and honesty reviews calmly",
      text: "A review about a bill gets a draft that never argues, never admits fault and never promises a refund or discount. It comes to you to read before anything is published, with no quick Post button.",
    },
    {
      title: "If you come to the car, show the area and hide the address",
      text: "A mobile mechanic with no workshop keeps one profile for the area and hides the address. A garage with bays keeps its address on show.",
    },
  ],
  categories: {
    primary: "Auto repair shop",
    more: ["Tyre shop"],
    note: "Google's own guidelines name both categories in an example of a tyre and service chain whose locations all have 'Tyre Shop' and also 'Auto Repair Shop'. Add 'Tyre shop' only if you really sell and fit tyres.",
  },
  reviewThemes: [
    {
      theme: "They told me what did not need doing",
      text: "A customer thanks the garage for honesty about a repair they could skip. The reply thanks them and adds nothing the owner did not say.",
    },
    {
      theme: "The bill against the quote",
      text: "The reply stays calm and asks the writer to get in touch through the details on the profile. It does not argue the amount in public.",
    },
    {
      theme: "The same fault came back",
      text: "No argument and no admission of fault in a public reply. It asks the customer to contact the garage and leaves the diagnosis to you.",
    },
    {
      theme: "The car was ready later than promised",
      text: "The reply says sorry for the wait once. It states no reason the owner did not give.",
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
  posts: [
    "Brake checks this week, with the price and how long they take.",
    "MOT slots free on Thursday, with the booking link.",
    "Air conditioning checks before the summer, with the starting price.",
    "New opening hours on Saturdays.",
  ],
  photoTips: [
    {
      title: "The bays, with a car on the lift",
      text: "Tidy tools, good light, no customer's number plate in focus. It shows the work happens in a proper workshop.",
    },
    {
      title: "The team in work clothes",
      text: "The person who will look under the bonnet, with their say so. Names come from your team list.",
    },
    {
      title: "The front, the sign and where to park",
      text: "Google says an outside photo helps customers recognise the place when they come. Add one of the parking, so a driver knows where to leave the car.",
    },
  ],
  holidays: [
    {
      when: "UK: bank holiday Mondays in 2027",
      text: "Monday 3 May, Monday 31 May and Monday 30 August in England and Wales. Say on Google if the workshop opens and until what time the keys can be collected.",
    },
    {
      when: "Eid al-Fitr, UAE",
      text: "1 to 3 Shawwal, set by the moon. Special hours go on Google, with the day the garage takes cars again.",
    },
    {
      when: "Ramadan, UAE",
      text: "Private sector working hours fall by two hours a day for the month, so check the garage's key collection time against the shorter day.",
    },
    {
      when: "UK: Christmas week 2027",
      text: "Christmas Day is a Saturday, so the bank holidays fall on Monday 27 and Tuesday 28 December. Put them on Google in November, with the last day for drop offs.",
    },
  ],
  faqs: [
    {
      q: "What does Kabsi say when a customer claims the repair was not done properly?",
      a: "It writes a calm reply that never admits fault and never argues. In the UK the law says a trader must perform a service with reasonable care and skill.",
    },
    {
      q: "Will Kabsi write prices into a post?",
      a: "Only the prices you give it. Kabsi never invents a price, an offer or a discount, and you approve each post before it goes out.",
    },
    {
      q: "I come to the customer's car. What does my profile show?",
      a: "Google says a business that serves customers at their location should have one profile and hide its address. Your profile then shows the area you serve.",
    },
    {
      q: "Where does the review QR code go in a garage?",
      a: "Where customers pay and collect keys, on the invoice, and in the message that says the car is ready. Ask every customer the same way.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "someone-changed-my-business-info-on-google"],
};

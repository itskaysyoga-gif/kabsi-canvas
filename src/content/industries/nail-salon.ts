import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/nail-salon.md, noindex until lane R approves it. Polish Room is invented
// (Example). Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const nailSalon: Industry = {
  slug: "nail-salon",
  hub: "beauty-and-wellness",
  name: "nail salon",
  plural: "Nail and beauty salons",
  finished: false,
  lead: "Kabsi keeps your set prices and service menu right on Google, replies to reviews that name the technician, and turns your best nail photos into posts. You approve each one on WhatsApp.",
  keyword: "nail salon",
  example: {
    business: "Polish Room",
    city: "Dubai",
    kind: "salon",
    rival: "Velvet Nails",
    rival2: "Gloss Beauty Lounge",
    near: ["Near the mall entrance", "By the community park"],
  },
  photos: [PHOTOS.nailTechnician, PHOTOS.nailDesk],
  focus: "50% 50%",
  searches: [
    "nail salon",
    "nail salon near me",
    "beauty salon",
    "manicure",
    "gel nails",
    "acrylic extensions",
    "pedicure",
    "lash extensions",
    "nail art",
  ],
  tasks: [
    {
      title: "Put a price beside every set, fill and removal",
      text: "Gel manicure, acrylic set, infill, soak off, pedicure, lash lift. Google gives each service its own price and description. Keep the price out of the name: Google rejects a custom name that has one.",
    },
    {
      title: "Thank the technician who did the set",
      text: "'Noor did my set and it lasted.' The reply thanks the client and passes it to Noor. Kabsi uses only the technician names you list.",
    },
    {
      title: "Make the Book button open the right page",
      text: "Google lets you add your own booking link. It should open your nail booking page, not your home page. When you change booking tool, tell Kabsi and the link changes.",
    },
    {
      title: "Post the new set, not last season's",
      text: "A seasonal colour, a chrome set, a lash lift added to the menu. An update post is for that. An offer or an event is a separate kind of post.",
    },
    {
      title: "Send photos that look like the real nails",
      text: "Google asks for photos without significant alterations or excessive filters. Take the hand from above in daylight and send it on WhatsApp. Kabsi checks it before it becomes a post.",
    },
  ],
  categories: {
    primary: "Nail salon",
    more: ["Beauty salon"],
    note: "Google's own example of choosing the specific category is 'Nail salon' instead of 'Salon'. Add 'Beauty salon' only if you also do lashes, brows or facials in the salon. You cannot create a category of your own, such as 'nail bar'.",
  },
  reviewThemes: [
    {
      theme: "The set that lasted",
      text: "A client says her gel held for three weeks. The reply thanks her and names the technician. It promises nothing about how long a set lasts for the next client.",
    },
    {
      theme: "A nail that lifted within days",
      text: "The reply is calm and asks her to get in touch through the details on the profile. It promises a free redo only if you have said so.",
    },
    {
      theme: "A reaction or an infection",
      text: "This is a health review. Kabsi sends it to you with no draft and a way to reach a person, and nothing about it is replied to in public until you write it.",
    },
    {
      theme: "Extras that were not in the quote",
      text: "Nail art, removal, a repair. The reply points to the price list on the profile once and does not argue about the bill.",
    },
  ],
  story: {
    title: "A photo from the desk becomes a post.",
    lead: "You send the photo, Kabsi checks it and writes the post, and you say yes. Nothing reaches Google before that.",
    lines: [
      {
        from: "owner",
        text: "Photo sent: chrome set by Noor, 180 dirhams, about 90 minutes.",
      },
      {
        from: "kabsi",
        text: "Polish Room: I checked the photo. It is in focus and shows the nails, not a face. Ready: a post, 'Chrome sets by Noor, from 180 dirhams, about 90 minutes. Book on our page.' Reply Yes to post.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Sent to Google. I check that the post shows on your profile, then tell you.",
      },
    ],
  },
  posts: [
    "A new seasonal colour, with the technician and the price.",
    "A cancellation this afternoon, with your booking link.",
    "Lash lifts now on the menu, with the starting price.",
    "Hours for the long weekend and the last appointment.",
  ],
  photoTips: [
    {
      title: "The hand, from straight above",
      text: "Daylight, a plain surface and no heavy filter. Google asks for photos in focus and well lit, and the colour in the photo has to be the colour on the nail.",
    },
    {
      title: "The station and the colour wall",
      text: "A new client wants to see where she will sit and how many colours there are. One wide photo covers both.",
    },
    {
      title: "The way in",
      text: "Salons on an upper floor or inside a mall are easy to walk past. A photo of the door and the lift sign saves a call.",
    },
  ],
  holidays: [
    {
      when: "Eid al-Fitr, UAE",
      text: "The UAE gives it as 1 to 3 Shawwal, four days, and counts day 30 of Ramadan as a holiday when the month has 30 days. The moon decides, so Kabsi asks five days ahead and you answer with your hours.",
    },
    {
      when: "Hijri New Year and the Prophet's birthday, UAE",
      text: "Public holidays on 1 Muharram and 12 Rabi' Awwal. Both follow the moon, so the exact day is confirmed late. Special hours go on Google as soon as you know.",
    },
    {
      when: "UK: the May bank holidays",
      text: "In 2027 the early May holiday is Monday 3 May and the spring holiday is Monday 31 May in England and Wales. Post the days you open and the last appointment.",
    },
    {
      when: "UK: Christmas week 2027",
      text: "Christmas Day falls on a Saturday and Boxing Day on a Sunday, so the bank holidays move to Monday 27 and Tuesday 28 December. Put your closed days on Google in November.",
    },
  ],
  faqs: [
    {
      q: "Will Kabsi change my prices on Google without asking?",
      a: "No. Kabsi prepares the change and sends it to you on WhatsApp. Nothing reaches Google until you reply Yes, and you can edit the words first.",
    },
    {
      q: "A client says she had a reaction. What happens to that review?",
      a: "Health reviews go to you with no draft and a way to reach a person at Kabsi. A reply to a review like that is yours to write.",
    },
    {
      q: "Can Kabsi answer the clients who message my salon on WhatsApp?",
      a: "No. Kabsi's WhatsApp chat is between Kabsi and you. It does not message your clients, and it never receives a client's number.",
    },
    {
      q: "Can I make a category called 'nail bar'?",
      a: "No. Google does not let a business create its own category. Pick 'Nail salon' from Google's list, which is the example Google itself gives of choosing the specific one.",
    },
  ],
  guides: ["how-to-choose-your-primary-category", "how-to-reply-to-google-reviews"],
};

import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Finished page (model 1 of 3). Rose Lane Salon, Dubai, is Home's salon example too. Every business is invented.
export const hairSalon: Industry = {
  slug: "hair-salon",
  hub: "beauty-and-wellness",
  name: "hair salon",
  plural: "Hair salons",
  finished: true,
  lead: "Kabsi drafts a reply to every review that names a stylist, keeps your services and booking link right, and gets your Eid and wedding season hours on Google before the rush. You approve each one on WhatsApp.",
  keyword: "hair salon",
  example: {
    business: "Rose Lane Salon",
    city: "Dubai",
    kind: "salon",
    rival: "Juniper Hair Studio",
    rival2: "Lark Salon",
    near: ["Near the metro station", "By the park"],
  },
  photos: [PHOTOS.salonWash, PHOTOS.salonTablet],
  focus: "30% 50%",
  searches: [
    "hair salon near me",
    "ladies salon",
    "balayage",
    "keratin treatment",
    "hair colour specialist",
    "bridal hair",
    "blow dry",
    "hair salon open now",
  ],
  tasks: [
    {
      title: "Reply to reviews that name your stylists",
      text: "Salon reviews are personal: 'Hana did my colour'. Each reply thanks the client and passes the words on to the stylist they named, so the team sees it too.",
    },
    {
      title: "Keep the service menu and prices current",
      text: "Google lets a salon list services with a price and a short description. When a price changes or a stylist starts doing extensions, the list changes the same week.",
    },
    {
      title: "Keep the booking link pointing at your booking page",
      text: "Many clients book straight from the profile. When you move to a new booking page, one message to Kabsi changes the link on Google.",
    },
    {
      title: "Set hours for Eid, Ramadan and the wedding season",
      text: "Salons open late before Eid and close on the first day. Special hours go on Google a week ahead, so nobody walks to a closed door or misses the late slots.",
    },
    {
      title: "Add fresh photos of real work",
      text: "Colour, cuts and styling from this month, the room and the front door. Photos you send on WhatsApp are prepared and posted once you say yes.",
    },
  ],
  categories: {
    primary: "Hair salon",
    more: ["Beauty salon", "Hairdresser", "Hair extension technician"],
    note: "The first category tells Google what you are. Add the others only for work you really do in the salon.",
  },
  reviewThemes: [
    {
      theme: "The stylist by name",
      text: "Clients name the person who did their hair. A reply that names them back reads as real.",
    },
    {
      theme: "The colour matched the picture",
      text: "Or it did not. A calm reply that offers a call fixes more than a long one in public.",
    },
    {
      theme: "Waiting past the booked time",
      text: "The most common complaint in a busy salon. Say sorry for the wait; do not invent a reason.",
    },
    {
      theme: "The price on the day",
      text: "When the bill was more than the quote. Explain how long or thick hair is priced, once.",
    },
  ],
  story: {
    title: "Eid week, sorted in four messages.",
    lead: "Kabsi asks before a busy date, you answer in a line, and your hours and a post are ready for your yes.",
    lines: [
      {
        from: "kabsi",
        text: "Rose Lane Salon: Eid is next week. Your Google profile shows your normal hours. Are you open? Send your hours and I set them.",
      },
      { from: "owner", text: "Closed day 1. Days 2 and 3, 12 to 10." },
      {
        from: "kabsi",
        text: "Ready: day 1 closed, days 2 and 3 open 12 to 10. And a post: 'Eid appointments are open from day 2, until 10 at night. Book on our page.' Reply Yes for both.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Hours set and the post is live on your Google profile. I check again the day before Eid.",
      },
    ],
  },
  posts: [
    "A chair free on Thursday afternoon, for the clients who message first.",
    "A new stylist joins: their name, what they love doing, the days they work.",
    "Before and after of a colour correction, with the client's permission.",
    "Late opening before Eid, with the booking link.",
  ],
  photoTips: [
    {
      title: "Work from this month",
      text: "Colour and cuts in daylight, close enough to see the finish. Ask the client before a face is shown.",
    },
    {
      title: "The room and the chairs",
      text: "First-time clients want to see where they will sit, and how busy it is.",
    },
    {
      title: "The door from the street",
      text: "In a mall or a tower, a photo of the entrance saves a lost client ten minutes.",
    },
  ],
  holidays: [
    {
      when: "Eid al-Fitr and Eid al-Adha",
      text: "The busiest days before, closed or short hours on the first day. Hours and a booking post go up a week ahead.",
    },
    {
      when: "Ramadan",
      text: "Many salons open later and stay open past midnight. One set of Ramadan hours covers the month.",
    },
    {
      when: "Wedding season",
      text: "Bridal and party hair books out early. A post when the season's dates open.",
    },
    {
      when: "UK: Christmas and New Year",
      text: "Party season fills December. Christmas Day, Boxing Day and New Year's Day hours go on Google in November.",
    },
  ],
  faqs: [
    {
      q: "Will the replies sound like my salon?",
      a: "They use your clients' words and your stylists' names, and nothing you did not say. You can edit any reply before it goes out.",
    },
    {
      q: "Can Kabsi post photos of my clients?",
      a: "Only photos you send, and only after you say yes. When a client's face is in the photo, ask them first.",
    },
    {
      q: "My booking system already asks for reviews. Do I still need Kabsi?",
      a: "Keep it. Kabsi replies to the reviews that come in, keeps your hours, services and booking link right, and posts for you. It does not message your clients.",
    },
    {
      q: "Some reviews are about a stylist who left. What then?",
      a: "Kabsi drafts a reply that thanks the client without promising they can book that stylist again. You decide the words.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "how-to-set-holiday-hours-on-google"],
};

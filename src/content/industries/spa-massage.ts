import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/spa-and-massage.md, noindex until lane R approves it. Stillwater Spa is
// invented (Example). Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const spaMassage: Industry = {
  slug: "spa-and-massage",
  hub: "beauty-and-wellness",
  name: "spa",
  plural: "Spas and massage",
  finished: false,
  lead: "Kabsi puts each treatment on Google with its length and price, drafts calm replies that never describe a client's body, and has holiday hours ready before the long weekend. You approve each one on WhatsApp.",
  keyword: "spa",
  example: {
    business: "Stillwater Spa",
    city: "Dubai",
    kind: "spa",
    rival: "Lotus Day Spa",
    rival2: "Quiet Hands Massage",
    near: ["Near the beach road", "By the hotel district"],
  },
  photos: [PHOTOS.massageTherapist, PHOTOS.spaFacial],
  focus: "50% 50%",
  searches: [
    "spa",
    "massage",
    "massage near me",
    "massage spa",
    "couples massage",
    "deep tissue massage",
    "hot stone massage",
    "facial treatment",
    "spa day package",
    "moroccan bath",
  ],
  tasks: [
    {
      title: "Put each treatment on the menu with its length and price",
      text: "Aromatherapy massage, deep tissue, a cleansing facial. Google can show a service with a price and a description, and real spa profiles on Google list the minutes and the price range for each massage.",
    },
    {
      title: "Link the page where people book",
      text: "Some profiles on Google show a booking button and an 'Online scheduling' line. Yours can too, once the link points at your own booking page. When the page moves, one message changes the link.",
    },
    {
      title: "Reply to the calm reviews, hand over the sensitive ones",
      text: "Praise gets a reply that thanks the client and passes the words to the therapist. A review about pain or an injury after a treatment comes to you with no draft.",
    },
    {
      title: "Post the package with its dates",
      text: "A couples package before a long weekend is an offer post. Google puts a View Offer button on it, and the dates tell people when it ends.",
    },
    {
      title: "Keep the room looking like the room",
      text: "A clean, lit photo of the treatment room and a walk through that lasts no more than 30 seconds. Google accepts video of that length, up to 75 MB, at 720p or higher.",
    },
  ],
  categories: {
    primary: "Massage spa",
    more: ["Day spa"],
    note: "Both names are ones Google shows under real spa profiles. Choose the one that matches the main thing you sell. Google's advice is not to add a category for every treatment but a few for the departments you really run.",
  },
  reviewThemes: [
    {
      theme: "The therapist's hands",
      text: "A client praises the pressure or the care. The reply thanks her and passes it on to the therapist. It does not repeat what the treatment did for her body.",
    },
    {
      theme: "The room, the quiet, the scent",
      text: "The atmosphere is the product. The reply picks one thing the writer said and gives it back in a line.",
    },
    {
      theme: "A session that started late or ended short",
      text: "The reply says sorry once and states no minutes it cannot confirm. It asks the client to get in touch through the details on the profile.",
    },
    {
      theme: "Pain or an injury after a treatment",
      text: "This is a health review. It comes to you with no draft and a route to a person at Kabsi, and the reply is yours to write.",
    },
  ],
  story: {
    title: "National Day, with an offer, in four messages.",
    lead: "Kabsi asks before the holiday, you answer once, and the hours and the offer wait for your yes.",
    lines: [
      {
        from: "kabsi",
        text: "Stillwater Spa: National Day is on 2 and 3 December. Your Google profile shows normal hours. Are you open?",
      },
      {
        from: "owner",
        text: "Open both days, 10 to 8. Couples package 20 percent off until 3 December.",
      },
      {
        from: "kabsi",
        text: "Ready: special hours for 2 and 3 December, 10 to 8, and an offer post: 'Couples package, 20 percent off until 3 December. Book on our page.' Reply Yes for both.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Sent to Google. I check that the hours and the offer show on your profile, then tell you.",
      },
    ],
  },
  posts: [
    "A couples package with its end date and your booking link.",
    "A new treatment, how long it takes and the starting price.",
    "Opening hours for the long weekend.",
    "A quiet weekday morning with a short treatment and a place free.",
  ],
  photoTips: [
    {
      title: "The treatment room, empty and lit",
      text: "Table made up, towels folded, lights low but enough for the camera. Never a client on the table: Kabsi flags a photo where a face is the main subject.",
    },
    {
      title: "A short walk through",
      text: "From the door to the room in under 30 seconds. Google takes video up to 30 seconds long.",
    },
    {
      title: "Reception and the way in",
      text: "A spa inside a hotel or a tower is hard to find. A photo of the entrance and the sign by the lift helps a first visit.",
    },
  ],
  holidays: [
    {
      when: "UAE National Day, 2 and 3 December",
      text: "A public holiday of two days. Put special hours on Google a few days ahead and give any package an end date.",
    },
    {
      when: "Arafah Day and Eid al-Adha, UAE",
      text: "Arafah Day is 9 Dhu al-Hijjah and Eid al-Adha runs 10 to 12 Dhu al-Hijjah, four days in all. The moon sets them, so say which days you open as soon as they are announced.",
    },
    {
      when: "UK: Christmas and New Year 2026",
      text: "Christmas Day is Friday 25 December, the Boxing Day holiday moves to Monday 28 December and New Year's Day is Friday 1 January 2027. Hours for all three go on Google in the first week of December.",
    },
    {
      when: "UK: the summer bank holiday",
      text: "Monday 30 August in 2027 in England and Wales. A post with your opening hours for the weekend is enough.",
    },
  ],
  faqs: [
    {
      q: "Can Kabsi say what a treatment does for the body?",
      a: "No. Kabsi writes only the facts you give it: the treatment, how long it takes and the price. It does not invent a benefit.",
    },
    {
      q: "Does Kabsi connect to my booking system?",
      a: "No. Kabsi has Manager access to your Google profile only. It does not see your bookings or your clients. It can keep the booking link on Google right.",
    },
    {
      q: "My spa opens later in Ramadan. How does Google show that?",
      a: "You send Kabsi the hours and it prepares them as special hours, so your regular hours stay as they are. You approve them first.",
    },
    {
      q: "What if I want to remove Kabsi?",
      a: "You can remove Kabsi any time. On Google: your profile, Business Profile settings, People and access, Kabsi Clients, Remove. Kabsi loses access at once.",
    },
  ],
  guides: ["how-to-choose-your-primary-category", "how-to-set-holiday-hours-on-google"],
};

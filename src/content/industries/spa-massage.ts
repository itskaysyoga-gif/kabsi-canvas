import { PHOTOS } from "@/components/kabsi/photos";
import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/spa-and-massage.md, approved by lane R on 27 Oct 2026 (brief section 18). Stillwater Spa is
// invented (Example). Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const spaMassage: Industry = {
  slug: "spa-and-massage",
  name: "spa",
  plural: "Spas and massage",
  finished: true,
  lead: "Each treatment on Google with length and price, calm replies, holiday hours ready. You approve each one.",
  keyword: "spa",
  example: {
    business: "Stillwater Spa",
    city: "Dubai",
    kind: "spa",
    rival: "Lotus Day Spa",
    rival2: "Quiet Hands Massage",
    near: ["Near the beach road", "By the hotel district"],
  },
  photos: [PHOTOS.massageTherapist, MORE_PHOTOS.spaFacialTall],
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
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/spa-and-massage.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Each treatment, length and price",
      text: "Google can show a service with a price and description. Spa profiles add minutes.",
    },
    {
      title: "The booking link",
      text: "Your own booking page. Check the link on Google whenever it moves.",
    },
    {
      title: "Packages as offer posts",
      text: "Google puts a View Offer button on an offer. Give it an end date.",
    },
    {
      title: "The room on video",
      text: "A walk through of up to 30 seconds, 75 MB, at 720p or higher.",
    },
  ],
  reviews: [
    {
      title: "The therapist's hands",
      text: "The reply thanks her, passes it on, and never says what the treatment did.",
    },
    {
      title: "A session late or short",
      text: "Sorry once, no minutes it cannot confirm, and a way to get in touch.",
    },
    {
      title: "Pain or injury after treatment",
      text: "No draft: a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Massage spa",
    more: ["Day spa"],
    line: "Both show on real spa profiles. Choose the one for what you mainly sell, not one per treatment.",
  },
  holidays: [
    {
      title: "UAE National Day",
      text: "2 and 3 December. Special hours a few days ahead, packages with an end date.",
    },
    {
      title: "Arafah Day and Eid al-Adha",
      text: "9 to 12 Dhu al-Hijjah, set by the moon. Say your days once announced.",
    },
    {
      title: "UK Christmas and New Year",
      text: "Christmas Day 25 December 2026, Boxing Day moved to Monday 28, New Year 1 January.",
    },
  ],
  photoCards: [
    {
      title: "The treatment room, empty and lit",
      text: "Table made up, towels folded, never a client. Kabsi checks light and focus, not faces.",
    },
    {
      title: "Reception and the way in",
      text: "In a hotel or tower, a photo of the entrance and lift sign helps.",
    },
    {
      title: "Post ideas",
      text: "A couples package with an end date, a new treatment, long weekend hours.",
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
  page: {
    query: "spa Google Business Profile",
    title: "Spa Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your spa Google Business Profile: treatments clear, calm replies to every review, Eid and holiday hours asked in time, posts for your yes.",
    h1: "Your spa on Google, calm and current.",
    mark: "calm and current.",
    line: "Kabsi keeps your spa Google Business Profile current: treatments clear, holiday hours set, calm replies ready for your yes.",
    card: "Treatments clear, holiday hours set in time.",
    answer:
      "Kabsi keeps your spa Google Business Profile current: a calm reply to every review, holiday hours asked ahead, photos as posts, all for your yes.",
    watch: {
      business: "Stillwater Spa, Dubai",
      line: "Holiday hours differ from your week. Kabsi asks before each one and checks Google shows what you chose.",
      fields: ["Opening hours", "Special hours", "Phone", "Website", "Description"],
      what: "Eid al-Fitr, day 1",
      google: "Normal hours",
      owner: "14:00 to 23:00",
      message: "Google shows normal hours on the first day of Eid. You told me 14:00 to 23:00.",
    },
    post: {
      owner: "New hot stone ritual, 90 minutes.",
      quote: "New this month: our 90 minute hot stone ritual. Ask at reception or book online.",
    },
    jobs: [
      {
        title: "Holiday hours, asked ahead",
        text: "Before Eid and public holidays, Kabsi asks and sets your answer once you say yes.",
      },
      { title: "Calm replies", text: "Replies never describe what a treatment does for the body." },
      {
        title: "Treatments, as posts",
        text: "A photo of the room and a line become a post for your yes.",
      },
    ],
    nearby: { kind: "spa", term: "spa" },
    ai: {
      question: "Which spa in Jumeirah, Dubai is open late during Ramadan?",
      answer:
        "Stillwater Spa in Jumeirah is open until 1 am during Ramadan, with treatments from 60 minutes.",
      sources: ["Stillwater Spa's Google profile", "Stillwater Spa's website"],
    },
    related: [
      "nail-salon",
      "lash-and-brow-studio",
      "physiotherapy",
      "yoga-and-pilates-studio",
      "hair-salon",
      "medical-and-aesthetic-clinic",
    ],
  },
  faqs: [
    {
      q: "Can Kabsi say what a treatment does for the body?",
      a: "No. Kabsi writes only the facts you give it: the treatment, how long it takes and the price. It does not invent a benefit.",
    },
    {
      q: "Does Kabsi connect to my booking system?",
      a: "No. Kabsi has Manager access to your Google profile only, not your bookings or clients. Check the booking link on Google when your page moves.",
    },
    {
      q: "My spa opens later in Ramadan. How does Google show that?",
      a: "You send Kabsi the hours and it prepares them as special hours, so your regular hours stay as they are. You approve them first.",
    },
    {
      q: "What if I want to remove Kabsi?",
      a: "You can remove Kabsi any time. On Google: your profile, Business Profile settings, People and access, Kabsi Clients, Remove. Kabsi loses access at once.",
    },
    {
      q: "Can Kabsi reply to a review that complains about a therapist?",
      a: "If it names the therapist, it comes with no draft and a short checklist. Kabsi writes a neutral holding reply only if you ask.",
    },
  ],
  guides: [
    "how-to-set-holiday-hours-on-google",
    "how-to-reply-to-google-reviews",
    "add-services-and-prices-to-google",
  ],
};

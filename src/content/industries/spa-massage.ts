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
  tasks: [
    {
      title: "Put each treatment on the menu with its length and price",
      text: "Aromatherapy massage, deep tissue, a cleansing facial. Google can show a service with a price and a description, and real spa profiles on Google list the minutes and the price range for each massage.",
    },
    {
      title: "Link the page where people book",
      text: "Some profiles on Google show a booking button and an 'Online scheduling' line. Yours can too, once the link points at your own booking page. When the page moves, tell Kabsi and the link changes after your Yes.",
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
      text: "The reply picks one thing the writer said and gives it back in a line.",
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
      text: "Table made up, towels folded, lights low but enough for the camera. Never a client on the table: Kabsi checks light, focus and size, not faces.",
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
      "A spa is judged on its photos, its treatments and how it answers reviews. Kabsi keeps your spa Google Business Profile current: it drafts a calm reply to every review, asks about Eid and public holiday hours before they come, turns your photos into posts, and checks your details every day. Nothing reaches Google without your yes.",
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
    related: ["medical-and-aesthetic-clinic", "yoga-and-pilates-studio"],
  },
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
    {
      q: "Can Kabsi reply to a review that complains about a therapist?",
      a: "A complaint that names a therapist comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "how-to-choose-your-primary-category"],
};

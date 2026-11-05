import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the yoga studio page, written for its own trade. Every Google sentence has
// its row in docs/claims/yoga-and-pilates-studio.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Still Point Studio, Abu Dhabi, and
// every person and number here are invented (Example).
export const yogaAndPilatesStudio: Industry = {
  slug: "yoga-and-pilates-studio",
  name: "yoga studio",
  plural: "Yoga and pilates studios",
  finished: true,
  lead: "New classes as posts, your address and hours right on Google and a reply for every review. You approve each one.",
  keyword: "yoga studio",
  example: {
    business: "Still Point Studio",
    city: "Abu Dhabi",
    kind: "studio",
    rival: "Lotus Line Yoga",
    rival2: "Core Room Pilates",
    near: ["By the corniche", "Near the mall"],
  },
  photos: [MORE_PHOTOS.yogaPilatesWide, MORE_PHOTOS.yogaPilatesTall],
  searches: [
    "yoga studio near me",
    "pilates classes",
    "reformer pilates",
    "hot yoga",
    "beginner yoga",
    "prenatal yoga",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/yoga-and-pilates-studio.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Class times and the address",
      text: "Keep both exact, with special hours for holidays. Kabsi checks them against yours daily.",
    },
    {
      title: "A new class is news",
      text: "A photo with the day and time becomes a post. Never a made up offer.",
    },
    {
      title: "Thanks passed to the teacher",
      text: "A review that names Sara thanks Sara, if she is on your team list.",
    },
    {
      title: "An injury in class",
      text: "No draft, a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Yoga studio",
    more: ["Pilates studio"],
    line: "Choose the first by what most of your classes are, and add the other only if you teach it every week.",
  },
  page: {
    query: "yoga studio Google Business Profile",
    title: "Yoga studio Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your yoga studio Google Business Profile: address and hours checked daily, new classes as posts, and a reply to every review for your yes.",
    h1: "Your yoga and pilates studio, in balance.",
    mark: "in balance.",
    line: "Kabsi looks after your yoga studio Google Business Profile: new classes as posts, address and hours right, replies ready.",
    card: "New classes as posts, address and hours right.",
    answer:
      "A yoga studio Google Business Profile shows where and when you teach. Kabsi checks address and hours daily, and prepares posts and replies.",
    watch: {
      business: "Still Point Studio, Abu Dhabi",
      line: "After a move, the old address can stay on Google. Kabsi checks your address and hours every day.",
      fields: ["Address", "Opening hours", "Special hours", "Website", "Main category"],
      what: "Address",
      google: "Your old studio",
      owner: "Your new studio",
      message: "Google still shows your old studio's address. You told me the new one.",
    },
    post: {
      owner: "Reformer pilates for beginners, Tuesdays at 7 pm from next week.",
      quote:
        "Reformer pilates for beginners, every Tuesday at 7 pm from next week. Book your place.",
    },
    jobs: [
      {
        title: "New classes, as posts",
        text: "A photo and the class time become a post for your yes.",
      },
      {
        title: "Address and hours, checked daily",
        text: "When Google shows something else, you choose which stays.",
      },
      {
        title: "Replies that thank the teacher",
        text: "Only when the review names her, and only names on your team list.",
      },
    ],
    nearby: { kind: "studio", term: "yoga studio" },
    ai: {
      question:
        "Which studio in Al Reem Island, Abu Dhabi has beginner reformer pilates in the evening?",
      answer:
        "Still Point Studio on Al Reem Island runs beginner reformer pilates on Tuesdays at 7 pm.",
      sources: ["Still Point Studio's Google profile", "Still Point Studio's website"],
    },
    related: [
      "gym-and-fitness",
      "physiotherapy",
      "spa-and-massage",
      "nail-salon",
      "cafe",
      "florist",
    ],
  },
  faqs: [
    {
      q: "We moved studio. What does Kabsi do?",
      a: "Tell Kabsi the new address. When Google still shows the old one, Kabsi tells you, and nothing changes without your yes.",
    },
    {
      q: "Can Kabsi post our timetable?",
      a: "Kabsi can post a new class with its day and time, from what you send. Your full timetable stays on your website.",
    },
    {
      q: "What happens with a review about an injury?",
      a: "An injury is a safety matter: no draft and a short checklist. Kabsi writes a neutral holding reply only if you ask.",
    },
    {
      q: "Will a reply thank the right teacher?",
      a: "Only when the review names them and the name is on your team list. Kabsi never guesses.",
    },
    {
      q: "Does Kabsi work with my booking system?",
      a: "No. Kabsi works only with your Google profile.",
    },
  ],
  guides: [
    "google-posts-for-local-businesses",
    "keep-your-hours-and-details-the-same-everywhere",
    "how-to-reply-to-google-reviews",
  ],
};

import { PHOTOS } from "@/components/kabsi/photos";
import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/gym-and-fitness.md, approved by lane R on 27 Oct 2026 (brief section 18). Harbour Strength Studio
// is invented (Example). The gym has one photo of its own (gym-training); a second is an Open row in
// DESIGN-PROPOSAL.md. Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const gymFitness: Industry = {
  slug: "gym-and-fitness",
  name: "gym",
  plural: "Gyms and fitness studios",
  finished: true,
  lead: "Classes and trial offers as Google posts with real dates, holiday hours and replies drafted. You approve each one.",
  keyword: "gym",
  example: {
    business: "Harbour Strength Studio",
    city: "Dubai",
    kind: "gym",
    rival: "Pulse Fitness",
    rival2: "Core Box Studio",
    near: ["Near the metro station", "By the towers"],
  },
  photos: [PHOTOS.gymTraining, MORE_PHOTOS.gymTrainingTall],
  focus: "50% 45%",
  searches: [
    "gym",
    "gym near me",
    "fitness studio",
    "personal trainer",
    "ladies gym",
    "crossfit",
    "day pass gym",
    "24 hour gym",
    "pilates classes",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/gym-and-fitness.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Each class, with day and coach",
      text: "A post can carry the day, time and coach. Undated posts archive after six months.",
    },
    {
      title: "The trial, with an end date",
      text: "A free first class fits an offer post, which gets a View Offer button.",
    },
    {
      title: "The hours people really get in",
      text: "Open round the clock? Say so. Different hours for different things go in more hours.",
    },
    {
      title: "What you teach, as services",
      text: "Personal training and group classes each get a line, with a description.",
    },
  ],
  reviews: [
    {
      title: "The coach, by name",
      text: "Thanks passed on to the coach from your team list. Nothing about body or weight.",
    },
    {
      title: "Membership fees and cancelling",
      text: "No account detail in public. It asks them to get in touch through the profile.",
    },
    {
      title: "An injury in the gym",
      text: "No draft: a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Gym",
    more: [],
    line: "'Gym' shows on a real 24 hour UK gym profile. Before adding a second, read the names in your own profile; you cannot create one.",
  },
  holidays: [
    {
      title: "Ramadan, UAE",
      text: "Private sector hours drop by two a day. Settle gym hours and class times beforehand.",
    },
    {
      title: "UAE National Day",
      text: "2 and 3 December. Say if classes run, and give any offer an end date.",
    },
    {
      title: "UK: Christmas and New Year 2026",
      text: "25 December, 28 December and 1 January 2027. Add the last class of each day.",
    },
  ],
  photoCards: [
    {
      title: "The floor, with no member shown",
      text: "Wide and well lit. Kabsi checks light, focus and size, not faces, so ask first.",
    },
    {
      title: "Reception and the way up",
      text: "In a tower or upstairs? Photograph the entrance and lift sign for new members.",
    },
    {
      title: "Post ideas",
      text: "A new class and coach, a free first session with its end date, holiday hours.",
    },
  ],
  story: {
    title: "A new class and a free first session, in two messages.",
    lead: "You send the class and the offer in a line. Kabsi turns it into posts with dates, and you say yes.",
    lines: [
      {
        from: "owner",
        text: "New HIIT class, Tuesdays and Thursdays at 6.30 pm with Karim. First class free until 15 November.",
      },
      {
        from: "kabsi",
        text: "Harbour Strength Studio: ready. A post for the class: 'HIIT with Karim, Tuesdays and Thursdays at 6.30 pm.' And an offer post: 'First HIIT class free until 15 November. Book on our page.' Reply Yes for both.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Sent to Google. I check that both posts show on your profile, then tell you.",
      },
    ],
  },
  page: {
    query: "gym Google Business Profile",
    title: "Gym Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your gym Google Business Profile: classes and trial weeks as posts, holiday hours asked in time, and a reply to every review for your yes.",
    h1: "Your gym on Google, in top form.",
    mark: "in top form.",
    line: "Kabsi looks after your gym Google Business Profile: classes as posts, holiday hours asked, and replies ready for your yes.",
    card: "Classes as posts, holiday hours asked ahead.",
    answer:
      "On a gym Google Business Profile, people check hours and classes. Kabsi drafts dated class posts and every reply, and asks about holiday hours ahead.",
    watch: {
      business: "Harbour Strength Studio, Dubai",
      line: "Your main category tells people what you are. Kabsi checks it, and your hours, every day.",
      fields: ["Main category", "Opening hours", "Special hours", "Website", "Phone"],
      what: "Main category",
      google: "Sports club",
      owner: "Gym",
      message: "Google shows Sports club as your main category. You told me Gym.",
    },
    post: {
      owner: "New 6 am strength class from Sunday. First class free.",
      quote: "New: a 6 am strength class from Sunday. Your first class is free.",
    },
    jobs: [
      { title: "Classes, as posts", text: "A new class with its real dates, ready for your yes." },
      {
        title: "Holiday hours, asked ahead",
        text: "Before each public holiday, Kabsi asks and sets your answer.",
      },
      {
        title: "A reply for every review",
        text: "Coaches thanked by name only when the review names them.",
      },
    ],
    nearby: { kind: "gym", term: "gym" },
    ai: {
      question: "Which gym in Dubai Marina has a 6 am strength class?",
      answer: "Harbour Strength Studio in Dubai Marina runs a 6 am strength class every weekday.",
      sources: ["Harbour Strength Studio's Google profile", "Harbour Strength Studio's website"],
    },
    related: [
      "yoga-and-pilates-studio",
      "physiotherapy",
      "spa-and-massage",
      "barbershop",
      "tattoo-studio",
      "cafe",
    ],
  },
  faqs: [
    {
      q: "Can Kabsi post my class timetable?",
      a: "A post can carry a class's days and times. Kabsi writes it from your times and prepares a new post when they change.",
    },
    {
      q: "Is a free first week allowed on Google?",
      a: "Google has an offer post for it. It does not allow a reward for a review, like a free month for five stars.",
    },
    {
      q: "A member says she hurt herself here. What does Kabsi do?",
      a: "No draft: a short checklist comes to you. Kabsi writes a neutral holding reply only if you ask. Nothing is published until you approve.",
    },
    {
      q: "Does Kabsi see my members?",
      a: "No. Kabsi has Manager access to your Google profile only. It never connects to your membership system and never receives a member's number.",
    },
    {
      q: "Can my head coach approve posts?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything.",
    },
  ],
  guides: [
    "google-posts-for-local-businesses",
    "how-to-set-holiday-hours-on-google",
    "how-to-reply-to-google-reviews",
  ],
};

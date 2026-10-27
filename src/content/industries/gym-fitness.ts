import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/gym-and-fitness.md, approved by lane R on 27 Oct 2026 (brief section 18). Harbour Strength Studio
// is invented (Example). The gym has one photo of its own (gym-training); a second is an Open row in
// DESIGN-PROPOSAL.md. Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const gymFitness: Industry = {
  slug: "gym-and-fitness",
  hub: "fitness-and-sport",
  name: "gym",
  plural: "Gyms and fitness studios",
  finished: true,
  lead: "Kabsi puts your classes and trial offers on Google as posts with real dates, keeps your hours right for holidays, and replies to reviews that name your coaches, and never argues about a bill in public. You approve each one on WhatsApp.",
  keyword: "gym",
  example: {
    business: "Harbour Strength Studio",
    city: "Dubai",
    kind: "gym",
    rival: "Pulse Fitness",
    rival2: "Core Box Studio",
    near: ["Near the metro station", "By the towers"],
  },
  photos: [PHOTOS.gymTraining],
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
  tasks: [
    {
      title: "Post each new class with its day, time and coach",
      text: "A post can carry a class: HIIT on Tuesdays and Thursdays at 6.30 pm with Karim. An event post is for something at your business, and Google archives posts after six months unless dates are set.",
    },
    {
      title: "Run the trial or day pass as an offer with an end date",
      text: "A free first class until a set date is an offer post, and Google puts a View Offer button on it. The end date stops it from outliving the deal.",
    },
    {
      title: "Show the hours people really get in",
      text: "A gym open round the clock can say so, as a real 24 hour gym profile on Google does. If different things run at different hours, Google's more hours setting holds each apart.",
    },
    {
      title: "List what you teach as services",
      text: "Google can show a service with a description, and a real gym profile lists services such as aerobics and nutrition consulting. Personal training and group classes each get a line.",
    },
    {
      title: "Reply to coach reviews by the coach's name",
      text: "A member writes that Karim changed her training. The reply thanks her and passes it on to Karim. Kabsi uses the coach names on your team list and no others.",
    },
  ],
  categories: {
    primary: "Gym",
    more: [],
    note: "'Gym' is the name Google shows under a real 24 hour gym profile in the UK. No Google page or live profile read for this page showed a category for a boutique studio, so read the names in the box on your own profile before you add a second. A business cannot create a category.",
  },
  reviewThemes: [
    {
      theme: "The coach, by name",
      text: "A member credits Karim or Lina for her progress. The reply thanks her and passes it on to the coach, with nothing about her body or her weight.",
    },
    {
      theme: "Equipment and the changing rooms",
      text: "A broken machine, a queue for the rack, a shower that ran cold. The reply says sorry once and says nothing about repairs unless you gave Kabsi the fact.",
    },
    {
      theme: "Membership fees and cancelling",
      text: "A dispute about a fee or a freeze. The reply shows no account detail in public and asks the writer to get in touch through the profile details.",
    },
    {
      theme: "An injury in the gym",
      text: "This is a health review and may be a legal one. It comes to you with no draft and a route to a person at Kabsi, and you write the reply.",
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
  posts: [
    "A new class with its days, its time and the coach.",
    "A free first session with the date it ends and your booking link.",
    "The day pass price, in one line.",
    "Opening hours for the long weekend and the last class.",
  ],
  photoTips: [
    {
      title: "The floor and the racks, with no member in the frame",
      text: "Wide, level and well lit. Kabsi flags a photo where a member's face is the main subject, so ask before anyone is shown.",
    },
    {
      title: "The changing rooms and showers, clean and empty",
      text: "Taken at opening time, with the lockers and the showers in view.",
    },
    {
      title: "Reception and the way up",
      text: "A gym on a first floor or inside a tower is hard to find. A photo of the entrance and the lift sign helps a new member arrive.",
    },
  ],
  holidays: [
    {
      when: "Ramadan, UAE",
      text: "The UAE cuts private sector working hours by two hours a day for the month, which changes coach rotas. Settle the month's gym hours and class times before it starts.",
    },
    {
      when: "UAE National Day, 2 and 3 December",
      text: "Two public holidays. Say on Google whether the gym opens and whether classes run, and give any holiday offer an end date.",
    },
    {
      when: "UK: Christmas and New Year 2026",
      text: "Christmas Day is Friday 25 December, Boxing Day moves to Monday 28 December and New Year's Day is Friday 1 January 2027. Put the hours of all three on Google, with the last class of each day.",
    },
    {
      when: "UK: the Easter weekend 2027",
      text: "Good Friday is 26 March and Easter Monday 29 March in England and Wales. A post says which classes run.",
    },
  ],
  faqs: [
    {
      q: "Can Kabsi post my class timetable?",
      a: "A post can carry the days and times of a class. Kabsi writes it from the times you give it, and prepares a new post when they change.",
    },
    {
      q: "Is a free first week allowed on Google?",
      a: "Google has an offer post for it. What Google does not allow is an incentive in return for a review, such as a free month for a five star one.",
    },
    {
      q: "A member says she hurt herself here. What does Kabsi do?",
      a: "It sends the review to you with no draft and a route to a person at Kabsi. Nothing is published until you write a reply and approve it.",
    },
    {
      q: "Does Kabsi see my members?",
      a: "No. Kabsi has Manager access to your Google profile only. It never connects to your membership system and never receives a member's number.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "how-to-set-holiday-hours-on-google"],
};

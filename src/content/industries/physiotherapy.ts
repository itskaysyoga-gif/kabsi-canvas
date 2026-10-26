import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/physiotherapy.md, noindex until lane R approves it. Motion Works Physio is
// invented (Example). Health rules from master plan 30.15 section 3.7 apply: no draft for a review that names an
// injury or a result, no patient details. Every fact on this page has a row in the claim sheet.
export const physiotherapy: Industry = {
  slug: "physiotherapy",
  hub: "health",
  name: "physiotherapy clinic",
  plural: "Physiotherapy",
  finished: false,
  lead: "Kabsi keeps your physios, what you treat and the first assessment link right on Google, and replies to reviews without naming an injury or confirming a patient. You approve each one on WhatsApp.",
  keyword: "physio",
  example: {
    business: "Motion Works Physio",
    city: "Manchester",
    kind: "clinic",
    rival: "Peak Physio",
    rival2: "Back in Balance",
    near: ["Near the sports centre", "By the tram stop"],
  },
  photos: [PHOTOS.physioStretch, PHOTOS.physioBack],
  focus: "50% 45%",
  searches: [
    "physio",
    "physiotherapist",
    "physio near me",
    "sports massage",
    "back pain physio",
    "knee rehab",
    "sports injury clinic",
    "physio home visit",
    "dry needling",
  ],
  tasks: [
    {
      title: "Say what you treat, in the words people type",
      text: "Back pain, a stiff neck, knee rehab, sports injuries. Google can show a service with a description, and real physio profiles list conditions by name.",
    },
    {
      title: "Open the first assessment from the Book button",
      text: "Google lets you add your own booking link. It should open the first assessment page. When the page changes, tell Kabsi and the link follows.",
    },
    {
      title: "Reply without naming an injury or confirming a patient",
      text: "A public reply thanks the writer and never repeats an injury, a treatment or a visit date. A review that describes pain or a result comes to you with no draft.",
    },
    {
      title: "Set home visit hours apart from clinic hours",
      text: "A physio who only treats at the client's home keeps one profile for the area and hides the address. A clinic that also visits homes sets those hours apart, with Google's more hours setting.",
    },
    {
      title: "Name only the people on your team list",
      text: "In the UK the titles of the health professions are protected by law, and a physiotherapy clinic's services must be provided by professionals on the HCPC register. Kabsi uses only the names you list.",
    },
  ],
  categories: {
    primary: "Physical therapist",
    more: [],
    note: "Searches say 'physio', but the category Google shows on real physiotherapy profiles is 'Physical therapist'. You pick it from Google's list, because a business cannot create a category. Add a second only for a department you really run.",
  },
  reviewThemes: [
    {
      theme: "The physio who explained the plan",
      text: "A patient says she finally understood her exercises. The reply thanks her and passes it to the team, with no mention of the injury.",
    },
    {
      theme: "Pain that did not improve",
      text: "This is a health review. It comes to you with no draft and a route to a person at Kabsi. The reply is yours to write and stays out of a public argument.",
    },
    {
      theme: "Times, parking and the waiting room",
      text: "A practical review gets a short reply that points to the hours and directions on the profile.",
    },
    {
      theme: "Insurance and receipts",
      text: "A review about a claim or a bill gets no detail in public. The reply invites the writer to contact the clinic.",
    },
  ],
  story: {
    title: "A message to send after a session, ready in one reply.",
    lead: "Kabsi writes the words and the review link. Your team forwards them after a real visit. Kabsi never sees a patient's number.",
    lines: [
      {
        from: "owner",
        text: "Can you write something my physios can send after a session?",
      },
      {
        from: "kabsi",
        text: "Motion Works Physio: here is a message to forward after a real visit. 'Thank you for coming. If you have a minute, a review on Google helps other people find us: [your review link]'. Send it to every patient the same way.",
        buttons: ["Edit", "Skip"],
      },
      { from: "owner", text: "Edit: shorter please" },
      {
        from: "kabsi",
        text: "Shorter: 'Thanks for coming to Motion Works Physio. A review on Google helps others find us: [your review link]'. Google does not allow a gift or a discount in return for a review, and I never receive a patient's number.",
      },
    ],
  },
  posts: [
    "An evening clinic on Thursdays, with the booking link.",
    "A new physio joins: their qualifications and the days they work.",
    "Home visits now cover these areas, with the phone number.",
    "Opening hours for the bank holiday weekend.",
  ],
  photoTips: [
    {
      title: "The treatment room and the exercise area",
      text: "Couches made up, equipment tidy, no patient in the frame. Kabsi flags any photo where a face is the main subject.",
    },
    {
      title: "The physios in clinic clothes",
      text: "A patient wants to know who they will meet. Take it in good light and ask each physio first.",
    },
    {
      title: "The way in, step free or not",
      text: "A photo of the door and the ramp or the stairs. Profiles on Google can also show accessibility details, such as a wheelchair accessible restroom.",
    },
  ],
  holidays: [
    {
      when: "UK: the late May and August bank holidays",
      text: "In England and Wales the spring holiday is Monday 31 May 2027 and the summer holiday Monday 30 August 2027. Put hours on Google and say in a post who covers urgent bookings.",
    },
    {
      when: "Eid al-Fitr, UAE",
      text: "1 to 3 Shawwal, set by the moon. A clinic closed for the days says on Google when it opens again.",
    },
    {
      when: "UAE National Day, 2 and 3 December",
      text: "Two public holidays. Special hours go on a few days ahead, and the booking page should show no appointments on those days.",
    },
    {
      when: "Part of a day, not all of it",
      text: "A clinic that closes at noon before a holiday sets special hours for that day alone. Google's hours for the rest of the week stay as they are.",
    },
  ],
  faqs: [
    {
      q: "Can Kabsi say how many sessions a patient needs?",
      a: "No. Kabsi writes only the facts you give it, such as what you treat, when you open and what a first assessment costs. It makes no promise about results.",
    },
    {
      q: "Does Kabsi see patient notes or bookings?",
      a: "No. Kabsi has Manager access to your Google profile only. It never connects to your clinic system and never sends patient details on WhatsApp.",
    },
    {
      q: "Does my profile need to say whether a GP referral is needed?",
      a: "Tell Kabsi your rule and it goes into a post, which you approve. The NHS says some people can get NHS physiotherapy without a GP referral, so patients may ask.",
    },
    {
      q: "Can I give a free assessment to anyone who leaves a review?",
      a: "No. Google does not allow free or discounted services in return for a review. Ask every patient the same way.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "how-to-get-more-google-reviews"],
};

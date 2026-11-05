import { PHOTOS } from "@/components/kabsi/photos";
import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Finished page (model 3 of 3). Parkside Dental is invented (Example). Health rules from master plan 30.15
// section 3.7: a review that mentions treatment comes with no draft and a route to a person, and no patient
// details are ever sent on WhatsApp.
export const dentalClinic: Industry = {
  slug: "dental-clinic",
  name: "dental clinic",
  plural: "Dental clinics",
  finished: true,
  lead: "Clinic hours and phone right on Google, and careful replies that never confirm a patient. You approve each one.",
  keyword: "dentist",
  example: {
    business: "Parkside Dental",
    city: "Dubai",
    kind: "clinic",
    rival: "Smile Clinic",
    rival2: "Northgate Dental Care",
    near: ["North of the mall", "By the school"],
  },
  photos: [MORE_PHOTOS.dentalClinicWide, PHOTOS.dentistPatient],
  focus: "50% 35%",
  searches: [
    "dentist near me",
    "emergency dentist",
    "teeth whitening",
    "dental implants",
    "children's dentist",
    "dentist open on Saturday",
    "teeth cleaning",
    "orthodontist",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/dental-clinic.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Replies that confirm no patient",
      text: "The reply thanks the writer and never repeats a treatment, name or visit.",
    },
    {
      title: "Emergency number and hours exact",
      text: "Toothache at 9 at night: the number on Google has to ring someone.",
    },
    {
      title: "Only treatments you really offer",
      text: "Keep services to what your dentists do now. Profile Coach lists what is missing.",
    },
    {
      title: "The appointment link",
      text: "It should land on your booking page, not the clinic's home page.",
    },
  ],
  reviews: [
    {
      title: "A gentle dentist",
      text: "The reply thanks nervous patients without mentioning the visit.",
    },
    {
      title: "Cost explained, or not",
      text: "A reply about a bill never argues and invites the writer to get in touch.",
    },
    {
      title: "An injury or a safety problem",
      text: "No draft: a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Dentist",
    more: ["Dental clinic", "Cosmetic dentist", "Pediatric dentist", "Emergency dental service"],
    line: "Use a specialist category only when a dentist on your team practises it, like Orthodontist.",
  },
  holidays: [
    {
      title: "Eid al-Fitr and Eid al-Adha",
      text: "If you close, special hours, and a post on what to do in an emergency.",
    },
    {
      title: "UAE National Day",
      text: "2 and 3 December. Kabsi asks five days before, and about the Saturday after.",
    },
    {
      title: "UK bank holidays",
      text: "Closed days on Google, and the urgent care line for patients in pain.",
    },
  ],
  photoCards: [
    {
      title: "The treatment room, empty",
      text: "Clean, bright and calm. Never a patient's face or mouth, even with permission.",
    },
    {
      title: "The team",
      text: "Dentists and reception in clinic clothes, so patients know who they will meet.",
    },
    {
      title: "Post ideas",
      text: "Saturday check-ups, what to do in an emergency, a new dentist joining.",
    },
  ],
  story: {
    title: "A hard review, handled with care.",
    lead: "Kabsi sends no patient details on WhatsApp. A review about treatment comes with no draft and a way to talk to a person.",
    lines: [
      {
        from: "kabsi",
        text: "Parkside Dental: a new 2-star review needs you. It describes an injury, so I have not written a reply. Read it on your Kabsi account.",
        buttons: ["Open the review", "Talk to a person"],
      },
      { from: "owner", text: "Talk to a person" },
      {
        from: "kabsi",
        text: "Rashid at Kabsi replies in working hours. Write your own reply on the Kabsi website when you are ready. Nothing is published until you say yes.",
      },
      {
        from: "kabsi",
        text: "Also ready: a reply to a 5-star review. 'Thank you for your kind words. We will pass them on to our team.' Reply Yes to publish.",
        buttons: ["Yes", "Edit", "Skip"],
      },
    ],
  },
  page: {
    query: "dental clinic Google Business Profile",
    title: "Dental clinic Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your dental clinic Google Business Profile: hours and phone right, careful replies that never confirm a patient, and posts for your yes.",
    h1: "Your dental clinic on Google, handled with care.",
    mark: "handled with care.",
    line: "Kabsi looks after your dental clinic Google Business Profile: exact hours, the right phone, and careful replies you approve.",
    card: "Exact hours, careful replies that name no patient.",
    answer:
      "Kabsi keeps your dental clinic Google Business Profile exact: hours and phone checked daily, careful replies that never confirm a patient, holiday hours asked ahead.",
    watch: {
      business: "Parkside Dental, Dubai",
      line: "A patient with toothache calls the number and trusts the hours. Kabsi checks both every day.",
      fields: ["Opening hours", "Special hours", "Phone", "Website", "Address", "Main category"],
      what: "Sunday",
      google: "Closed",
      owner: "09:00 to 17:00",
      message: "Google shows you closed on Sunday. You told me 09:00 to 17:00.",
    },
    post: {
      owner: "Our new hygienist starts in March.",
      quote: "A warm welcome to our new hygienist, who joins Parkside Dental in March.",
    },
    jobs: [
      {
        title: "Replies that name no patient",
        text: "Every draft stays general: no treatment, no details, an invitation to get in touch.",
      },
      {
        title: "Hours and phone, checked daily",
        text: "When Google shows something different, you choose which one stays.",
      },
      {
        title: "Holiday hours, asked ahead",
        text: "Before each public holiday, Kabsi asks and sets your answer once you say yes.",
      },
    ],
    nearby: { kind: "clinic", term: "dentist" },
    ai: {
      question: "Which dentist in Al Barsha, Dubai is open on Sundays?",
      answer: "Parkside Dental in Al Barsha is open on Sundays from 9 am to 5 pm.",
      sources: ["Parkside Dental's Google profile", "Parkside Dental's website"],
    },
    related: [
      "medical-and-aesthetic-clinic",
      "physiotherapy",
      "optician",
      "veterinary-clinic",
      "spa-and-massage",
      "gym-and-fitness",
    ],
  },
  faqs: [
    {
      q: "Does Kabsi see my patients' records?",
      a: "No. Kabsi has Manager access to your Google profile only. It does not connect to your clinic system and never sends patient details on WhatsApp.",
    },
    {
      q: "Why are some reviews sent without a reply?",
      a: "An injury, a safety problem or a complaint naming a team member gets no draft, a short checklist, and a holding reply only if asked.",
    },
    {
      q: "Can Kabsi ask patients for reviews?",
      a: "Kabsi never receives a patient's number. Your team gets a ready message with the review link to forward after a visit, if you choose.",
    },
    {
      q: "Should a clinic reply to reviews at all?",
      a: "Yes, a short reply shows the next patient that someone reads them. Kabsi's drafts never confirm someone is a patient, and you approve every one.",
    },
    {
      q: "Can my practice manager approve instead of me?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything.",
    },
  ],
  guides: [
    "how-to-reply-to-google-reviews",
    "someone-changed-my-hours-on-google",
    "how-to-set-holiday-hours-on-google",
  ],
};

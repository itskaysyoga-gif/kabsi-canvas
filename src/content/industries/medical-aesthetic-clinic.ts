import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/medical-and-aesthetic-clinic.md, approved by lane R on 27 Oct 2026 (brief section 18).
// Clearview Skin Clinic is invented (Example). Health rules from master plan 30.15 section 3.7 apply: no draft for a
// review about a result, no patient details, no reply that confirms who is a patient. Every fact on this page has a
// row in the claim sheet; advice and wording are marked there.
export const medicalAestheticClinic: Industry = {
  slug: "medical-and-aesthetic-clinic",
  name: "clinic",
  plural: "Medical and aesthetic clinics",
  finished: true,
  lead: "Treatments, doctors' days and consultation link right on Google, and replies that never confirm a patient. You approve everything.",
  keyword: "aesthetic clinic",
  example: {
    business: "Clearview Skin Clinic",
    city: "London",
    kind: "clinic",
    rival: "Aura Aesthetics",
    rival2: "Bayside Medical Centre",
    near: ["Near the hospital", "By the high street"],
  },
  photos: [PHOTOS.aestheticTreatment, PHOTOS.aestheticLaser],
  focus: "50% 40%",
  searches: [
    "aesthetic clinic",
    "aesthetic clinic near me",
    "skin clinic",
    "dermatologist near me",
    "laser hair removal",
    "hydrafacial",
    "acne treatment",
    "general practitioner",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/medical-and-aesthetic-clinic.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Treatments your doctors really offer",
      text: "Google can show a service with a description, and clinic profiles list them by name.",
    },
    {
      title: "The Book button",
      text: "Your own consultation page. Check the link each time you change systems.",
    },
    {
      title: "What a post can name",
      text: "UK rules: a post may promote a consultation, never name Botox or a prescription medicine.",
    },
    {
      title: "Each doctor's day, honest",
      text: "Weekly hours say when you open; a post says which doctor is in when.",
    },
  ],
  reviews: [
    {
      title: "The welcome at the front desk",
      text: "The reply passes thanks to the team and names no patient or treatment.",
    },
    {
      title: "How a treatment turned out",
      text: "A careful draft that names no treatment. A reaction or injury gets no draft.",
    },
    {
      title: "A cancelled or moved appointment",
      text: "No word that they were booked: thanks, and an invitation to get in touch.",
    },
  ],
  categories: {
    primary: "Skin care clinic",
    more: ["Medical clinic", "Dermatologist", "Laser hair removal service"],
    line: "'Medical clinic' only with a licensed doctor, 'Dermatologist' only with a registered dermatologist. Use few categories, kept specific.",
  },
  holidays: [
    {
      title: "Eid al-Adha, UAE",
      text: "Three days, 10 to 12 Dhu al-Hijjah. Point urgent problems to the Call button.",
    },
    {
      title: "Ramadan, UAE",
      text: "Private sector hours drop by two a day. Check doctors' hours against the shorter day.",
    },
    {
      title: "Closed a week or more",
      text: "Special hours suit up to 6 days closed. From 7 days, mark temporarily closed.",
    },
  ],
  photoCards: [
    {
      title: "Consultation room, screen off",
      text: "Bright, clean and calm. No details on a monitor, no one on the couch.",
    },
    {
      title: "The sign at the door",
      text: "In a tower, photos of the sign and lift button save a missed appointment.",
    },
    {
      title: "Post ideas",
      text: "A new consultation day, a new doctor, closed for Eid, how to book.",
    },
  ],
  story: {
    title: "A doctor adds a day, and the profile follows.",
    lead: "You send one message. Kabsi prepares the hours and the post with no patient detail, and you say yes.",
    lines: [
      {
        from: "owner",
        text: "Dr Rana now sees skin consultations on Thursdays too, 10 to 6.",
      },
      {
        from: "kabsi",
        text: "Clearview Skin Clinic: ready. Thursday hours 10 to 6 on your profile, and a post: 'Skin consultations with Dr Rana are now open on Thursdays too. Book on our page.' No patient names or treatments in either. Reply Yes for both.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Sent to Google. I check that the hours and the post show on your profile, then tell you.",
      },
    ],
  },
  page: {
    query: "aesthetic clinic Google Business Profile",
    title: "Aesthetic clinic Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your aesthetic clinic Google Business Profile: hours and consultation link right, replies that never confirm a patient, posts for your yes.",
    h1: "Your clinic on Google, discreet and exact.",
    mark: "discreet and exact.",
    line: "Kabsi looks after your aesthetic clinic Google Business Profile: doctors' days, the consultation link, and discreet replies you approve.",
    card: "Doctors' days exact, replies that confirm no patient.",
    answer:
      "Kabsi looks after your aesthetic clinic Google Business Profile: replies that confirm no patient, hours checked daily, doctors' days as posts for your yes.",
    watch: {
      business: "Clearview Skin Clinic, London",
      line: "Late evening clinics are easy to miss on Google. Kabsi checks the hours Google shows against yours every day.",
      fields: ["Opening hours", "Website", "Phone", "Main category", "Description"],
      what: "Wednesday",
      google: "09:00 to 17:00",
      owner: "11:00 to 20:00",
      message: "Google shows Wednesday 09:00 to 17:00. You told me 11:00 to 20:00.",
    },
    post: {
      owner: "Dr Shah adds Thursday evening consultations, until 8 pm.",
      quote: "Dr Shah now sees consultations on Thursday evenings until 8 pm. Book on our website.",
    },
    jobs: [
      {
        title: "Replies that confirm no patient",
        text: "No name, no treatment, no result. An invitation to get in touch instead.",
      },
      {
        title: "Doctors' days, as posts",
        text: "A new clinic day becomes a post, ready for your yes.",
      },
      {
        title: "Hours and links, checked daily",
        text: "When Google shows something else, you choose which stays.",
      },
    ],
    nearby: { kind: "clinic", term: "skin clinic" },
    ai: {
      question: "Which skin clinic in Marylebone, London has evening consultations?",
      answer:
        "Clearview Skin Clinic in Marylebone offers consultations until 8 pm on Wednesdays and Thursdays.",
      sources: ["Clearview Skin Clinic's Google profile", "Clearview Skin Clinic's website"],
    },
    related: [
      "dental-clinic",
      "physiotherapy",
      "optician",
      "spa-and-massage",
      "lash-and-brow-studio",
      "nail-salon",
    ],
  },
  faqs: [
    {
      q: "Will Kabsi ever put a patient's name or treatment in a reply?",
      a: "No. Drafts stay calm and general: no medical claims, no personal details and no admission of fault. Kabsi never sends patient details on WhatsApp.",
    },
    {
      q: "Can a clinic's post name Botox?",
      a: "Rules differ by country. In the UK, no: Botox is a prescription-only medicine. A consultation may be promoted, naming no prescription medicine. Not legal advice.",
    },
    {
      q: "What does the reply to a five star review say?",
      a: "It thanks the writer and says the team will hear the words. Nothing about a visit, a treatment or a date, and no names.",
    },
    {
      q: "Does Kabsi follow the privacy law of my country?",
      a: "Drafts follow a careful habit: a public reply never confirms a patient or mentions their care. Not legal advice; ask a person about privacy law.",
    },
    {
      q: "Can Kabsi post before and after photos?",
      a: "Kabsi posts only photos you send and approve, and it never writes about results. Check your country's rules on medical advertising before you send one.",
    },
  ],
  guides: [
    "how-to-reply-to-google-reviews",
    "google-posts-for-local-businesses",
    "add-services-and-prices-to-google",
  ],
};

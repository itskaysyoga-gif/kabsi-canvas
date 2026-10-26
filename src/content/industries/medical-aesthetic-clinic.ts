import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/medical-and-aesthetic-clinic.md, noindex until lane R approves it.
// Clearview Skin Clinic is invented (Example). Health rules from master plan 30.15 section 3.7 apply: no draft for a
// review about a result, no patient details, no reply that confirms who is a patient. Every fact on this page has a
// row in the claim sheet; advice and wording are marked there.
export const medicalAestheticClinic: Industry = {
  slug: "medical-and-aesthetic-clinic",
  hub: "health",
  name: "clinic",
  plural: "Medical and aesthetic clinics",
  finished: false,
  lead: "Kabsi keeps your treatments, doctors' days and consultation link right on Google, and replies to reviews without confirming who is a patient. A review about a result comes to you with no draft. You approve everything on WhatsApp.",
  keyword: "aesthetic clinic",
  example: {
    business: "Clearview Skin Clinic",
    city: "Dubai",
    kind: "clinic",
    rival: "Aura Aesthetics",
    rival2: "Bayside Medical Centre",
    near: ["Near the healthcare city", "By the main road"],
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
  tasks: [
    {
      title: "List the treatments your doctors really offer",
      text: "Laser hair removal, a photo facial, a skin consultation. Google can show a service with a description, and real clinic profiles list them by name. A treatment you stopped offering comes off the list.",
    },
    {
      title: "Reply without saying who is a patient",
      text: "A public reply never says the writer visited, what was done or when. Kabsi drafts a thank you and an invitation to get in touch through the profile details, and nothing more.",
    },
    {
      title: "Make the Book button open the consultation page",
      text: "Google lets you add your own link, and clinic profiles show a Book button to a booking page. When the page changes, tell Kabsi and the link follows.",
    },
    {
      title: "Check what a post names before it goes out",
      text: "UK advertising rules say Botox is a prescription-only medicine and cannot be advertised to the public, while a consultation can be promoted. Kabsi writes a post from your words, so you decide what it names, and you approve it.",
    },
    {
      title: "Keep the hours of each doctor's day honest",
      text: "Weekly hours say when the clinic is open and a post says which doctor is in on which day. When a doctor adds or drops a day, both change together.",
    },
  ],
  categories: {
    primary: "Skin care clinic",
    more: ["Medical clinic", "Dermatologist", "Laser hair removal service"],
    note: "All four names are shown by Google under real clinic profiles. Use 'Medical clinic' or 'Dermatologist' only when a licensed doctor on your team practises it. Google says to use as few categories as possible and to keep them specific.",
  },
  reviewThemes: [
    {
      theme: "The welcome at the front desk",
      text: "A client thanks reception for how she was greeted. The reply passes the thanks to the team and names no patient and no treatment.",
    },
    {
      theme: "How a treatment turned out",
      text: "This is a health review. It comes to you with no draft and a route to a person at Kabsi. The reply is yours to write.",
    },
    {
      theme: "A cancelled or moved appointment",
      text: "A reply cannot say the writer was booked, because that would confirm a patient. It thanks them for telling you and asks them to get in touch through the details on the profile.",
    },
    {
      theme: "The price after the consultation",
      text: "The reply states no price it was not given. It invites the writer to contact the clinic and leaves the amount out of public view.",
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
  posts: [
    "Consultations now open on a new day, with the booking link.",
    "A new doctor joins: their qualifications and the days they see patients.",
    "Closed for Eid, and the number to call for an urgent problem.",
    "How to book a first consultation, in three steps.",
  ],
  photoTips: [
    {
      title: "The consultation room, with the screen off",
      text: "Bright, clean and calm. No monitor showing anyone's details, and no one on the couch.",
    },
    {
      title: "The sign at the door and by the lift",
      text: "Clinics sit in towers and healthcare zones. One photo of the sign and one of the lift button save a missed appointment.",
    },
    {
      title: "The doctor, with their say so",
      text: "A doctor in clinic clothes, taken in good light. Google asks for photos in focus and well lit, and Kabsi flags any photo where a face is the main subject.",
    },
  ],
  holidays: [
    {
      when: "Eid al-Adha, UAE",
      text: "Eid al-Adha is three days, 10 to 12 Dhu al-Hijjah. A clinic closed for those days should say on Google who to call for an urgent problem, in a post.",
    },
    {
      when: "Ramadan, UAE",
      text: "Private sector working hours drop by two hours a day for the month, so check the doctors' consultation hours against the shorter day.",
    },
    {
      when: "New Year's Day, UAE and UK",
      text: "A public holiday on 1 January in the UAE, and Friday 1 January 2027 in England and Wales. Hours go on Google in the week before Christmas.",
    },
    {
      when: "A closure of a week or more",
      text: "Google's special hours suit a clinic closed up to 6 days in a row. For 7 days or more, mark the profile as temporarily closed instead.",
    },
  ],
  faqs: [
    {
      q: "Will Kabsi ever put a patient's name or treatment in a reply?",
      a: "No. Drafts stay calm and general: no medical claims, no personal details and no admission of fault. Kabsi never sends patient details on WhatsApp.",
    },
    {
      q: "Can a clinic's post name Botox?",
      a: "Check the rules in your country. In the UK, the advertising regulator says Botox is a prescription-only medicine that cannot be advertised to the public. A consultation can be promoted. This is not legal advice.",
    },
    {
      q: "What does the reply to a five star review say?",
      a: "It thanks the writer and says the words will be shared with the team. It says nothing about a visit, a treatment or a date, and it does not name anyone.",
    },
    {
      q: "Does Kabsi follow the privacy law of my country?",
      a: "Kabsi's drafts follow a careful habit: a public reply never confirms someone is a patient or mentions their care. That is a habit, not legal advice. Questions about privacy law go to a person.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "how-to-choose-your-primary-category"],
};

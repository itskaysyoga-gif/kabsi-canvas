import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Finished page (model 3 of 3). Parkside Dental is invented (Example). Health rules from master plan 30.15
// section 3.7: a review that mentions treatment comes with no draft and a route to a person, and no patient
// details are ever sent on WhatsApp.
export const dentalClinic: Industry = {
  slug: "dental-clinic",
  hub: "health",
  name: "dental clinic",
  plural: "Dental clinics",
  finished: true,
  lead: "Kabsi keeps your clinic hours, emergency line and appointment link right on Google, and drafts careful replies that never confirm who is a patient. A review about treatment comes to you with no draft. You approve everything on WhatsApp.",
  keyword: "dentist",
  example: {
    business: "Parkside Dental",
    city: "Dubai",
    kind: "clinic",
    rival: "Smile Clinic",
    rival2: "Northgate Dental Care",
    near: ["North of the mall", "By the school"],
  },
  photos: [PHOTOS.dentistPatient],
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
  tasks: [
    {
      title: "Reply without confirming anyone is a patient",
      text: "A dental reply thanks the writer and never repeats a treatment, a name or a visit date. Kabsi drafts within that rule, every time.",
    },
    {
      title: "Keep the emergency number and hours exact",
      text: "Someone with toothache at 9 at night calls the number on Google. It has to ring someone, and the hours have to say when.",
    },
    {
      title: "List the treatments you really offer",
      text: "Whitening, implants, braces, children's care. Services on Google match what your dentists do now, with no treatment you stopped offering.",
    },
    {
      title: "Keep the appointment link current",
      text: "Many patients book a check-up from the profile. The link opens your booking page, not the clinic's home page.",
    },
    {
      title: "Set hours for public holidays",
      text: "Closed for Eid or National Day, open on the Saturday after. Special hours go on Google a week ahead.",
    },
  ],
  categories: {
    primary: "Dentist",
    more: ["Dental clinic", "Cosmetic dentist", "Pediatric dentist", "Emergency dental service"],
    note: "Use a specialist category only when a dentist on your team practises it. 'Orthodontist' belongs to a clinic with an orthodontist.",
  },
  reviewThemes: [
    {
      theme: "A gentle dentist",
      text: "Nervous patients write about how they were treated. The reply thanks them without mentioning the visit.",
    },
    {
      theme: "Cost explained before treatment",
      text: "Or not explained. Reviews about bills are moved to a private conversation, never argued in public.",
    },
    {
      theme: "The front desk and waiting time",
      text: "Reception gets named more than the dentists. A reply passes the thanks on to the team.",
    },
    {
      theme: "Children who were not scared",
      text: "Parents write these. The reply speaks to the parent and says nothing about the child.",
    },
  ],
  story: {
    title: "A hard review, handled with care.",
    lead: "Kabsi sends no patient details on WhatsApp. A review about treatment comes with no draft and a way to talk to a person.",
    lines: [
      {
        from: "kabsi",
        text: "Parkside Dental: a new 2-star review needs you. It talks about a treatment, so I have not written a reply. Read it on your Kabsi account.",
        buttons: ["Open the review", "Talk to a person"],
      },
      { from: "owner", text: "Talk to a person" },
      {
        from: "kabsi",
        text: "A person at Kabsi answers on WhatsApp the same working day. Write your own reply on the Kabsi website when you are ready. Nothing is published until you say yes.",
      },
      {
        from: "kabsi",
        text: "Also ready: a reply to a 5-star review. 'Thank you for your kind words. We will pass them on to our team.' Reply Yes to publish.",
        buttons: ["Yes", "Edit", "Skip"],
      },
    ],
  },
  posts: [
    "Saturday morning appointments for check-ups and cleaning.",
    "Who to call for a dental emergency after hours.",
    "A new dentist joins: their training and the days they see patients.",
    "School holiday check-ups for children, with the booking link.",
  ],
  photoTips: [
    {
      title: "The treatment room, empty",
      text: "Clean, bright and calm. Never a patient's face or mouth, even with permission.",
    },
    {
      title: "The team",
      text: "Dentists and reception in clinic clothes. Patients like to know who they will meet.",
    },
    {
      title: "The entrance and parking",
      text: "How to find the clinic in the building, and where to leave the car.",
    },
  ],
  holidays: [
    {
      when: "Eid al-Fitr and Eid al-Adha",
      text: "Many clinics close for days. Special hours, and the number to call in an emergency while closed.",
    },
    {
      when: "UAE National Day, 2 December",
      text: "A public holiday. Hours on Google a week before, with the Saturday after if you open.",
    },
    {
      when: "School holidays",
      text: "Parents book children's check-ups. A post when the holiday dates are near.",
    },
    {
      when: "UK: bank holidays",
      text: "Closed days on Google, and the urgent care line for patients in pain.",
    },
  ],
  faqs: [
    {
      q: "Does Kabsi see my patients' records?",
      a: "No. Kabsi has Manager access to your Google profile only. It never connects to your clinic system and never sends patient details on WhatsApp.",
    },
    {
      q: "Why are some reviews sent without a reply?",
      a: "When a review talks about treatment, pain, money or a complaint, the safest reply is one you write yourself. Kabsi flags it and leaves the words to you.",
    },
    {
      q: "Can Kabsi ask patients for reviews?",
      a: "Kabsi never receives a patient's number. It gives your team a ready message with the review link to forward after a visit, if you choose to.",
    },
    {
      q: "Should a clinic reply to reviews at all?",
      a: "Yes, a short reply shows the next patient that someone reads them. What matters is what it says. Kabsi's drafts never confirm someone is a patient, and you approve every one.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "how-to-choose-your-primary-category"],
};

import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the vet clinic page, written for its own trade. Every Google sentence has
// its row in docs/claims/veterinary-clinic.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Greenway Vets, Bristol, and
// every person and number here are invented (Example).
export const veterinaryClinic: Industry = {
  slug: "veterinary-clinic",
  name: "vet clinic",
  plural: "Vet clinics",
  finished: true,
  lead: "Clinic hours and phone right on Google, careful replies that share no pet's care, and posts for your yes.",
  keyword: "veterinarian",
  example: {
    business: "Greenway Vets",
    city: "Bristol",
    kind: "clinic",
    rival: "Hillside Animal Clinic",
    rival2: "Riverside Vets",
    near: ["By the common", "Near the ring road"],
  },
  photos: [MORE_PHOTOS.vetWide, MORE_PHOTOS.vetTall],
  searches: [
    "vet near me",
    "emergency vet",
    "vet open saturday",
    "cat vet",
    "puppy vaccinations",
    "veterinary clinic",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/veterinary-clinic.md, whose "Industries 3" section maps it to its row.
  // Industry 1 (R-144): the services this trade lists on Google (Example names, not a full list).
  services: [
    "Vaccinations",
    "Neutering",
    "Pet dental care",
    "Microchipping",
    "Health checks",
    "Flea and worm treatment",
    "Nurse clinics",
  ],
  profile: [
    {
      title: "Hours and the phone first",
      text: "Exact hours. Kabsi asks before each public holiday and sets special hours on your yes.",
    },
    {
      title: "Out of hours calls",
      text: "Sent to another clinic? Say so in your description and posts, not the category.",
    },
    {
      title: "Services, plainly listed",
      text: "Vaccinations, neutering, dental care: each can be a service with a description.",
    },
    {
      title: "Which animals you see",
      text: "Cats and dogs only, or exotics too: say so in your description.",
    },
  ],
  categories: {
    primary: "Veterinarian",
    more: ["Animal hospital", "Emergency veterinarian service"],
    line: "Add the emergency category only if you really take emergencies in those hours. Names can differ by country.",
  },
  reviews: [
    {
      title: "No treatment in a reply",
      text: "Drafts thank the owner and invite contact through your profile, never the pet's treatment.",
    },
    {
      title: "A pet hurt, or a death",
      text: "No draft for grief or injury; a checklist reaches you instead.",
    },
    {
      title: "A long wait in reception",
      text: "One apology, and an invitation to get in touch with the clinic.",
    },
  ],
  holidays: [
    {
      title: "Christmas 2026",
      text: "25 December and the Boxing Day holiday on Monday 28. Post your cover.",
    },
    {
      title: "Bank holidays, five days ahead",
      text: "Kabsi asks, then sets special hours after your yes.",
    },
  ],
  photoCards: [
    {
      title: "The reception desk",
      text: "Bright and welcoming, with no pet or owner in view.",
    },
    {
      title: "The consulting room",
      text: "Clean table, tidy shelves, good light.",
    },
    {
      title: "The car park and door",
      text: "Where to stop with a pet carrier, seen from the street.",
    },
  ],
  posts: [
    {
      title: "Vaccination clinic dates",
      text: "The days you run them, as a dated post.",
    },
    {
      title: "A new vet joins",
      text: "Their name and the animals they see.",
    },
    {
      title: "Bank holiday cover",
      text: "Who answers urgent calls while you are closed.",
    },
  ],
  page: {
    query: "veterinarian Google Business Profile",
    title: "Veterinarian Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your veterinarian Google Business Profile: hours and phone checked daily, careful replies that share no pet's care, posts for your yes.",
    h1: "Your vet clinic on Google, in safe hands.",
    mark: "in safe hands.",
    line: "Kabsi looks after your veterinarian Google Business Profile: hours and phone checked daily, and careful replies you approve.",
    card: "Hours and phone checked daily, careful replies.",
    answer:
      "A worried owner checks a veterinarian Google Business Profile for your phone and hours. Kabsi checks both daily and drafts careful replies for your yes.",
    watch: {
      business: "Greenway Vets, Bristol",
      line: "A worried owner trusts the hours Google shows. Kabsi checks them against yours every day.",
      fields: ["Opening hours", "Special hours", "Phone", "Address", "Website", "Main category"],
      what: "Saturday",
      google: "Closed",
      owner: "09:00 to 13:00",
      message: "Google shows you closed on Saturday. You told me 09:00 to 13:00.",
    },
    post: {
      owner: "Puppy clinic every Thursday at 4 from next week.",
      quote: "New puppy clinic every Thursday at 4 pm, from next week. Ask at reception.",
    },
    jobs: [
      {
        title: "The phone and hours, read daily",
        text: "If Google differs, you decide which version stays.",
      },
      {
        title: "Replies that share no care details",
        text: "Thanks and an invitation to get in touch, nothing about the pet's treatment.",
      },
      {
        title: "Clinic news, as posts",
        text: "A new clinic day or a new vet becomes a post for your yes.",
      },
    ],
    ai: {
      question: "Which vet in Bishopston, Bristol is open on Saturday mornings?",
      answer: "Greenway Vets in Bishopston is open on Saturdays from 9 am to 1 pm.",
      sources: ["Greenway Vets' Google profile", "Greenway Vets' website"],
    },
    related: [
      "pet-grooming",
      "dental-clinic",
      "physiotherapy",
      "medical-and-aesthetic-clinic",
      "optician",
      "florist",
    ],
  },
  faqs: [
    {
      q: "Will a reply mention a pet's treatment?",
      a: "No, drafts thank the owner and invite them to get in touch, and say nothing about the pet's care.",
    },
    {
      q: "Can Kabsi set our bank holiday hours?",
      a: "Yes, five days before each one, Kabsi asks what you will do and sets special hours once you say yes.",
    },
    {
      q: "What happens with a very hard review?",
      a: "No draft, just a short checklist. You write the reply, ask Kabsi for a neutral holding reply, or skip it.",
    },
    {
      q: "Where does the review card go at a vet clinic?",
      a: "At reception, on appointment cards or in a follow-up email.",
    },
    {
      q: "Can a reply mention a pet's name?",
      a: "No, a reply says nothing about the pet or its care, only thanks and how to reach you.",
    },
  ],
  guides: [
    "keep-your-hours-and-details-the-same-everywhere",
    "how-to-respond-to-negative-google-reviews",
    "someone-changed-my-hours-on-google",
  ],
};

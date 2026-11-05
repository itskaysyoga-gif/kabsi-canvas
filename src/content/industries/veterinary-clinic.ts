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
  categories: {
    primary: "Veterinarian",
    more: ["Animal hospital", "Emergency veterinarian service"],
    note: "Add the emergency category only if you really take emergencies in those hours. Read the names in your own profile, because they can differ by country.",
  },
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
      "A worried pet owner checks a veterinarian Google Business Profile for the phone number and whether you are open now. Kabsi checks your hours and phone every day, drafts careful replies that share nothing about a pet's care, shows you a hard review as one that needs more care, and asks about holiday hours in time. You approve every word.",
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
        title: "Hours and phone, checked daily",
        text: "When Google shows something else, you choose which stays.",
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
    nearby: { kind: "clinic", term: "veterinarian" },
    ai: {
      question: "Which vet in Bishopston, Bristol is open on Saturday mornings?",
      answer: "Greenway Vets in Bishopston is open on Saturdays from 9 am to 1 pm.",
      sources: ["Greenway Vets' Google profile", "Greenway Vets' website"],
    },
    related: ["pet-grooming", "dental-clinic"],
    searchText:
      "Owners search when something is wrong, an emergency vet or a vet open now, and when something is due, vaccinations or a first check for a puppy. Hours and the phone number matter most.",
    guide: [
      {
        title: "Hours, emergencies and the phone",
        paras: [
          "A pet owner in a hurry reads two things: are you open, and what number do they call. Keep your weekly hours exact and set special hours for holidays, so Google shows the right answer. Kabsi asks before each public holiday what you will do and sets special hours once you say yes.",
          "If you send out of hours calls to another clinic, say so in your description and posts rather than in the category. Kabsi compares your phone, hours and description on Google with what you confirmed, every day.",
        ],
      },
      {
        title: "Replies that protect owners and pets",
        paras: [
          "A public reply should not discuss a pet's diagnosis or treatment. Kabsi drafts replies that thank the owner and invite them to get in touch through the details on your profile, and you can add anything it should never say in About your business.",
          "A review about a pet that was hurt or died comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask, and nothing is published until you approve it.",
        ],
      },
    ],
  },
  faqs: [
    {
      q: "Will a reply mention a pet's treatment?",
      a: "No. Drafts thank the owner and invite them to get in touch, and say nothing about the pet's care.",
    },
    {
      q: "Can Kabsi set our bank holiday hours?",
      a: "Yes. Five days before each one, Kabsi asks what you will do and sets special hours once you say yes.",
    },
    {
      q: "Does Kabsi see our clinic records?",
      a: "No. Kabsi works with your Google profile and its reviews. It does not connect to your clinic system.",
    },
    {
      q: "What happens with a very hard review?",
      a: "It comes to you marked as needing a little more care, with a short checklist and no draft. You write the reply, ask Kabsi for a short, neutral holding reply, or skip it.",
    },
    {
      q: "Can our practice manager approve replies?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything.",
    },
  ],
  guides: [
    "how-to-respond-to-negative-google-reviews",
    "keep-your-hours-and-details-the-same-everywhere",
  ],
};

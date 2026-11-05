import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/physiotherapy.md, approved by lane R on 27 Oct 2026 (brief section 18). Motion Works Physio is
// invented (Example). Health rules from master plan 30.15 section 3.7 apply: no draft for a review that names an
// injury or a result, no patient details. Every fact on this page has a row in the claim sheet.
export const physiotherapy: Industry = {
  slug: "physiotherapy",
  name: "physiotherapy clinic",
  plural: "Physiotherapy",
  finished: true,
  lead: "Physios, treatments and the assessment link right on Google, and replies that never name an injury. You approve each one.",
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
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/physiotherapy.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "What you treat, in their words",
      text: "Back pain, knee rehab, sports injuries. Google can show each service with a description.",
    },
    {
      title: "Book opens the first assessment",
      text: "Add your own booking link. Check it each time your booking page changes.",
    },
    {
      title: "Home visit hours, set apart",
      text: "Home visits only: hide the address. Clinic and visits: set Google's more hours.",
    },
    {
      title: "Only names on your team list",
      text: "In the UK, only HCPC registered staff may be called physiotherapists. Kabsi uses listed names.",
    },
  ],
  reviews: [
    {
      title: "The physio who explained the plan",
      text: "The reply thanks her, passes it to the team, and never mentions the injury.",
    },
    {
      title: "Pain that did not improve",
      text: "A careful draft that names no treatment. An injury gets no draft.",
    },
    {
      title: "Times, parking and the waiting room",
      text: "A short reply that points to the hours and directions on the profile.",
    },
  ],
  categories: {
    primary: "Physical therapist",
    more: [],
    line: "Searches say physio, but real profiles show 'Physical therapist'. Pick it from Google's list; add a second only for a real department.",
  },
  holidays: [
    {
      title: "UK: late May and August",
      text: "31 May and 30 August 2027, both Mondays. Post who covers urgent bookings.",
    },
    {
      title: "Eid al-Fitr, UAE",
      text: "1 to 3 Shawwal, set by the moon. Say on Google when you reopen.",
    },
    {
      title: "Closing at noon before a holiday",
      text: "Special hours for that day alone. The rest of the week stays as it is.",
    },
  ],
  photoCards: [
    {
      title: "Treatment room and exercise area",
      text: "Couches made up, equipment tidy, no patient in the frame. Kabsi does not check faces.",
    },
    {
      title: "The physios in clinic clothes",
      text: "Patients want to know who they will meet. Good light, and ask each physio first.",
    },
    {
      title: "Post ideas",
      text: "A Thursday evening clinic, a new physio, home visit areas, bank holiday hours.",
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
  page: {
    query: "physiotherapist Google Business Profile",
    title: "Physiotherapist Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your physiotherapist Google Business Profile: open status and hours right, replies that never name an injury, and posts for your yes.",
    h1: "Your physio clinic on Google, in good shape.",
    mark: "in good shape.",
    line: "Kabsi looks after your physiotherapist Google Business Profile: hours, the assessment link, and replies that never name an injury.",
    card: "Assessment link right, replies that name no injury.",
    answer:
      "Kabsi looks after your physiotherapist Google Business Profile: open status checked daily, replies that name no injury, clinic news as posts for your yes.",
    watch: {
      business: "Motion Works Physio, Manchester",
      line: "A clinic shown as closed loses the patients who check first. Kabsi checks your open status every day.",
      fields: ["Open status", "Opening hours", "Website", "Phone", "Address"],
      what: "Open status",
      google: "Temporarily closed",
      owner: "Open",
      message: "Google shows you as temporarily closed. You told me you are open.",
    },
    post: {
      owner: "Sports massage now on Saturday mornings.",
      quote: "Sports massage is now available on Saturday mornings. Book on our website.",
    },
    jobs: [
      {
        title: "Replies that name no injury",
        text: "Thanks, an invitation to get in touch, and nothing about the patient's care.",
      },
      {
        title: "Open status and hours, checked daily",
        text: "When Google shows something else, you choose which stays.",
      },
      {
        title: "Clinic news, as posts",
        text: "A new physio or a new session time becomes a post for your yes.",
      },
    ],
    nearby: { kind: "clinic", term: "physio" },
    ai: {
      question: "Which physio in Didsbury, Manchester has Saturday appointments?",
      answer:
        "Motion Works Physio in Didsbury has appointments on Saturday mornings, with sports massage.",
      sources: ["Motion Works Physio's Google profile", "Motion Works Physio's website"],
    },
    related: [
      "medical-and-aesthetic-clinic",
      "dental-clinic",
      "yoga-and-pilates-studio",
      "gym-and-fitness",
      "spa-and-massage",
      "optician",
    ],
  },
  faqs: [
    {
      q: "Can Kabsi say how many sessions a patient needs?",
      a: "No. Kabsi writes only the facts you give it, like what you treat and when you open. It promises nothing about results.",
    },
    {
      q: "Does Kabsi see patient notes or bookings?",
      a: "No. Kabsi has Manager access to your Google profile only. It never connects to your clinic system and never sends patient details on WhatsApp.",
    },
    {
      q: "Does my profile need to say whether a GP referral is needed?",
      a: "Say it in a post: tell Kabsi your rule and it prepares one for your yes. NHS physio is sometimes possible without a GP referral.",
    },
    {
      q: "Can I give a free assessment to anyone who leaves a review?",
      a: "No. Google does not allow free or discounted services in return for a review. Ask every patient the same way.",
    },
    {
      q: "Can Kabsi reply to a review that names a treatment?",
      a: "Yes: a careful draft that does not repeat the treatment. An injury gets no draft and a short checklist. You approve or write every reply.",
    },
  ],
  guides: [
    "how-to-reply-to-google-reviews",
    "add-services-and-prices-to-google",
    "google-posts-for-local-businesses",
  ],
};

import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the nail salon page written for its own trade. Every Google
// sentence has its row in docs/claims/nail-salon.md (section "Design 8"); the Kabsi sentences follow
// knowledge/kabsi-facts.md. Polish Room, Brighton, is invented (Example).
export const nailSalon: Industry = {
  slug: "nail-salon",
  name: "nail salon",
  plural: "Nail salons",
  finished: true,
  lead: "Seasonal designs as posts, your work photos checked, holiday hours asked in time and replies ready. You approve each one.",
  keyword: "nail salon",
  example: {
    business: "Polish Room",
    city: "Brighton",
    kind: "salon",
    rival: "Nail Lounge",
    rival2: "The Nail Studio",
    near: ["Near the station", "By the seafront"],
  },
  photos: [PHOTOS.nailTechnician, PHOTOS.nailDesk],
  focus: "50% 50%",
  searches: ["nail salon near me", "gel nails", "manicure", "acrylic nails", "nail art"],
  // Industries 3 (master plan 30.33 item 2): the two old guide sections as short cards. Each line keeps a fact of
  // docs/claims/nail-salon.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Designs, season by season",
      text: "Each new set is a post with a photo and a button to your website.",
    },
    {
      title: "Photos true to the nail",
      text: "In focus, well lit, no heavy filters. Kabsi checks each photo first.",
    },
    {
      title: "Prices and the right category",
      text: "A price in a service name is rejected. Google's example: Nail salon, not Salon.",
    },
    {
      title: "The technician, by name",
      text: "When a review names them, the reply thanks them. Only team list names are used.",
    },
  ],
  page: {
    query: "nail salon Google Business Profile",
    title: "Nail salon Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your nail salon Google Business Profile: new designs posted, work photos checked, holiday hours asked and a reply for every review.",
    h1: "Your nail salon on Google, looking polished.",
    mark: "looking polished.",
    line: "Kabsi keeps your nail salon Google Business Profile fresh: new designs as posts, photos checked, replies for your yes.",
    card: "Seasonal designs as posts, photos checked.",
    answer:
      "For a nail salon Google Business Profile, Kabsi turns new designs into posts, checks each photo and drafts every reply, all for your yes.",
    watch: {
      business: "Polish Room, Brighton",
      line: "Clients looking for nails expect a nail salon. Kabsi checks your main category against yours every day.",
      fields: ["Main category", "Opening hours", "Special hours", "Website", "Phone"],
      what: "Main category",
      google: "Beauty salon",
      owner: "Nail salon",
      message: "Google shows Beauty salon as your main category. You told me Nail salon.",
    },
    post: {
      owner: "Autumn chrome set, done today.",
      quote: "Our autumn chrome sets are here. Ask for them at your next appointment.",
    },
    jobs: [
      {
        title: "Seasonal designs, as posts",
        text: "A photo of the new set and one line become a post for your yes.",
      },
      {
        title: "Work photos, checked",
        text: "Kabsi flags a dark, blurry or too small photo before it reaches Google.",
      },
      {
        title: "Careful replies",
        text: "A review about a reaction gets a short checklist and no draft, so you decide.",
      },
    ],
    nearby: { kind: "salon", term: "nail salon" },
    ai: {
      question: "Which nail salon in Brighton does gel extensions on a Sunday?",
      answer:
        "Polish Room on Kensington Gardens does gel extensions and opens on Sundays from 11 am.",
      sources: ["Polish Room's Google profile", "Polish Room's website"],
    },
    related: [
      "lash-and-brow-studio",
      "hair-salon",
      "spa-and-massage",
      "barbershop",
      "medical-and-aesthetic-clinic",
      "tattoo-studio",
    ],
  },
  faqs: [
    {
      q: "Will Kabsi change my prices on Google without asking?",
      a: "No. Kabsi does not edit prices on Google today, and nothing reaches Google until you approve it.",
    },
    {
      q: "What happens with a review about a reaction or an infection?",
      a: "Kabsi shows it to you with no draft, so you decide how to answer.",
    },
    {
      q: "Does Kabsi message my clients?",
      a: "No. Kabsi talks only to you. It gives you a review link and a QR card to share after a real visit.",
    },
    {
      q: "Can I create a category called 'nail bar'?",
      a: "No. Google does not let a business create its own category. Pick the most specific one from Google's list.",
    },
    {
      q: "Will Kabsi post a client's hands?",
      a: "Only photos you send it, and only after you approve the post. Send photos of the work, and ask the client first if you like.",
    },
  ],
  guides: [
    "photos-for-google-business-profile",
    "google-posts-for-local-businesses",
    "choose-google-business-profile-categories",
  ],
  d8: {
    seo: {
      title: "Kabsi for nail salons: Google posts, photos and review replies",
      description:
        "Kabsi keeps a nail salon's Google profile right: seasonal designs as posts, photos checked, bank holiday hours asked in time, and a reply ready for every review.",
    },
    business: "Polish Room, Brighton",
    card: {
      label: "Post",
      text: "Christmas designs post ready with your photo:",
      quote:
        "Our Christmas designs are in: red velvet, gold foil and snowflakes, until 24 December.",
      buttons: ["Approve", "Edit", "Skip"],
      time: "10:05",
    },
    jobsTitle: "Google jobs that come back.",
    check: [
      {
        label: "Photos",
        value: "4",
        tone: "warn",
        next: "Kabsi asks for photos of your work from your phone, checks each one and sends it to Google once you say yes.",
      },
      { label: "Reviews", value: "27, rated 4.7", tone: "ok" },
      { label: "Opening hours", value: "Shown", tone: "ok" },
      { label: "Website", value: "Shown", tone: "ok" },
    ],
    checkText:
      "For a nail salon the free check starts with your photos, because clients choose by the work they see, then your reviews, hours and links. Example result for an invented salon in Brighton.",
  },
};

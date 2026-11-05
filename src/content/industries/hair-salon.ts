import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the hair salon page written for its own trade. Every Google
// sentence has its row in docs/claims/hair-salon.md (written in Web 4c before the page was indexed); the Kabsi
// sentences follow knowledge/kabsi-facts.md. Hollis Hair, Bristol, is invented (Example).
export const hairSalon: Industry = {
  slug: "hair-salon",
  name: "hair salon",
  plural: "Hair salons",
  finished: true,
  lead: "New stylists announced, colour work as posts, holiday hours asked in time and replies ready. You approve each one.",
  keyword: "hair salon",
  example: {
    business: "Hollis Hair",
    city: "Bristol",
    kind: "salon",
    rival: "Juniper Hair Studio",
    rival2: "Lark Salon",
    near: ["Near the station", "By the park"],
  },
  photos: [PHOTOS.salonWash, PHOTOS.salonStudio],
  focus: "50% 30%",
  searches: ["hair salon near me", "hairdressers", "balayage", "hair colour near me", "blow dry"],
  tasks: [
    {
      title: "Services missing from your profile, listed",
      text: "Balayage, a gloss, a keratin treatment. Google can show each service with a price and a short description. Kabsi's Profile Coach lists the services your profile is missing, so you know what to add on Google.",
    },
    {
      title: "A new stylist, announced",
      text: "When someone joins, add the name to your team list so replies can thank them. A post that says who joined can go up once you approve it.",
    },
    {
      title: "Replies that thank the stylist by name",
      text: "A review that names Amber gets a reply that passes the thanks on. Kabsi uses only the names on your team list, so a stylist who left is never thanked once you take their name off the list.",
    },
    {
      title: "Your colour work, as posts",
      text: "A colour you are proud of becomes a post with your photo, checked first, ready for your yes.",
    },
    {
      title: "Christmas and bank holiday hours",
      text: "Five days before each bank holiday Kabsi asks what you will do, so nobody arrives on Boxing Day to a closed door.",
    },
  ],
  page: {
    query: "hair salon Google Business Profile",
    title: "Hair salon Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your hair salon Google Business Profile: a reply for every review, new stylists announced, colour work posted, holiday hours asked in time.",
    h1: "Your salon on Google, taken care of.",
    mark: "taken care of.",
    line: "Kabsi looks after your hair salon Google Business Profile: replies, colour posts, holiday hours and stylists, each for your yes.",
    card: "Stylists thanked by name, colour work as posts.",
    answer:
      "Kabsi does the weekly work of a hair salon Google Business Profile for you. It drafts a reply to every new review and passes the thanks to the stylist the client named, turns a photo of your colour work into a post, asks about bank holiday hours five days ahead, and checks your details every day. Nothing goes on Google until you say yes.",
    watch: {
      business: "Hollis Hair, Bristol",
      line: "Clients check your hours and booking link before they come. Kabsi compares them with what you told it, every day.",
      fields: [
        "Opening hours",
        "Special hours",
        "Website",
        "Phone",
        "Main category",
        "Description",
      ],
      what: "Website",
      google: "Old booking page",
      owner: "New booking page",
      message: "Google shows your old booking page as your website. You told me the new one.",
    },
    post: {
      owner: "Amber joins us for colour and balayage. Booking from Tuesday.",
      quote: "New to the team: Amber, colour and balayage. Book with her from Tuesday.",
    },
    jobs: [
      {
        title: "A reply for every review",
        text: "A review that names Amber gets a reply that thanks Amber, using only the names on your team list.",
      },
      {
        title: "Colour work, as posts",
        text: "Send the photo with a line. Kabsi writes the post and checks the photo first.",
      },
      {
        title: "Bank holiday hours",
        text: "Five days before each bank holiday, Kabsi asks what you will do and sets it once you say yes.",
      },
    ],
    nearby: { kind: "salon", term: "hair salon" },
    ai: {
      question: "Which hair salon in Clifton, Bristol does balayage on Saturdays?",
      answer: "Hollis Hair on Gloucester Road does balayage and is open on Saturdays from 9 am.",
      sources: ["Hollis Hair's Google profile", "Hollis Hair's website"],
    },
    related: ["barbershop", "nail-salon"],
  },
  faqs: [
    {
      q: "Can Kabsi add a new service to my Google profile?",
      a: "Not yet. Kabsi's Profile Coach lists the services your profile is missing; adding them on Google for you comes later.",
    },
    {
      q: "Will a reply thank the right stylist?",
      a: "Only when the review names them. Kabsi uses the names on the team list you give it, and never guesses one.",
    },
    {
      q: "Does Kabsi work with my booking system?",
      a: "No. Kabsi works only with your Google profile.",
    },
    {
      q: "Can my salon manager approve instead of me?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything.",
    },
    {
      q: "How does Kabsi know what my salon is like?",
      a: "You tell it once, in About your business: services, team, hours and anything it should never say. Every draft uses those facts.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "how-to-set-holiday-hours-on-google"],
  d8: {
    seo: {
      title: "Kabsi for hair salons: Google posts, hours and review replies",
      description:
        "Kabsi keeps a hair salon's Google profile right: new stylists announced, colour work as posts, bank holiday hours asked in time, and a reply ready for every review.",
    },
    business: "Hollis Hair, Bristol",
    card: {
      label: "Post",
      text: "Amber starts on Tuesday. Post ready:",
      quote: "New to the team: Amber, colour and balayage, from Tuesday.",
      buttons: ["Approve", "Edit", "Skip"],
      time: "09:20",
    },
    jobsTitle: "Google jobs that come back.",
    searchText:
      "People choose a salon by the work they see and the stylist they read about. They search for a salon nearby or for the service itself, then look at photos, services and replies.",
    check: [
      {
        label: "Opening hours",
        value: "Missing",
        tone: "warn",
        next: "Kabsi asks you for your hours and sends them to Google once you say yes.",
      },
      { label: "Reviews", value: "38, rated 4.8", tone: "ok" },
      { label: "Photos", value: "10 or more", tone: "ok" },
      { label: "Website", value: "Shown", tone: "ok" },
    ],
    checkText:
      "For a hair salon the free check starts with your hours, because a client checks you are open before booking, then your reviews, photos and website. Example result for an invented salon in Bristol.",
    guide: [
      {
        title: "Services and stylists clients can see",
        paras: [
          "A client picking a new salon wants to know two things: do you do what they want, and who will do it. Google can show each service with a price and a description, and you can add services of your own. Keep the price out of a custom service name, because Google rejects a name that has a price in it. Google's name for a category can differ by country (Google's own example shows 'Hairdresser'), so read the category name in the box on your own profile.",
          "When a stylist joins, two things change on Google: what you offer and who clients will ask for. Add the name to your team list in Kabsi, and a post that says who joined and what they do can go up once you approve it. From then on, a review that names them gets a reply that passes the thanks on. Kabsi uses only the names on your list, so a stylist who left is never thanked once you take their name off the list.",
        ],
      },
      {
        title: "The booking link, the photos and the holidays",
        paras: [
          "Google lets you add your own link to your Business Profile, so clients can book straight from it. A link that points at an old booking tool sends a ready client to an error page, so check it each time you change tools.",
          "Photos of your work are what people look at. Google asks for photos in focus and well lit, without significant alterations or excessive filters, so the colour on Google is the colour in the chair. Kabsi checks each photo before it goes to Google and tells you when one is dark, blurry or too small. Before every bank holiday, Christmas included, Kabsi asks what you will do and sets special hours once you say yes.",
        ],
      },
    ],
  },
};

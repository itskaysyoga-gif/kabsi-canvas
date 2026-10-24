// Industry pages (D258): what Kabsi does for one kind of local business. Every sentence must pass the
// honesty rules (spec §3): no promises of reviews, ratings or rankings, no invented numbers, examples
// clearly labelled. Examples are fictional. Care notes only describe what the product really does.
import type { ReactNode } from "react";
import {
  CalendarClock,
  Camera,
  Car,
  ClipboardList,
  Clock3,
  Coffee,
  Croissant,
  HeartPulse,
  Languages,
  MessageSquareReply,
  Receipt,
  Scissors,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import type { PhotoId } from "@/lib/site-photos";
import { BRAND_LINE, PRICES_SENTENCE } from "@/lib/site";

export type Vertical = {
  slug: string;
  /** Short name used in titles and links, e.g. "restaurants". */
  name: string;
  /** Menu label, e.g. "Restaurants". */
  label: string;
  icon: ReactNode;
  hero: PhotoId;
  /** Optional second photo, only when it differs from the hero. */
  side?: PhotoId;
  title: string;
  description: string;
  h1: string;
  sub: string;
  /** One plain answer to "what does Kabsi do for this kind of business" (read by people and AI search). */
  summary: string;
  /** Section headings, unique per page. */
  headings: { pains: string; example: string; helps: string };
  pains: { icon: ReactNode; title: string; text: string }[];
  example: {
    label: string;
    lang: string;
    name: string;
    rating: number;
    review: string;
    reply: string;
    dir?: "ltr" | "rtl";
  };
  exampleNote: string;
  helps: { icon: ReactNode; title: string; text: string }[];
  placements: string[];
  care: { title: string; text: string };
  guide: { slug: string; title: string };
  /** The kinds of photo customers look for in this trade. */
  photoTypes: string[];
  /** The trade's care rules, in plain words: what a reply never does. */
  careRules: string[];
  faqs: { q: string; a: string }[];
};

export const VERTICALS: Vertical[] = [
  {
    slug: "restaurants",
    name: "restaurants",
    label: "Restaurants",
    icon: <UtensilsCrossed />,
    hero: "restaurant",
    title: "Kabsi for restaurants | Google profile care you approve",
    description:
      "Kabsi keeps your restaurant's Google profile complete and current: a reply to every review in the guest's language, holiday hours and dish photos. You approve everything.",
    h1: BRAND_LINE,
    sub: "Service comes first. Kabsi shows what to fix on your Google profile, drafts each change and drafts a reply to every review in the guest's language. Nothing goes on Google until you approve it.",
    summary:
      "Kabsi keeps a restaurant's Google Business Profile complete and current. It drafts a reply to every review in the guest's language, sets holiday hours, checks dish photos before they go up and alerts you when your phone or hours change on Google.",
    headings: {
      pains: "Service comes first. Google comes later.",
      example: "A reply for every guest, in their language.",
      helps: "What Kabsi handles for your restaurant.",
    },
    pains: [
      {
        icon: <Clock3 />,
        title: "Reviews land during the rush",
        text: "Nobody writes replies between tables. A drafted reply waits in your email until you have a minute.",
      },
      {
        icon: <Languages />,
        title: "Guests write in many languages",
        text: "Visitors and locals review in their own language. Each draft is written in the language of the review.",
      },
      {
        icon: <CalendarClock />,
        title: "Hours change with holidays",
        text: "A wrong closing time on Google means a locked door and an unhappy guest. Special hours take a minute.",
      },
      {
        icon: <HeartPulse />,
        title: "Some complaints need care",
        text: "Illness or hygiene complaints get a calm draft and no quick Approve button, so you read it first.",
      },
    ],
    example: {
      label: "Example review and draft",
      lang: "English",
      name: "Maya",
      rating: 4,
      review:
        "Loved the pasta and the staff were lovely. We waited a while for a table on Saturday night though.",
      reply:
        "Thank you, Maya. We're so glad you enjoyed the pasta and our team. Sorry about the wait on Saturday, and thank you for your patience. We hope to see you again soon.\n\nLuca, Trattoria Verde",
    },
    exampleNote:
      "Fictional example. The draft thanks the guest, answers the one point they raised and invents nothing.",
    photoTypes: [
      "The dishes people order most, in daylight",
      "The dining room, empty and set",
      "The entrance and the street sign, so people find the door",
      "The menu board or a clear photo of the menu",
    ],
    careRules: [
      "A reply never offers a discount or a free meal to change a review.",
      "A reply never says what caused an illness or names a staff member in a complaint.",
      "A review about food safety is shown to you first, with no quick Approve button.",
    ],
    helps: [
      {
        icon: <ClipboardList />,
        title: "What needs attention",
        text: "A short list of what needs attention, marked Urgent, Recommended or Nice to have: missing hours, phone or website, too few dish photos, no recent post. Each item comes with a ready draft where Kabsi can write one.",
      },
      {
        icon: <MessageSquareReply />,
        title: "A reply for every review",
        text: "Drafted from your facts: hours, reservations, delivery area. Facts are only mentioned when the guest raised the topic.",
      },
      {
        icon: <CalendarClock />,
        title: "Holiday and special hours",
        text: "Set closures and late openings for the dates you choose, then post them to Google.",
      },
      {
        icon: <Camera />,
        title: "Dish photos, checked",
        text: "Add a photo from your phone. Kabsi checks it's clear and fits Google's photo rules before you post it.",
      },
      {
        icon: <ShieldCheck />,
        title: "Google Protection",
        text: "If your phone number or hours change on Google, you get an email with before and after.",
      },
    ],
    placements: [
      "On each table, next to the menu or the salt and pepper.",
      "At the host stand or the till, where guests pay.",
      "Printed QR on the bill folder or the takeaway bag.",
    ],
    care: {
      title: "Ask every guest the same way",
      text: "Share the link with every table, not only the happy ones. Ask every customer the same way, as they visit. Never offer a reward.",
    },
    guide: {
      slug: "how-to-respond-to-negative-google-reviews",
      title: "How to respond to negative Google reviews",
    },
    faqs: [
      {
        q: "Can Kabsi reply to reviews in other languages?",
        a: "Yes. Each draft is written in the language of the review, for example English, Spanish, Arabic or French. You read it before anything is posted.",
      },
      {
        q: "Will the replies mention our menu or offers?",
        a: "Only facts you gave Kabsi, and only when the guest raised that topic. Kabsi never invents dishes, prices or offers, and never offers discounts in a reply.",
      },
      {
        q: "Can I set holiday hours from my phone?",
        a: "Yes. Choose the dates, closed or the hours you'll open, and post them to your Google profile from Kabsi.",
      },
    ],
  },
  {
    slug: "cafes",
    name: "cafés",
    label: "Cafés",
    icon: <Coffee />,
    hero: "bakery",
    side: "cafe",
    title: "Kabsi for cafés | Google profile care you approve",
    description:
      "Kabsi keeps your café or bakery's Google profile complete and current: fresh post drafts, early-morning hours and a reply to every review. You approve everything.",
    h1: BRAND_LINE,
    sub: "Your mornings are for coffee and bread, not for Google. Kabsi shows what to improve on your profile, drafts fresh posts and a reply to every review, and waits for your approval.",
    summary:
      "Kabsi keeps a café or bakery's Google Business Profile complete and current. It drafts short posts about what's fresh, replies to every review in the customer's language, keeps opening hours right for holidays and alerts you when your listing changes.",
    headings: {
      pains: "Busy mornings, no time for Google.",
      example: "Regulars write in many languages.",
      helps: "What Kabsi handles for your café or bakery.",
    },
    pains: [
      {
        icon: <Clock3 />,
        title: "The rush never stops",
        text: "Drafts wait in your email. Approve them when the queue is gone.",
      },
      {
        icon: <Croissant />,
        title: "Something new every week",
        text: "A seasonal pastry or a new blend. Tell Kabsi in a sentence and it drafts a Google update.",
      },
      {
        icon: <CalendarClock />,
        title: "Early hours must be exact",
        text: "Customers come before work. Wrong opening hours on Google mean a wasted trip.",
      },
      {
        icon: <Languages />,
        title: "Customers write in many languages",
        text: "Each draft is written in the language of the review, Arabic included.",
      },
    ],
    example: {
      label: "Example review and draft",
      lang: "العربية",
      name: "Nour",
      rating: 5,
      review: "قهوة رائعة وكرواسون طازج كل صباح. المكان هادئ ومريح للعمل.",
      reply:
        "شكراً جزيلاً على كلماتك الجميلة. يسعدنا أن القهوة والكرواسون نالا إعجابك، وننتظرك دائماً في الصباح.\n\nفريق مخبز الزيتونة",
      dir: "rtl",
    },
    exampleNote:
      "Fictional example. The review is in Arabic, so the draft is too. It thanks the customer for what they mentioned and invents nothing.",
    photoTypes: [
      "The counter and the cabinet, as customers see them",
      "A few of the drinks and pastries you sell most",
      "The seating, inside and outside",
      "The shopfront at opening time",
    ],
    careRules: [
      "A reply never offers a free coffee or a discount to change a review.",
      "Allergen and ingredient answers come only from facts you confirmed.",
      "A reply thanks a barista by name only when the name is on your list.",
    ],
    helps: [
      {
        icon: <ClipboardList />,
        title: "What needs attention",
        text: "A short list of what needs attention, marked Urgent, Recommended or Nice to have: opening hours, phone, photos of the counter and the bake, a fresh post. Each item comes with a ready draft where Kabsi can write one.",
      },
      {
        icon: <MessageSquareReply />,
        title: "A reply for every review",
        text: "Drafted from your facts: opening hours, seating, what you bake. Facts are only mentioned when the customer raised the topic.",
      },
      {
        icon: <Sparkles />,
        title: "Fresh posts, drafted",
        text: "Short Google posts about what's fresh. You approve each one, change it or skip it.",
      },
      {
        icon: <CalendarClock />,
        title: "Special hours",
        text: "Holiday closures and early openings posted to Google for the dates you choose.",
      },
      {
        icon: <ShieldCheck />,
        title: "Google Protection",
        text: "An email with before and after if your phone, hours or address change on Google.",
      },
    ],
    placements: [
      "By the coffee machine or the pastry counter.",
      "At the till, next to the card reader.",
      "Printed QR on the takeaway cup sleeve or the bread bag.",
    ],
    care: {
      title: "Ask every customer the same way",
      text: "Share the link with every customer. Ask every customer the same way, as they visit. Never offer a reward.",
    },
    guide: { slug: "google-review-link-and-qr-code", title: "Your Google review link and QR code" },
    faqs: [
      {
        q: "Can Kabsi reply in Arabic?",
        a: "Yes. Each draft is written in the language of the review, including Arabic, English, Spanish and French. You read it before anything is posted.",
      },
      {
        q: "Can Kabsi post our daily specials?",
        a: "Kabsi drafts short posts from what you tell it. You approve each one; nothing is published on a schedule without you.",
      },
      {
        q: "We open at 6am. Can Kabsi check our hours?",
        a: "Google Protection emails you if your hours change on Google, and you can set special hours for holidays from Kabsi.",
      },
    ],
  },
  {
    slug: "salons",
    name: "salons and barbers",
    label: "Salons",
    icon: <Scissors />,
    hero: "salon",
    title: "Kabsi for salons | Google profile care you approve",
    description:
      "Kabsi keeps your salon's Google profile complete and current: photos of your work checked before they go up, and a reply to every review. You approve every post.",
    h1: BRAND_LINE,
    sub: "Clients choose a salon by its profile and photos. Kabsi shows what to improve, checks your photos, drafts a reply to every review and keeps your hours right. You approve each one.",
    summary:
      "Kabsi keeps a salon or barber's Google Business Profile complete and current. It drafts a reply to every review in the client's language and thanks the stylist by name when the client mentions them, checks photos of your work before you post them and keeps your special hours right.",
    headings: {
      pains: "Your hands are busy. Your reviews still need answers.",
      example: "Thank the right stylist, by name.",
      helps: "What Kabsi handles for your salon.",
    },
    pains: [
      {
        icon: <Clock3 />,
        title: "Your hands are busy all day",
        text: "Drafts reach your email ready to go. Tap Approve between clients, or later.",
      },
      {
        icon: <Camera />,
        title: "Your work sells itself",
        text: "Photos of finished cuts and colour show what you do. Kabsi checks each one before you post it.",
      },
      {
        icon: <Sparkles />,
        title: "Clients mention stylists by name",
        text: "Add your team's names and replies can thank the right person. Names not on your list are never used.",
      },
      {
        icon: <CalendarClock />,
        title: "Holiday hours change",
        text: "Set special hours for the dates you choose and post them to Google.",
      },
    ],
    example: {
      label: "Example review and draft",
      lang: "English",
      name: "Jordan",
      rating: 5,
      review: "Sam did an amazing job with my colour, exactly what I asked for. Will be back.",
      reply:
        "Thank you, Jordan. We're so happy you love your colour, and we'll pass your kind words on to Sam. See you next time.\n\nThe team at Studio Nine",
    },
    exampleNote:
      "Fictional example. The stylist's name is used because it's on the salon's staff list.",
    photoTypes: [
      "Finished cuts and colour, with the client's permission",
      "The chairs and the reception area",
      "Your team at work, with their agreement",
      "The shopfront and the sign",
    ],
    careRules: [
      "Only photos of clients who said yes go on your profile.",
      "A reply never offers a discount or a free service to change a review.",
      "A reply thanks a stylist by name only when the name is on your list.",
    ],
    helps: [
      {
        icon: <ClipboardList />,
        title: "What needs attention",
        text: "A short list of what needs attention, marked Urgent, Recommended or Nice to have: hours, phone, booking website, a set of photos of your work, a fresh post. Each item comes with a ready draft where Kabsi can write one.",
      },
      {
        icon: <MessageSquareReply />,
        title: "A reply for every review",
        text: "In the client's language, from the facts you gave Kabsi, with your team's names when the client mentions them.",
      },
      {
        icon: <Camera />,
        title: "Photos, checked first",
        text: "Kabsi flags blurry shots and photos where a face is the main subject, so share the work, not the person.",
      },
      {
        icon: <ShieldCheck />,
        title: "Google Protection",
        text: "An email with before and after if your phone, hours or address change on Google.",
      },
      {
        icon: <CalendarClock />,
        title: "Special hours",
        text: "Holidays, late nights and closures posted to Google in a minute.",
      },
    ],
    placements: [
      "At each station, by the mirror.",
      "At the reception desk where clients pay.",
      "Your review link in the booking confirmation message.",
    ],
    care: {
      title: "Ask every client the same way",
      text: "Share the link with every client. Ask every customer the same way, as they visit. Never offer a reward.",
    },
    guide: { slug: "google-review-link-and-qr-code", title: "Your Google review link and QR code" },
    faqs: [
      {
        q: "Can replies mention my stylists?",
        a: "Yes, if you add their names to Kabsi and the client mentioned them. Kabsi never uses a staff name that isn't on your list.",
      },
      {
        q: "What photos can I post?",
        a: "Clear photos of your salon and your work. Kabsi's check flags blurry photos, screenshots, text-heavy images and photos where a face is the main subject.",
      },
      {
        q: "How do customers leave a review?",
        a: "Every business gets a review link and a printable QR code, free. Share the same link with every customer, on a table card, a receipt or a message. It works with your own QR codes and NFC cards.",
      },
    ],
  },
  {
    slug: "clinics",
    name: "clinics",
    label: "Clinics",
    icon: <Stethoscope />,
    hero: "dentist",
    title: "Kabsi for clinics | Careful Google profile care",
    description:
      "Kabsi keeps your clinic's Google profile complete and current, with calm reply drafts that make no medical claims. Nothing is published without your approval.",
    h1: BRAND_LINE,
    sub: "Patients read your profile before they book. Kabsi shows what to complete on it and drafts a calm, professional reply to each review. Replies never make medical claims, and nothing is posted until you approve it.",
    summary:
      "Kabsi keeps a clinic's Google Business Profile complete and current. It drafts calm, general replies to every review. Drafts make no medical claims, share no personal details and can be told never to confirm that someone is a patient. It also keeps your hours right and alerts you when your listing changes.",
    headings: {
      pains: "Patients read your reviews before they book.",
      example: "Calm replies that protect patient privacy.",
      helps: "What Kabsi handles for your clinic.",
    },
    pains: [
      {
        icon: <HeartPulse />,
        title: "Replies have to be careful",
        text: "A public reply should never discuss someone's care. Drafts stay general and invite the person to talk privately.",
      },
      {
        icon: <Clock3 />,
        title: "No time between patients",
        text: "Drafts reach your email ready to read. Approve, edit or skip them when you have a moment.",
      },
      {
        icon: <ClipboardList />,
        title: "Hours and phone must be right",
        text: "A wrong number on Google means missed calls. Google Protection emails you when it changes.",
      },
      {
        icon: <Languages />,
        title: "Patients speak many languages",
        text: "Each draft is written in the language of the review.",
      },
    ],
    example: {
      label: "Example review and draft",
      lang: "Español",
      name: "Lucía",
      rating: 2,
      review: "Tuve que esperar casi una hora aunque tenía cita. Nadie me explicó el retraso.",
      reply:
        "Gracias por contarnos su experiencia. Lamentamos la espera y la falta de información, y nos gustaría entender lo ocurrido. Por favor, llámenos al 555 0142 para hablarlo en privado.\n\nClínica Dental Sol",
    },
    exampleNote:
      "Fictional example. The draft apologises for the wait, doesn't confirm any treatment and moves the conversation to a private call.",
    photoTypes: [
      "The entrance and the reception desk",
      "The waiting room",
      "The building and the parking, so patients find you",
      "Your team, with their agreement. Never a patient.",
    ],
    careRules: [
      "A reply never confirms that the reviewer is a patient.",
      "A reply never mentions a treatment, a result or a diagnosis.",
      "A reply invites the person to call you, and the details stay in that call.",
    ],
    helps: [
      {
        icon: <ClipboardList />,
        title: "What needs attention",
        text: "A short list of what needs attention, marked Urgent, Recommended or Nice to have: hours, phone, website, categories, photos of the reception and the building. Each item comes with a ready draft where Kabsi can write one.",
      },
      {
        icon: <MessageSquareReply />,
        title: "Careful reply drafts",
        text: "No medical claims, no personal details, no admissions of fault. Hard reviews get a calm draft and no quick Approve button.",
      },
      {
        icon: <ShieldCheck />,
        title: "Google Protection",
        text: "Watches your name, phone, address, hours, website and category, and emails you if one changes.",
      },
      {
        icon: <CalendarClock />,
        title: "Special hours",
        text: "Holidays and closures posted to Google in a minute, so patients don't arrive to a closed door.",
      },
      {
        icon: <Sparkles />,
        title: "Fresh posts, drafted",
        text: "A short Google post from the facts you gave Kabsi. You approve or skip it.",
      },
    ],
    placements: [
      "At the reception desk, next to the payment terminal.",
      "Printed QR on the appointment card or the aftercare sheet.",
      "Your review link in the follow-up email you already send.",
    ],
    care: {
      title: "Keep patient details out of public replies",
      text: "In many countries, health privacy rules (HIPAA in the US, for example) mean a public reply shouldn't confirm that someone is a patient or mention their care. Add \"Don't confirm the reviewer is a patient or mention any treatment\" under Anything Kabsi should never say, and Kabsi's drafts and safety check follow it.",
    },
    guide: { slug: "how-to-reply-to-google-reviews", title: "How to reply to Google reviews" },
    faqs: [
      {
        q: "Does Kabsi post replies without me?",
        a: "No. Every reply waits for your approval, by email or in the dashboard. Nothing is published until you approve it.",
      },
      {
        q: "Can I stop Kabsi mentioning certain things?",
        a: "Yes. In About your business, list anything Kabsi should never say or promise. Drafts follow it and the safety check blocks drafts that don't.",
      },
      {
        q: "Can Kabsi remove a negative review?",
        a: "No. Nobody outside Google can remove a review. Kabsi helps you answer it calmly. You can report a review that breaks Google's rules through Google itself.",
      },
    ],
  },
  {
    slug: "dentists",
    name: "dental practices",
    label: "Dentists",
    icon: <Stethoscope />,
    hero: "dentist",
    title: "Kabsi for dentists | Careful Google profile care",
    description:
      "Kabsi keeps your dental practice's Google profile complete and current, with calm reply drafts that make no medical claims. Nothing is published without your approval.",
    h1: BRAND_LINE,
    sub: "Patients read your profile before they book. Kabsi shows what to complete on it and drafts a calm, professional reply to each review. Replies never make medical claims, and nothing is posted until you approve it.",
    summary:
      "Kabsi keeps a dental practice's Google Business Profile complete and current. It drafts calm, general replies to every review. Drafts make no medical claims, share no personal details and can be told never to confirm that someone is a patient. It also keeps your hours right and alerts you when your listing changes.",
    headings: {
      pains: "A nervous patient reads your reviews first.",
      example: "Warm replies that never confirm who a patient is.",
      helps: "What Kabsi handles for your practice.",
    },
    pains: [
      {
        icon: <HeartPulse />,
        title: "A reply must not name a patient",
        text: "A public reply never says who is a patient or what was done. Drafts thank the reviewer and keep the details for a call.",
      },
      {
        icon: <Clock3 />,
        title: "Your hands are busy chairside",
        text: "Drafts wait in your email. Approve, edit or skip them between appointments or at the end of the day.",
      },
      {
        icon: <ClipboardList />,
        title: "Hours and phone must be right",
        text: "A wrong number on Google means missed calls. Google Protection emails you when it changes.",
      },
      {
        icon: <Camera />,
        title: "Photos need care",
        text: "Show the reception, the building and an empty surgery. A photo of a patient needs their written consent, which is yours to get.",
      },
    ],
    example: {
      label: "Example review and draft",
      lang: "English",
      name: "Tom",
      rating: 5,
      review: "I was nervous about going, but the whole team put me at ease. Easy to park, too.",
      reply:
        "Thank you for your kind words, Tom. The whole team will be glad to read this.\n\nSunrise Dental",
    },
    exampleNote:
      "Fictional example. The draft thanks the reviewer and does not confirm that he is a patient or mention any care.",
    photoTypes: [
      "The reception desk and the waiting room",
      "The outside of the practice and the sign",
      "A surgery room, empty and clean",
      "Your team, with their agreement. Never a patient.",
    ],
    careRules: [
      "A reply never confirms that the reviewer is a patient.",
      "A reply never mentions a treatment, a result or a diagnosis, or a before and after photo.",
      "A reply invites the person to call you, and the details stay in that call.",
    ],
    helps: [
      {
        icon: <ClipboardList />,
        title: "What needs attention",
        text: "A short list of what needs attention, marked Urgent, Recommended or Nice to have: hours, phone, website, categories, photos of the reception, the building and the surgery. Each item comes with a ready draft where Kabsi can write one.",
      },
      {
        icon: <MessageSquareReply />,
        title: "Careful reply drafts",
        text: "No medical claims, no personal details, no admissions of fault. Hard reviews get a calm draft and no quick Approve button.",
      },
      {
        icon: <ShieldCheck />,
        title: "Google Protection",
        text: "Watches your name, phone, address, hours, website and category, and emails you if one changes.",
      },
      {
        icon: <CalendarClock />,
        title: "Special hours",
        text: "Holidays and closures posted to Google in a minute, so patients don't arrive to a closed door.",
      },
      {
        icon: <Sparkles />,
        title: "Fresh posts, drafted",
        text: "A short Google post from the facts you gave Kabsi. You approve or skip it.",
      },
    ],
    placements: [
      "At the reception desk, next to the payment terminal.",
      "Printed QR on the appointment card or the aftercare sheet.",
      "Your review link in the follow-up email you already send.",
    ],
    care: {
      title: "Keep patient details out of public replies",
      text: "In many countries, health privacy rules (HIPAA in the US, for example) mean a public reply shouldn't confirm that someone is a patient or mention their care. Add \"Don't confirm the reviewer is a patient or mention any treatment\" under Anything Kabsi should never say, and Kabsi's drafts and safety check follow it.",
    },
    guide: { slug: "how-to-reply-to-google-reviews", title: "How to reply to Google reviews" },
    faqs: [
      {
        q: "Will a reply ever say the reviewer was our patient?",
        a: "No. Drafts thank the reviewer and do not confirm a visit, a treatment or a name from your records. You read every draft before it is published.",
      },
      {
        q: "Can Kabsi answer a complaint about a treatment?",
        a: "Kabsi drafts a calm reply that invites the person to call you. It does not discuss care in public, and that review has no quick Approve button.",
      },
      {
        q: "Can I post before and after photos?",
        a: "Kabsi checks each photo for size and clarity before you post it. A photo of a patient needs the patient's written consent, which is yours to get, so we suggest the reception, the building and the rooms.",
      },
    ],
  },
  {
    slug: "car-services",
    name: "car services",
    label: "Car services",
    icon: <Car />,
    hero: "garage",
    title: "Kabsi for car services | Calm Google profile care",
    description:
      "Kabsi keeps your garage's Google profile complete and current, with a calm reply draft for every review. Nothing is published without your approval.",
    h1: BRAND_LINE,
    sub: "Drivers pick a garage they can trust. Kabsi shows what to complete on your Google profile, drafts a calm reply to every review, watches your phone and hours and waits for your approval.",
    summary:
      "Kabsi keeps a garage or auto repair shop's Google Business Profile complete and current. It drafts a calm reply to every review. Drafts never argue, admit fault or promise money in public. Kabsi also alerts you when your phone number or hours change on Google.",
    headings: {
      pains: "Trust is everything for a garage.",
      example: "Calm replies, even when the bill is disputed.",
      helps: "What Kabsi handles for your garage.",
    },
    pains: [
      {
        icon: <Wrench />,
        title: "You're under a car all day",
        text: "Drafts reach your email ready to read. Approve them at the end of the day.",
      },
      {
        icon: <Receipt />,
        title: "Price disputes get heated",
        text: "Hard reviews get a calm draft that invites the customer to call, with no quick Approve button.",
      },
      {
        icon: <ClipboardList />,
        title: "Your number must be right",
        text: "A wrong phone number on Google sends calls elsewhere. Google Protection emails you when it changes.",
      },
      {
        icon: <CalendarClock />,
        title: "Holiday closures",
        text: "Special hours posted to Google in a minute.",
      },
    ],
    example: {
      label: "Example review and draft",
      lang: "English",
      name: "Chris",
      rating: 2,
      review: "The final bill was higher than the quote and nobody called me first.",
      reply:
        "Thank you for telling us, Chris. We're sorry the bill wasn't what you expected, and we'd like to go through it with you. Please call us at 555 0199.\n\nMike, Northside Auto",
    },
    exampleNote:
      "Fictional example. The draft doesn't argue, admit fault or offer money. It moves the talk to a phone call.",
    photoTypes: [
      "The workshop floor and the bays",
      "The front of the building and the forecourt",
      "Your team at work",
      "The waiting area and the reception desk",
    ],
    careRules: [
      "A reply never argues about a bill or promises money in public.",
      "A reply never admits fault for a repair; it invites the customer to call you.",
      "A price dispute is shown to you first, with no quick Approve button.",
    ],
    helps: [
      {
        icon: <ClipboardList />,
        title: "What needs attention",
        text: "A short list of what needs attention, marked Urgent, Recommended or Nice to have: hours, phone, services, photos of the workshop, a fresh post. Each item comes with a ready draft where Kabsi can write one.",
      },
      {
        icon: <MessageSquareReply />,
        title: "Calm reply drafts",
        text: "No arguing, no admissions of fault, no refunds or discounts promised in public.",
      },
      {
        icon: <ShieldCheck />,
        title: "Google Protection",
        text: "An email with before and after if your phone, hours, address or category change on Google.",
      },
      {
        icon: <CalendarClock />,
        title: "Special hours",
        text: "Holidays and closures posted to Google in a minute.",
      },
      {
        icon: <Sparkles />,
        title: "A Monday report",
        text: "Your Google rating, new reviews and replies, every Monday. Facts only.",
      },
    ],
    placements: [
      "On the counter where customers pay and collect their keys.",
      "Printed QR on the invoice.",
      'Your review link in the "your car is ready" message.',
    ],
    care: {
      title: "Ask every customer the same way",
      text: "Share the link with every customer who collects a car. Ask every customer the same way, as they visit. Never offer a reward.",
    },
    guide: {
      slug: "how-to-respond-to-negative-google-reviews",
      title: "How to respond to negative Google reviews",
    },
    faqs: [
      {
        q: "Will Kabsi argue with unfair reviews?",
        a: "No. Drafts stay calm, never argue and never admit fault. For hard reviews, Kabsi suggests moving the conversation to a phone call.",
      },
      {
        q: "Can Kabsi stop people editing my listing?",
        a: "No one can lock a Google listing. Kabsi watches your key details and emails you when one changes, and puts yours back only if you say so.",
      },
      {
        q: "How do I pay?",
        a: `${PRICES_SENTENCE} You can start with a 14-day Pro trial, no card. Prices are the same in every country. Card payments are coming. Until they open there is nothing to pay.`,
      },
    ],
  },
];

export const verticalBySlug = (slug: string) => VERTICALS.find((v) => v.slug === slug);

/** Old slugs that moved (D259). */
export const VERTICAL_REDIRECTS: Record<string, string> = {
  "restaurants-and-cafes": "restaurants",
  "cafes-and-bakeries": "cafes",
  "salons-and-barbers": "salons",
  "clinics-and-dentists": "clinics",
  "garages-and-auto-repair": "car-services",
};

/** Industry pages that no longer exist (P0.8-13): they send the visitor to the /for page. */
export const VERTICAL_GONE = ["hotels-and-guesthouses", "shops-and-boutiques", "florists"];

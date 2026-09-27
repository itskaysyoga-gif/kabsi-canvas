// Industry pages (D258): what Kabsi does for one kind of local business. Every sentence must pass the
// honesty rules (spec §3): no promises of reviews, ratings or rankings, no invented numbers, examples
// clearly labelled. Examples are fictional. Care notes only describe what the product really does.
import type { ReactNode } from "react";
import {
  BedDouble,
  CalendarClock,
  Camera,
  Car,
  ClipboardList,
  Clock3,
  Globe2,
  HeartPulse,
  Languages,
  MessageSquareReply,
  Receipt,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import type { PhotoId } from "@/lib/site-photos";

export type Vertical = {
  slug: string;
  /** Short name used in titles and links, e.g. "restaurants and cafés". */
  name: string;
  /** Menu label, e.g. "Restaurants and cafés". */
  label: string;
  icon: ReactNode;
  hero: PhotoId;
  /** Optional second photo, only when it differs from the hero. */
  side?: PhotoId;
  title: string;
  description: string;
  h1: string;
  sub: string;
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
  faqs: { q: string; a: string }[];
};

export const VERTICALS: Vertical[] = [
  {
    slug: "restaurants-and-cafes",
    name: "restaurants and cafés",
    label: "Restaurants and cafés",
    icon: <UtensilsCrossed />,
    hero: "restaurant",
    side: "cafe",
    title: "Kabsi for restaurants and cafés | Google review replies you approve",
    description:
      "Every Google review for your restaurant or café gets a reply drafted in the guest's language. Holiday hours, dish photos and a card on every table. You approve everything.",
    h1: "Your restaurant's Google profile, taken care of.",
    sub: "Reviews arrive during service. Kabsi drafts a reply in the guest's language and emails it to you, so you can post it later with one tap. Nothing goes on Google until you approve it.",
    pains: [
      {
        icon: <Clock3 />,
        title: "Reviews land during the rush",
        text: "Nobody writes replies between tables. A drafted reply waits in your email until you have a minute.",
      },
      {
        icon: <Languages />,
        title: "Guests write in many languages",
        text: "Tourists and locals review in their own language. Each draft is written in the language of the review.",
      },
      {
        icon: <CalendarClock />,
        title: "Hours change with holidays",
        text: "A wrong closing time on Google means a locked door and an unhappy guest. Special hours take a minute.",
      },
      {
        icon: <HeartPulse />,
        title: "Some complaints need care",
        text: "Illness or hygiene complaints get a calm draft and no quick Post button, so you read it first.",
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
    helps: [
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
        title: "Listing Shield",
        text: "If your phone number or hours change on Google, you get an email with before and after.",
      },
    ],
    placements: [
      "On each table, next to the menu or the salt and pepper.",
      "On the counter by the till or the coffee machine.",
      "Printed QR on the bill folder or the takeaway bag.",
    ],
    care: {
      title: "Ask every guest the same way",
      text: "Offer the card to everyone, not only happy tables, and never offer a free dessert or discount for a review. Google doesn't allow it and can remove those reviews.",
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
    slug: "clinics-and-dentists",
    name: "clinics and dentists",
    label: "Clinics and dentists",
    icon: <Stethoscope />,
    hero: "dentist",
    title: "Kabsi for dental and medical clinics | Careful Google review replies",
    description:
      "Calm, careful reply drafts for every Google review of your clinic, never posted without your approval. Keep your hours and phone accurate on Google.",
    h1: "Your clinic's Google profile, taken care of.",
    sub: "Patients read reviews before they book. Kabsi drafts a calm, professional reply to each one and waits for your approval. Replies never make medical claims.",
    pains: [
      {
        icon: <HeartPulse />,
        title: "Replies have to be careful",
        text: "A public reply should never discuss someone's care. Drafts stay general and invite the person to talk privately.",
      },
      {
        icon: <Clock3 />,
        title: "No time between patients",
        text: "Drafts reach your email ready to read. Post, edit or skip them when you have a moment.",
      },
      {
        icon: <ClipboardList />,
        title: "Hours and phone must be right",
        text: "A wrong number on Google means missed calls. Listing Shield emails you when it changes.",
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
    helps: [
      {
        icon: <MessageSquareReply />,
        title: "Careful reply drafts",
        text: "No medical claims, no personal details, no admissions of fault. Hard reviews get a calm draft and no quick Post button.",
      },
      {
        icon: <ShieldCheck />,
        title: "Listing Shield",
        text: "Watches your name, phone, address, hours, website and category, and emails you if one changes.",
      },
      {
        icon: <CalendarClock />,
        title: "Special hours",
        text: "Holidays and closures posted to Google in a minute, so patients don't arrive to a closed door.",
      },
      {
        icon: <Sparkles />,
        title: "A weekly update, drafted",
        text: "A short Google update from the facts you gave Kabsi, early in the week. You approve or skip it.",
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
        q: "Does Kabsi post replies automatically?",
        a: "No. Every reply waits for your approval, by email or in the dashboard. Nothing goes on Google until you tap Post.",
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
    slug: "salons-and-barbers",
    name: "salons and barbers",
    label: "Salons and barbers",
    icon: <Scissors />,
    hero: "salon",
    title: "Kabsi for hair salons and barbers | Google review replies you approve",
    description:
      "Reply drafts for every Google review of your salon, photos of your work checked before they go up, and a card at every station. Nothing is posted until you approve it.",
    h1: "Your salon's Google profile, taken care of.",
    sub: "Clients choose a salon by its reviews and photos. Kabsi drafts a reply to every review, checks your photos and keeps your hours right. You approve each one.",
    pains: [
      {
        icon: <Clock3 />,
        title: "Your hands are busy all day",
        text: "Drafts reach your email ready to go. Tap Post between clients, or later.",
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
      review: "Sam did an amazing job with my colour, exactly what I asked for. Will be back!",
      reply:
        "Thank you, Jordan! We're so happy you love your colour, and we'll pass your kind words on to Sam. See you next time.\n\nThe team at Studio Nine",
    },
    exampleNote:
      "Fictional example. The stylist's name is used because it's on the salon's staff list.",
    helps: [
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
        title: "Listing Shield",
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
      text: "Offer the card to everyone, and never trade a discount or a free treatment for a review. Google doesn't allow it and can remove those reviews.",
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
        q: "Do I need the NFC card?",
        a: "No. Every business gets a review link and a printable QR code. The card is optional.",
      },
    ],
  },
  {
    slug: "hotels-and-guesthouses",
    name: "hotels and guesthouses",
    label: "Hotels and B&Bs",
    icon: <BedDouble />,
    hero: "hotel",
    title: "Kabsi for hotels, guesthouses and B&Bs | Google replies in every language",
    description:
      "Guests review in many languages. Kabsi drafts a reply in each guest's language for every Google review, and you approve it before it's posted.",
    h1: "Your hotel's Google profile, taken care of.",
    sub: "Guests arrive from everywhere and review in their own language. Kabsi drafts a warm reply in that language for each review and waits for your approval.",
    pains: [
      {
        icon: <Globe2 />,
        title: "Reviews in many languages",
        text: "English, Spanish, French, Arabic and more. Each draft matches the language of the review.",
      },
      {
        icon: <Clock3 />,
        title: "Reception is always busy",
        text: "Drafts reach your email. Post them when the desk is quiet.",
      },
      {
        icon: <ClipboardList />,
        title: "Details must be exact",
        text: "Phone, address, website and check-in hours. Listing Shield emails you when one changes on Google.",
      },
      {
        icon: <CalendarClock />,
        title: "Seasons change the hours",
        text: "Reception or restaurant hours for holidays and low season, posted in a minute.",
      },
    ],
    example: {
      label: "Example review and draft",
      lang: "Français",
      name: "Sophie",
      rating: 5,
      review:
        "Séjour parfait, chambre très propre et un petit-déjeuner délicieux. L'équipe a été aux petits soins.",
      reply:
        "Merci beaucoup, Sophie. Nous sommes ravis que la chambre et le petit-déjeuner vous aient plu, et nous transmettrons vos mots à l'équipe. Au plaisir de vous accueillir à nouveau.\n\nHôtel des Tilleuls",
    },
    exampleNote: "Fictional example. The reply is written in the guest's language, French.",
    helps: [
      {
        icon: <Languages />,
        title: "Replies in the guest's language",
        text: "Drafted from your facts: check-in times, parking, breakfast hours. Nothing invented.",
      },
      {
        icon: <ShieldCheck />,
        title: "Listing Shield",
        text: "Watches your name, phone, address, hours, website and category.",
      },
      {
        icon: <Camera />,
        title: "Room photos, checked",
        text: "Clear photos of rooms, breakfast and the building, checked before you post them.",
      },
      {
        icon: <Sparkles />,
        title: "A Monday report",
        text: "Your Google rating, new reviews and how many got a reply, every Monday morning.",
      },
    ],
    placements: [
      "At the reception desk, where guests check out.",
      "In the room, next to the Wi-Fi details.",
      "Your review link in the thank-you email after the stay.",
    ],
    care: {
      title: "Ask every guest the same way",
      text: "Share the link with every guest, never only the happy ones, and never offer an upgrade or a discount for a review. Google doesn't allow it.",
    },
    guide: { slug: "how-to-reply-to-google-reviews", title: "How to reply to Google reviews" },
    faqs: [
      {
        q: "Which languages can Kabsi reply in?",
        a: "The language of each review, including English, Spanish, French and Arabic. You can edit any draft before posting.",
      },
      {
        q: "Does Kabsi work with booking sites?",
        a: "No. Kabsi works with your Google Business Profile only: Google reviews, posts, photos, hours and listing details.",
      },
      {
        q: "Can I use Kabsi without an NFC card?",
        a: "Yes. Your review link and QR code work on their own, for example in the email you send after checkout.",
      },
    ],
  },
  {
    slug: "garages-and-auto-repair",
    name: "garages and auto repair shops",
    label: "Garages and repairs",
    icon: <Car />,
    hero: "garage",
    title: "Kabsi for garages and auto repair shops | Calm Google review replies",
    description:
      "A calm reply draft for every Google review of your garage, hours and phone watched on Google, and a card at the counter. Nothing is posted until you approve it.",
    h1: "Your garage's Google profile, taken care of.",
    sub: "Drivers pick a garage they can trust. Kabsi drafts a calm reply to every review, watches your phone and hours on Google, and waits for your approval.",
    pains: [
      {
        icon: <Wrench />,
        title: "You're under a car all day",
        text: "Drafts reach your email ready to read. Post them at the end of the day.",
      },
      {
        icon: <Receipt />,
        title: "Price disputes get heated",
        text: "Hard reviews get a calm draft that invites the customer to call, with no quick Post button.",
      },
      {
        icon: <ClipboardList />,
        title: "Your number must be right",
        text: "A wrong phone number on Google sends calls elsewhere. Listing Shield emails you when it changes.",
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
    helps: [
      {
        icon: <MessageSquareReply />,
        title: "Calm reply drafts",
        text: "No arguing, no admissions of fault, no refunds or discounts promised in public.",
      },
      {
        icon: <ShieldCheck />,
        title: "Listing Shield",
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
      text: "Offer the card to everyone who collects a car, and never trade a discount for a review. Google doesn't allow it and can remove those reviews.",
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
        a: "Kabsi Pro is paid once, upfront, for 6 or 12 months. See the pricing page for payment methods.",
      },
    ],
  },
  {
    slug: "shops-and-boutiques",
    name: "shops and boutiques",
    label: "Shops and boutiques",
    icon: <ShoppingBag />,
    hero: "boutique",
    side: "florist",
    title: "Kabsi for shops, boutiques and florists | Google review replies you approve",
    description:
      "Reply drafts for every Google review of your shop, weekly updates for new arrivals, holiday hours and a card at the till. You approve everything.",
    h1: "Your shop's Google profile, taken care of.",
    sub: "Shoppers check Google before they visit. Kabsi drafts a reply to every review, drafts a short weekly update and keeps your holiday hours right. You approve each one.",
    pains: [
      {
        icon: <Clock3 />,
        title: "Serving customers comes first",
        text: "Drafts reach your email. Post, edit or skip them after closing.",
      },
      {
        icon: <Sparkles />,
        title: "New stock, nobody knows",
        text: "Tell Kabsi what's new in a sentence and it drafts a Google update with a button like Shop or Call.",
      },
      {
        icon: <CalendarClock />,
        title: "Holiday hours",
        text: "Late openings and closures posted to Google for the dates you choose.",
      },
      {
        icon: <Camera />,
        title: "Photos of the shop",
        text: "Window displays and new arrivals, checked before they go up.",
      },
    ],
    example: {
      label: "Example review and draft",
      lang: "English",
      name: "Priya",
      rating: 5,
      review: "Beautiful bouquet for my mum's birthday, and they wrapped it so nicely.",
      reply:
        "Thank you, Priya! We're so glad the bouquet was right for your mum's birthday. We hope to see you again soon.\n\nAnna, Bloom & Stem",
    },
    exampleNote:
      "Fictional example. The draft reflects what the customer said and adds nothing new.",
    helps: [
      {
        icon: <MessageSquareReply />,
        title: "A reply for every review",
        text: "In the customer's language, from your facts, never inventing offers or prices.",
      },
      {
        icon: <Sparkles />,
        title: "A weekly update, drafted",
        text: "Written from your facts before the weekend. You post it, change it or skip it.",
      },
      {
        icon: <CalendarClock />,
        title: "Special hours",
        text: "Holiday openings and closures posted in a minute.",
      },
      {
        icon: <ShieldCheck />,
        title: "Listing Shield",
        text: "An email if your phone, hours, address or website change on Google.",
      },
    ],
    placements: [
      "At the till, next to the card reader.",
      "Printed QR on the receipt or the gift tag.",
      "Your review link in order confirmations if you sell online too.",
    ],
    care: {
      title: "Ask every customer the same way",
      text: "Offer the card at every checkout, and never trade a discount or a gift for a review. Google doesn't allow it and can remove those reviews.",
    },
    guide: { slug: "google-review-link-and-qr-code", title: "Your Google review link and QR code" },
    faqs: [
      {
        q: "Will Kabsi post updates for me?",
        a: "Kabsi drafts one short update a week and emails it to you. Nothing is posted until you approve it, and you can switch weekly drafts off.",
      },
      {
        q: "Will updates mention prices or sales?",
        a: "Only what you tell Kabsi. It never invents prices, offers or dates.",
      },
      {
        q: "Does it work for more than one shop?",
        a: "Yes. Each shop is its own business in Kabsi, with its own profile, reviews and card.",
      },
    ],
  },
];

export const verticalBySlug = (slug: string) => VERTICALS.find((v) => v.slug === slug);

/** Business-type tile → the industry page it links to. */
export const VERTICAL_FOR_PHOTO: Partial<Record<PhotoId, string>> = {
  bakery: "restaurants-and-cafes",
  restaurant: "restaurants-and-cafes",
  cafe: "restaurants-and-cafes",
  dentist: "clinics-and-dentists",
  salon: "salons-and-barbers",
  hotel: "hotels-and-guesthouses",
  garage: "garages-and-auto-repair",
  boutique: "shops-and-boutiques",
  florist: "shops-and-boutiques",
};

// The words of the new website (P0.8-13, K-140). Plain text and numbers only, so the claims rule is checked on all of it in
// tests/website-home.test.ts: no dashes, no exclamation marks, no percent signs, no promise of rankings, more reviews or
// more customers, no number that is not Kabsi's own, and nothing that implies Google approves or partners with Kabsi (K-112).
// Anything that needs a WhatsApp number reads WHATSAPP_ON through the helpers below, so filling the one setting in
// supabase/functions/_shared/whatsapp-setting.ts switches every line with no code change.
import {
  CHECKOUT_LIVE,
  CTA_CHECK,
  CTA_PRIMARY,
  GOOGLE_NOTICE,
  KABSI_GROUP_ID,
  PLAN_PRICES,
  TAX_NOTE,
  WHATSAPP_ON,
} from "@/lib/site";
import { FAQ } from "@/lib/faq";

/** The sections of the homepage, in order. The page renders exactly this list (tests/website-home.test.ts). */
export const HOME_ORDER = [
  "hero",
  "how",
  "pillars",
  "whatsapp",
  "plans",
  "pricing",
  "control",
  "founder",
  "industries",
  "faq",
  "final",
] as const;
export type HomeSection = (typeof HOME_ORDER)[number];

/** The marker on a feature that is decided and not built, or built and waiting. No date, ever. */
export const COMING_SOON = "Coming soon";

export const PILLARS = [
  {
    id: "reviews",
    title: "Every review answered",
    text: "A reply is ready for every new review, in the reviewer's language, written only from the facts you gave Kabsi. A hard review gets a careful draft and no quick Approve button. You approve every reply.",
  },
  {
    id: "protected",
    title: "Your profile protected",
    text: "Kabsi watches your name, phone, address, hours, website and category. If one changes on Google you see before and after, and your details go back only if you say so.",
  },
  {
    id: "found",
    title: "Ready to be found",
    text: "Kabsi shows what a complete Google profile has and what yours is missing, with a plain reason for each. Photos, posts and holiday hours are prepared for you to approve. Kabsi makes it easy for customers to choose you, and never promises more reviews, calls or customers.",
  },
] as const;

export function howSteps(whatsappOn: boolean = WHATSAPP_ON) {
  return [
    {
      title: "Check your profile",
      text: "Find your business and see what customers see on Google. It is free, it uses public information only and it needs no sign-up.",
    },
    {
      title: "Add Kabsi as a Manager",
      text: `On Google, invite the Kabsi group ID ${KABSI_GROUP_ID} as a Manager, the way you would add a staff member. You stay the owner.`,
    },
    {
      title: "Approve replies from your phone",
      text: whatsappOn
        ? "Each new review arrives with a reply already written. Read it, change it if you like, and approve it on WhatsApp or in Kabsi."
        : "Each new review arrives with a reply already written. Read it, change it if you like, and approve it in one tap.",
    },
    {
      title: "Kabsi keeps watching",
      text: "Kabsi watches your listing, prepares posts and photos, and sends a Weekly Care Report. Nothing is published without your approval.",
    },
  ] as const;
}

export type PlanItem = { text: string; soon?: boolean };

/** The Essentials and Pro grid (K-126). A line marked soon carries "Coming soon" and no date. */
export function planGrid(whatsappOn: boolean = WHATSAPP_ON): {
  essentials: PlanItem[];
  proAdds: PlanItem[];
} {
  return {
    essentials: [
      { text: "Review alerts and a reply ready for each one" },
      { text: "Approve in the Kabsi app" },
      { text: "Approve on WhatsApp", soon: !whatsappOn },
      { text: "The day-one backlog of older reviews" },
      { text: "Google Protection with a one-tap Put it back" },
      { text: "Your review link and QR code, with a Message the manager page" },
      { text: "Send review link for your staff" },
      { text: "Holiday hours reminders" },
      { text: "The Weekly Care Report" },
      { text: "Business Knowledge, so Kabsi never makes up a fact" },
      { text: "Nora, who answers your questions" },
      { text: "The Profile Coach checklist" },
    ],
    proAdds: [
      { text: "Send photos on WhatsApp", soon: !whatsappOn },
      { text: "Weekly posts prepared for you" },
      { text: "Review graphics for your best reviews" },
      { text: "What customers say, a monthly summary", soon: true },
      { text: "The Profile Coach actions" },
      { text: "Your own order and booking button on Google", soon: true },
      { text: "The search terms report" },
      { text: "A Report a fake review helper" },
      { text: "Team roles and approval rules" },
    ],
  };
}

export const ESSENTIALS_FOR =
  "For a business that wants every review answered and its listing watched.";
export const PRO_FOR =
  "Everything in Essentials, plus posts, graphics and the Profile Coach actions.";

/** Where a plan button goes: the free Profile Check until Creem checkout is live, never a dead checkout. */
export function planButton(checkoutLive: boolean = CHECKOUT_LIVE): {
  to: "/google-profile-check" | "/start";
  label: string;
} {
  return checkoutLive
    ? { to: "/start", label: CTA_PRIMARY }
    : { to: "/google-profile-check", label: CTA_CHECK };
}

export const PRICE_LINES = {
  essentials: `$${PLAN_PRICES.essentialsMonthly} a month or $${PLAN_PRICES.essentialsYearly} a year`,
  pro: `$${PLAN_PRICES.proMonthly} a month or $${PLAN_PRICES.proYearly} a year`,
  extra: `$${PLAN_PRICES.extraLocationMonthly} a month or $${PLAN_PRICES.extraLocationYearly} a year`,
} as const;
export const TRIAL_BOX =
  "Try Pro free for 14 days. No card. Monthly plans cancel any time. Yearly plans are refunded in full within 14 days.";
export const PAYMENT_LINE =
  "You will pay by card, in US dollars. Card payments are coming. Until they open there is nothing to pay.";

export function whatsappText(whatsappOn: boolean = WHATSAPP_ON) {
  return {
    heading: "Approve a reply in two taps.",
    intro: whatsappOn
      ? "Each new review reaches your WhatsApp with the reply already written. Tap Approve and it goes to Google after a 10-second undo."
      : "Each new review will reach your WhatsApp with the reply already written. Tap Approve and it goes to Google after a 10-second undo. Kabsi has no WhatsApp number yet. Until it does, you approve in the Kabsi app and each new review reaches you by email.",
    canTitle: whatsappOn ? "What WhatsApp can approve" : "What WhatsApp will approve",
    can: ["Replies to low and medium risk reviews", "Your weekly posts"],
    cannotTitle: whatsappOn ? "What it never approves" : "What it will never approve",
    cannot: [
      "Replies to high-risk reviews",
      "Your business name, address, categories, map pin, phone and open or closed status",
    ],
    cannotNote: "Those open Kabsi, where you sign in.",
    foot: "Reply STOP at any time and nothing more is sent.",
  };
}

export const CONTROL_ITEMS = [
  {
    id: "ok",
    title: "Nothing is posted without your OK",
    text: "Every reply, post, photo and change waits for your approval, and you see the exact words first.",
  },
  {
    id: "password",
    title: "Never your Google password",
    text: "You invite Kabsi as a Manager on Google. Kabsi never asks for your password or a verification code, and never stores your Google sign-in.",
  },
  {
    id: "owner",
    title: "You stay the owner",
    text: "Kabsi has Manager access, not ownership. Your profile, your reviews and your customers stay yours.",
  },
  {
    id: "leave",
    title: "Disconnect any time",
    text: "Remove the Kabsi group under People and access on your Google profile. You do not need to ask us.",
  },
  {
    id: "independent",
    title: "Independent and not affiliated with Google",
    text: GOOGLE_NOTICE,
  },
] as const;

export const FOUNDER_NOTE =
  "I run Kabsi from Dubai. Nothing goes on your Google profile until you approve it, and you can remove Kabsi at any time. If you want to talk to a person, write to hello@kabsi.co.";

/** Proof the visitor can check without taking our word for it. There are no customer quotes, logos or numbers yet. */
export const PROOF_NOTE =
  "Kabsi is new and there are no customer quotes on this page yet. We add a quote only with the customer's written consent, and we show no logos or numbers that are not ours.";

function faqAnswer(q: string): string {
  const hit = FAQ.find((f) => f.q === q);
  if (!hit) throw new Error(`FAQ question missing: ${q}`);
  return hit.a;
}

/** The homepage questions (design review, section 10). */
export function homeFaq(whatsappOn: boolean = WHATSAPP_ON): { q: string; a: string }[] {
  return [
    {
      q: "Do you need my Google password?",
      a: "No. You add Kabsi as a Manager on your Google Business Profile, the way you would add a staff member. Kabsi never asks for your password or a verification code.",
    },
    {
      q: "Can Kabsi post without me?",
      a: "No. Kabsi prepares replies, posts and photos, and you approve each one. Nothing reaches Google without your approval.",
    },
    {
      q: "Can I remove Kabsi?",
      a: "Yes, at any time, under People and access on your Google profile. You stay the owner, and you do not need to ask us.",
    },
    {
      q: "What can WhatsApp approve?",
      a: whatsappOn
        ? "Replies to low and medium risk reviews and your weekly posts, with a 10-second undo. Never replies to high-risk reviews, and never your business name, address, categories, map pin, phone or open or closed status. Those open Kabsi, where you sign in."
        : "WhatsApp is coming soon. When it opens it will approve replies to low and medium risk reviews and your weekly posts, with a 10-second undo. It will never approve replies to high-risk reviews or your business name, address, categories, map pin, phone or open or closed status. Today you approve in the Kabsi app.",
    },
    {
      q: "How is this different from Gemini?",
      a: faqAnswer("How is this different from Gemini in Business Profile?"),
    },
    {
      q: "What happens when the trial ends?",
      a: "Kabsi tells you from day 11 and shows you the plans. If the trial ends with no plan, Kabsi keeps watching and drafting for 7 days but publishes nothing, then it stops. Your review link and QR code keep working. Card payments are coming, and until they open there is nothing to pay.",
    },
  ];
}

/** The pricing page questions (design review, "Pricing page"). Plain text, because they also feed the FAQPage JSON-LD. */
export function pricingFaq(whatsappOn: boolean = WHATSAPP_ON): { q: string; a: string }[] {
  return [
    {
      q: "What is the difference between Essentials and Pro?",
      a: `Essentials answers your reviews and watches your listing: review alerts with a reply ready, the backlog of older reviews, Google Protection with a one-tap Put it back, your review link and QR code, holiday hours reminders, the Weekly Care Report, Business Knowledge, Nora and the Profile Coach checklist. Pro adds weekly posts, review graphics, the Profile Coach actions, the search terms report, a Report a fake review helper, team roles and approval rules${
        whatsappOn ? ", photos sent on WhatsApp" : ""
      }, and two things that are coming soon: a monthly What customers say summary and your own order and booking button${whatsappOn ? "" : ". Sending photos on WhatsApp is coming soon too"}.`,
    },
    {
      q: "How does the free trial work?",
      a: `You try Pro free for 14 days with no card. It starts when Kabsi's access to your Google profile works. From day 11 Kabsi shows you the plans. If the trial ends with no plan, Kabsi keeps watching and drafting for 7 days but publishes nothing, then it stops, and your review link and QR code keep working.`,
    },
    {
      q: "How do I pay?",
      a: `By card, in US dollars, and nothing else. Card payments are coming, and until they open there is nothing to pay. Prices are $${PLAN_PRICES.essentialsMonthly} a month or $${PLAN_PRICES.essentialsYearly} a year for Essentials and $${PLAN_PRICES.proMonthly} a month or $${PLAN_PRICES.proYearly} a year for Pro, ${TAX_NOTE}.`,
    },
    {
      q: "Is there a free plan?",
      a: "No. After a trial you choose Essentials or Pro. Your review link and QR code, and the free Google Profile Check, stay free for everyone and keep working with no plan.",
    },
    {
      q: "Can I add a second location?",
      a: `Yes. One plan covers one Google profile. Each extra location is $${PLAN_PRICES.extraLocationMonthly} a month or $${PLAN_PRICES.extraLocationYearly} a year.`,
    },
    {
      q: "Can I cancel or get a refund?",
      a: "Monthly plans cancel any time and run to the end of the month you paid for. Yearly plans are refunded in full within 14 days of the plan starting. Write to hello@kabsi.co.",
    },
    {
      q: "Is the price the same in every country?",
      a: `Yes, in US dollars, ${TAX_NOTE}.`,
    },
  ];
}

/** The operating loop in plain words (design review, "How it works"). */
export const LOOP = [
  {
    title: "Kabsi watches",
    text: "It reads your new reviews and watches your name, phone, address, hours, website and category on Google.",
  },
  {
    title: "Kabsi prepares",
    text: "It writes a reply for each review from the facts you gave it, and prepares posts, photos and holiday hours.",
  },
  {
    title: "Kabsi asks",
    text: "Each one waits for you with the exact words and what will happen if you approve.",
  },
  {
    title: "Kabsi publishes",
    text: "Only what you approved goes to Google, after a 10-second undo, and Kabsi checks that Google shows it.",
  },
  {
    title: "Kabsi reports",
    text: "The Weekly Care Report says what changed, what was answered and what still needs you. Facts only.",
  },
] as const;

export const CAN = [
  "Read your reviews and prepare a reply for each one",
  "Watch your listing and show you what changed",
  "Prepare posts, photos and holiday hours for you to approve",
  "Publish what you approved, and check that Google shows it",
  "Be removed by you at any time",
] as const;

export const CANNOT = [
  "See your Google password, or ask for it",
  "Post, reply or change anything without your approval",
  "Lock your listing or stop people suggesting edits to Google",
  "Remove a review, or promise that Google will",
  "Promise more reviews, calls or customers",
] as const;

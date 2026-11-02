import {
  FOUNDING_SENTENCE,
  KABSI_GROUP_ID,
  KABSI_GROUP_NAME,
  PRICES_SENTENCE,
  WHATSAPP_ON,
} from "@/lib/site";

// The shared FAQ (COPY.md section 16), numbered as there.
export const FAQ: { q: string; a: string }[] = [
  {
    q: "Does Kabsi need my Google password?",
    a: "No. You add Kabsi as a Manager on your Google profile. You stay the owner and can remove Kabsi any time.",
  },
  {
    q: "Is anything posted without me?",
    a: "No. Every reply, post and change waits for your yes on WhatsApp.",
  },
  {
    q: "What if I already reply to reviews myself?",
    a: "Keep going. Kabsi drafts a reply for each new review, and you can edit or skip any of them.",
  },
  {
    q: "Can Kabsi promise where I come up on Google Maps?",
    // Fix 1: the nearby check is not open yet, so "where you show up" is said as at launch.
    a: "No one can promise that. Kabsi shows what changed on your profile and what you can do next. Where you come up nearby opens at launch.",
  },
  { q: "Can I edit replies?", a: "Yes. Tap Edit on WhatsApp or on the Kabsi website." },
  {
    q: "Is this safe with Google?",
    a: "Kabsi uses Google's tools for managers and only acts after your yes. Kabsi is independent and not affiliated with Google.",
  },
  {
    q: "What happens after the trial?",
    a: "Choose a plan to keep going. If you do not, Kabsi stops publishing and you keep your review link and QR code.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, any time. Your plan runs to the end of the period you paid for.",
  },
  {
    q: "Where does the ranking data come from?",
    a: "Kabsi runs its own checks of public Google Maps and AI answers. They are separate from the numbers in your Google Business Profile.",
  },
  { q: "Is my data safe?", a: "Yes. Read how Kabsi handles it on the Privacy page." },
  // 11, from the outside review (master plan 30.16 section 5): the honest answer.
  {
    q: "Can't I do this myself for free?",
    a: "Yes. Your Google profile is free, and you can reply to reviews and update it yourself. The subscription pays for the ongoing work: Kabsi keeps checking, drafts the replies and posts, follows up, and brings each one to you on WhatsApp for a yes.",
  },
];

// Web 4 (Design 8): the fourth question on Home is "Can I cancel?".
export const HOME_FAQ = [11, 1, 4, 8];

/** Pricing's "Billing questions" (Design 8), checked against the facts (4.3, 4.5, which cancel is which). With the shared FAQ
 * because the route head builds the FAQPage data from them. */
export const BILLING_FAQ: { q: string; a: string }[] = [
  {
    q: "Do I need a card for the trial?",
    a: "No. The trial is 14 days of Pro with no card, one per business. It starts when Kabsi's access to your Google profile works.",
  },
  {
    q: "What happens after the trial?",
    a: "Choose a plan to keep going. If you do not, Kabsi keeps watching and drafting for 7 more days and publishes nothing. Your review link and QR code keep working.",
  },
  FAQ[7]!,
  {
    q: "Which cancel is which?",
    a: "Cancelling on the Plan page ends your plan at the end of the period you paid for, and everything keeps working until then. Cancelling in Creem's own billing page ends the plan at once.",
  },
  {
    q: "Can I get a refund?",
    a: "Yearly plans are refundable in full within 14 days of the plan starting. A monthly plan runs to the end of the month paid for. Write to hello@kabsi.co.",
  },
  {
    q: "Can I pay today?",
    a: "Nothing to pay today. Card payments in US dollars are coming. Payments are processed by Creem, our merchant of record.",
  },
];

/** /faq on Design 8 (Web 4c): five groups, every answer checked against knowledge/kabsi-facts.md (COPY.md 38 lists the
 * answers changed to the facts). With the shared FAQ because the route head builds the FAQPage data from it, word for
 * word. The WhatsApp answers follow the WhatsApp switch, so the launch needs no change here. */
export type FaqGroup = { id: string; title: string; items: { q: string; a: string }[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "start",
    title: "Getting started",
    items: [
      {
        q: "What does the free check show?",
        a: "What customers see on your Google profile today and what to do first: your opening hours, how many reviews you have and your rating, your photos, your website and phone, and your category. It takes about 10 seconds and needs no access.",
      },
      {
        q: "How do I add Kabsi to my Google profile?",
        a: `On Google, open your profile (search your business name while signed in), then Menu, Business Profile settings, People and access, Add. Paste ${KABSI_GROUP_ID}, choose Manager, then Add (on some screens, Invite). ${KABSI_GROUP_ID} is ${KABSI_GROUP_NAME}, Kabsi's business group on Google. Never send us a password or a code.`,
      },
      {
        q: "Which businesses can use Kabsi?",
        a: "A business with a verified Google profile that you own or manage: a place customers visit during stated hours, or a business that travels to its customers with a service area. Online-only businesses are not eligible on Google.",
      },
      FAQ[2]!,
      {
        q: "Can't I do this myself for free?",
        a: "Yes. Your Google profile is free, and you can reply to reviews and update it yourself. The subscription pays for the ongoing work: Kabsi keeps checking, drafts the replies and posts, follows up, and brings each one to you for a yes.",
      },
    ],
  },
  {
    id: "google",
    title: "Google and control",
    items: [
      FAQ[0]!,
      {
        q: "Is anything posted without me?",
        a: "No. Every reply, post and change waits for your yes. Kabsi sends it to Google, checks it is live, and tells you if anything did not go through.",
      },
      FAQ[5]!,
      FAQ[3]!,
      {
        q: "How do I remove Kabsi?",
        a: `In your Google profile, open People and access and remove ${KABSI_GROUP_NAME}. Kabsi stops at once. Cancelling a plan never removes Kabsi's access by itself; removing it is your choice.`,
      },
    ],
  },
  {
    id: "plans",
    title: "Plans and billing",
    items: [
      {
        q: "What does Kabsi cost?",
        a: `${PRICES_SENTENCE} ${FOUNDING_SENTENCE} Both plans are free for 14 days, with no card.`,
      },
      {
        q: "When does the trial start?",
        a: "When Kabsi's access to your Google profile works, so waiting for access costs you nothing. The trial is 14 days of Pro, one per business.",
      },
      BILLING_FAQ[1]!,
      {
        q: "Can I cancel?",
        a: "Yes, any time. Your plan runs to the end of the period you paid for. Monthly plans can be cancelled at any time. Yearly plans are refundable within 14 days.",
      },
      {
        q: "Can I run more than one location?",
        a: "Yes. Each extra location is $15 a month or $150 a year, on the same plan.",
      },
      BILLING_FAQ[5]!,
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    items: WHATSAPP_ON
      ? [
          {
            q: "Does Kabsi have a WhatsApp number?",
            a: "Yes. Message Kabsi on WhatsApp, or write to hello@kabsi.co.",
          },
          {
            q: "Can I approve a reply or a post on WhatsApp?",
            a: "Yes. Every reply, post and change waits for your yes on WhatsApp.",
          },
          {
            q: "Will Kabsi send me alerts on WhatsApp?",
            a: "Only after your yes, and you can reply STOP at any time.",
          },
          {
            q: "Does Kabsi message my customers?",
            a: "No. Kabsi talks only to you. It gives you a review link and a QR card, and you send them.",
          },
          {
            q: "Will Kabsi ever ask for my Google password or a code on WhatsApp?",
            a: "Never, on WhatsApp or anywhere else.",
          },
        ]
      : [
          {
            q: "Does Kabsi have a WhatsApp number?",
            a: "Yes. It is being tested and opens to owners at launch. Until then write to hello@kabsi.co, and a person answers, not a bot.",
          },
          {
            q: "Can I approve a reply or a post on WhatsApp?",
            a: "Not yet. WhatsApp opens at launch. Until then you approve on kabsi.co.",
          },
          {
            q: "Will Kabsi send me alerts on WhatsApp?",
            a: "Not yet; email is the only alert channel today. WhatsApp alerts will need your yes first, and you can reply STOP at any time.",
          },
          {
            q: "Does Kabsi message my customers?",
            a: "No. Kabsi talks only to you. It gives you a review link and a QR card, and you send them.",
          },
          {
            q: "Will Kabsi ever ask for my Google password or a code on WhatsApp?",
            a: "Never, on WhatsApp or anywhere else.",
          },
        ],
  },
  {
    id: "privacy",
    title: "Privacy and data",
    items: [
      {
        q: "Is my data safe?",
        a: "Kabsi's database is in Frankfurt. The privacy policy lists every provider. Data is encrypted in transit.",
      },
      {
        q: "Does Kabsi use my reviews to train AI?",
        a: "No. Review text and business facts go to Anthropic's API for drafts and checks, and Anthropic does not train on them. Kabsi never uses Google data to train AI models.",
      },
      {
        q: "What does the free check keep?",
        a: "What Google shows about the business is shown to you and not kept; Kabsi keeps only the business's Google Place ID. If you ask for the result by email or join the waiting list, Kabsi keeps your email address too.",
      },
      {
        q: "Can I delete my data?",
        a: "Yes. Business data is deleted 7 days after a deletion request. Write to hello@kabsi.co.",
      },
      {
        q: "Does Kabsi sell my data?",
        a: "No. Kabsi does not sell or rent personal data and does not use it for advertising.",
      },
    ],
  },
];

/** Every FAQ answer on /faq, in order, for the FAQPage data. */
export const FAQ_ALL = FAQ_GROUPS.flatMap((g) => g.items);

/** "Questions about Founding 25" on /founding, and its FAQPage data. */
export const FOUNDING_FAQ = [
  {
    q: "What happens after 90 days?",
    a: "You choose a plan at the founding price, kept while your subscription stays paid, or you stop. Nothing is charged by itself.",
  },
  {
    q: "What goes in a case study?",
    a: "Your words, the work Kabsi did from its own records (replies published, posts, details fixed) and only the numbers you choose to share from your own Google screens. Named or anonymous, and you approve the final text.",
  },
  {
    q: "Why by application?",
    a: "So the 25 cover the kinds of business Kabsi serves, and every place goes to someone who will use it every week.",
  },
  {
    q: "Can I leave before the 90 days end?",
    a: "Any time. Remove Kabsi from your Google profile and tell Rashid.",
  },
];

/** "Questions partners ask" on /partners, and its FAQPage data. */
export const PARTNER_FAQ = [
  {
    q: "When do I get paid?",
    a: "On the 5th of each month, once at least $25 has cleared its 30-day hold, with a statement.",
  },
  { q: "How?", a: "USDT or USDC, or PayPal." },
  { q: "What do businesses I refer get?", a: "30 days of Pro free instead of 14, no card." },
  {
    q: "Can I see who joined?",
    a: "You see the trade and area. The name only if the owner says yes.",
  },
];

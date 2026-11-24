// The 20 questions of master plan 28.7: Nora on the new position (maps, AI answers, competitors, review requests, what
// the free check shows, what each plan holds). Same shape and rules as questions.ts (60 questions, which stay as they
// are, so the "Nora gate (60 questions)" job keeps its name and its count). The live run asks all 80.
// Everything about the new product was [COMING] when this was written; the Visibility Map and AI Visibility were live
// from 5 Nov 2026 (Go live 1). SITE-1 (blueprint 3.1 of 24 Nov 2026, R-163) switched off the map, the nearby rank checks,
// the AI answer checks and Competitor Watch, and replaced Essentials and Pro with one plan: the asks stay as owners write
// them, and the reference answers now say what Kabsi does instead. An answer that still describes a retired feature as
// available (a 7 by 7 grid, keywords or prompts per plan, ChatGPT checks, 5 competitors on Pro, a launch price) fails.
import {
  INCLUDED,
  OLD_PRICES,
  ONE_PLAN_ONLY,
  ONE_PRICE,
  PLAN_NAME_PRICED,
  PRICE,
  RETIRED_PRICES,
  TRIAL,
  type Question,
} from "./questions.ts";

// "Kabsi doesn't guarantee any ranking" is the honest answer: a guarantee only counts when nothing negates it just before.
const NOT_PROMISED =
  /(?<!n['’]t\s)(?<!\bnot\s)(?<!\bnever\s)(?<!\bno\s)(?<!\bcannot\s)\bguarantee[sd]?\b|\b(we will get you|you will rank|top of google|#1|number one)\b/i;

// The retired features, as the facts mark them now.
const MAP_OFF =
  /\*\*\[RETIRED\]\*\* \*\*Visibility Map\*\*[^\n]*Kabsi runs no local rank scans and makes no ranking claim\./;
const AI_OFF = /\*\*\[RETIRED\]\*\* \*\*AI Visibility\*\*[^\n]*Kabsi checks no AI answers\./;
const SWITCHED_OFF =
  /\*\*Never offer what is switched off\.\*\* The visibility map, nearby rank checks, AI answer checks \(ChatGPT, Perplexity, Gemini\)/;
const COMPETITORS =
  /Once a month, a live read of 3 nearby businesses' current rating and review count from Google\. No history is kept/;
const OLD_WATCH =
  /The older Competitor Watch plan \(more competitors, alerts, history\) is \*\*\[RETIRED\]\*\*/;
const SAYS_OFF = /switched off|not available|no longer/i;

export const QUESTIONS_28: Question[] = [
  // ── the Visibility Map (retired 24 Nov 2026, SITE-1) ─────────────────────────────────────────────────────────────
  {
    id: "n61",
    lang: "en",
    topic: "the Visibility Map",
    ask: "Can Kabsi show me where my shop appears on Google Maps around my street?",
    kb: [MAP_OFF, COMPETITORS],
    // SITE-1: the honest answer is no, and what Kabsi does instead; a grid answer fails.
    must: [SAYS_OFF, /3 nearby/],
    forbid: [NOT_PROMISED, /\b(7 by 7|49 (places|points)|grid)\b/i, /^\s*(yes|sure)\b/i],
    reference:
      "No. The visibility map was switched off on 24 Nov 2026 and is not available: Kabsi runs no local rank scans and makes no ranking claim. What Kabsi does instead is a monthly live read of 3 nearby businesses' current rating and review count, beside your own, with no history kept.",
  },
  {
    id: "n62",
    lang: "en",
    topic: "map keywords per plan",
    ask: "How many keywords can I track on the map with Essentials and with Pro?",
    kb: [MAP_OFF, RETIRED_PRICES],
    must: [SAYS_OFF],
    forbid: [/\b(1|5) (keywords?|search terms?)\b/i, PLAN_NAME_PRICED],
    reference:
      "None. The visibility map and its keyword checks were switched off on 24 Nov 2026 and are not available, and Kabsi runs no local rank scans. There is no Essentials or Pro any more. Kabsi has one plan, 29 US dollars a month per location.",
  },
  {
    id: "n63",
    lang: "en",
    topic: "map grid size",
    ask: "How far out does the map check go for a dental clinic?",
    kb: [MAP_OFF, COMPETITORS],
    must: [SAYS_OFF],
    forbid: [/\b\d+ ?km\b/i],
    reference:
      "Kabsi no longer runs a map check: the visibility map was switched off on 24 Nov 2026 and is not available. For a dental clinic Kabsi looks after the Google profile itself: a reply to every review, the listing checked every day, and a monthly live read of 3 nearby businesses' current rating and review count.",
  },
  {
    id: "n64",
    lang: "en",
    topic: "a promised map position",
    ask: "If I pay for Pro, will you get me into the top 3 on Google Maps?",
    kb: [/it never promises a position, reviews, calls or customers/, RETIRED_PRICES],
    forbid: [/\b(yes|we will|you will)\b[^.]*\btop 3\b/i, NOT_PROMISED, /nearby check shows/i],
    reference:
      "No. Kabsi never promises a position, reviews, calls or customers, and there is no Pro any more, only one plan. Kabsi looks after your reviews and your Google profile and shows you what it did, without saying a change happened because of Kabsi.",
  },
  // ── AI answers (retired 24 Nov 2026, SITE-1) ─────────────────────────────────────────────────────────────────────
  {
    id: "n65",
    lang: "en",
    topic: "AI Visibility",
    ask: "Do you check whether ChatGPT recommends my restaurant?",
    kb: [AI_OFF, SWITCHED_OFF],
    must: [/ChatGPT/, /switched off|not available|checks no/i],
    forbid: [/^\s*(yes|sure)\b/i, /\bKabsi (asks|runs|checks) ChatGPT\b/i],
    reference:
      "No. Kabsi checks no AI answers: the checks on ChatGPT, Perplexity and Gemini were switched off on 24 Nov 2026 and are not available. Kabsi looks after your Google profile itself: every review answered, the listing protected and proof of the work.",
  },
  {
    id: "n66",
    lang: "en",
    topic: "AI prompts per plan",
    ask: "How many AI questions are checked on each plan?",
    kb: [AI_OFF, PRICE],
    must: [/switched off|not available|none/i],
    forbid: [/\b(3|10) prompts\b/i, PLAN_NAME_PRICED],
    reference:
      "None. There is one plan, and Kabsi checks no AI answers: the AI answer checks were switched off on 24 Nov 2026 and are not available.",
  },
  {
    id: "n67",
    lang: "es",
    topic: "AI Visibility in Spanish",
    ask: "¿Kabsi revisa si Perplexity menciona mi negocio?",
    gloss: "Does Kabsi check whether Perplexity mentions my business?",
    kb: [SWITCHED_OFF, AI_OFF],
    must: [/Perplexity/, /no está disponible|desactiv/i],
    forbid: [/^\s*s[ií]\b/i],
    reference:
      "No. Kabsi ya no revisa respuestas de asistentes de IA: la revisión en ChatGPT, Perplexity y Gemini se desactivó el 24 de noviembre de 2026 y no está disponible. Kabsi cuida tu perfil de Google: responde cada reseña, protege tu ficha y te muestra el trabajo hecho.",
  },
  // ── competitors (changed 24 Nov 2026, SITE-1: a monthly live read of 3 nearby businesses) ────────────────────────
  {
    id: "n68",
    lang: "en",
    topic: "Competitor Watch",
    ask: "Can I keep an eye on the salon across the road?",
    kb: [COMPETITORS, OLD_WATCH],
    must: [/\b3\b/, /rating/i, /review count/i],
    forbid: [/\b5\b/, /\bEssentials\b|\bon Pro\b/i, /picked? (by you )?from the map/i],
    coming: true,
    reference:
      "In part. Once a month Kabsi reads 3 nearby businesses' current rating and review count from Google, and keeps no history. The older Competitor Watch, with more competitors, alerts and history, is retired and not available. The read is shown in the full monthly report, which is not available yet.",
  },
  {
    id: "n69",
    lang: "en",
    topic: "competitor data source",
    ask: "Where does the competitor information come from, and do you share my data with them?",
    kb: [COMPETITORS, /Nobody outside your team sees your business in Kabsi/],
    forbid: [/\bwe share\b/i, /map results/i],
    coming: true,
    reference:
      "It comes from Google: once a month Kabsi reads 3 nearby businesses' current rating and review count, live, and keeps no history. Nobody outside your team sees your business in Kabsi. That read is shown in the full monthly report, which is not available yet.",
  },
  {
    id: "n70",
    lang: "fr",
    topic: "Competitor Watch in French",
    ask: "Est-ce que je peux suivre mes concurrents avec Kabsi ?",
    gloss: "Can I follow my competitors with Kabsi?",
    kb: [COMPETITORS, OLD_WATCH],
    must: [/\b3\b/],
    forbid: [/\b5\b/, /\bEssentials\b|\bPro\b/],
    coming: true,
    reference:
      "En partie. Une fois par mois, Kabsi lit sur Google la note et le nombre d'avis actuels de 3 entreprises proches, sans garder d'historique. Ce relevé figure dans le rapport mensuel complet, qui n'est pas encore disponible. L'ancien suivi des concurrents, avec plus de concurrents, des alertes et un historique, n'est pas disponible.",
  },
  // ── review requests ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "n71",
    lang: "en",
    topic: "Ask a customer",
    ask: "Can Kabsi text my customers to ask them for a review?",
    kb: [/Kabsi never messages the customer/],
    must: [/never messages|(doesn't|does not|never) (message|text)/i],
    // Scope 1: the honest answer is a plain no today (Kabsi does not message customers), not a feature that is coming, so
    // the answer is not required to say "not yet" (Eval 1 row, n71's coming flag).
    reference:
      'No, Kabsi does not message your customers. Today you can use your review link and QR code, and you send them yourself, the same message to every customer. Ask a customer works on WhatsApp once you have connected it: you send "ask a customer" and Kabsi sends you back a ready message to forward from your own phone.',
  },
  {
    id: "n72",
    lang: "en",
    topic: "asking only happy customers",
    ask: "Can I send the review link only to customers who were happy?",
    kb: [/no rating question first, no rewards, no per-staff quotas and no review gating/],
    forbid: [/\b(yes|sure|of course)\b[^.]*\bonly\b[^.]*happy/i],
    reference:
      "No. Asking only happy customers is review gating, which Google does not allow. The same message goes to every customer, with no rating question first, no rewards and no per-staff quotas.",
  },
  {
    id: "n73",
    lang: "en",
    topic: "rewards for reviews",
    ask: "Could I give a free coffee to anyone who leaves a review?",
    kb: [
      /Never suggest rewards for reviews: discounts, free items, gifts, prizes, upgrades or entries into a draw/,
    ],
    forbid: [/\b(yes|sure|good idea)\b/i],
    reference:
      "No. Google does not allow rewards for reviews, so Kabsi never suggests discounts, free items, gifts, prizes or upgrades for a review. Ask every customer the same way, for example with your review link or QR code.",
  },
  {
    id: "n74",
    lang: "en",
    topic: "Review Growth today",
    ask: "What can I use today to get more reviews?",
    kb: [/the review link, the QR card and the staff Send review link \(live today\)/],
    must: [/review link/i, /QR/],
    forbid: [/review goal/i],
    reference:
      "Today you have your review link, the QR card, the staff Send review link and, once WhatsApp is connected, Ask a customer.",
  },
  // ── the free check ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "n75",
    lang: "en",
    topic: "what the free check shows",
    ask: "What does the free Google Profile Check show me?",
    // SITE-1: what the free check shows from 24 Nov 2026.
    kb: [
      /the free check shows: your rating and review count beside 3 nearby businesses; listing basics \(hours, phone, website, category, photos\); whether your website and booking link load now/,
    ],
    must: [/rating/i, /opening hours/i, /3 nearby/],
    reference:
      "It shows your rating and review count beside 3 nearby businesses, the listing basics (opening hours, phone, website, category and photos), whether your website and booking link load now, the reply Kabsi would write for your latest review, and what Kabsi would do each month. It uses public information only, has no score and changes nothing on your profile.",
  },
  {
    id: "n76",
    lang: "en",
    topic: "free check and unanswered reviews",
    ask: "Will the free check tell me how many reviews I haven't answered?",
    kb: [/the check never reports a count of unanswered reviews or a gap in posts/],
    forbid: [/\byes\b/i],
    reference:
      "No. Public information does not show which reviews have a reply, so the free check never reports a count of unanswered reviews. Kabsi reads that once you connect your profile.",
  },
  {
    id: "n77",
    lang: "en",
    topic: "free check limits",
    ask: "How many free checks can I run in a day?",
    kb: [/3 checks a day per visitor/],
    must: [/\b3\b/],
    reference: "You can run 3 free checks a day. It is free and needs no sign-up.",
  },
  // ── the one plan (SITE-1: Essentials and Pro, the yearly and launch prices and the no-card trial are retired) ────
  {
    id: "n78",
    lang: "en",
    topic: "what each plan holds",
    ask: "What do I get with Essentials compared with Pro?",
    kb: [ONE_PLAN_ONLY, INCLUDED],
    must: [/one plan/i, /2 posts a month/],
    forbid: [OLD_PRICES, PLAN_NAME_PRICED, /a post every week|weekly posts/i],
    reference:
      "There is no Essentials or Pro any more: Kabsi has one plan. It includes a reply to every review, alerts for bad reviews, your listing checked every day, your website and booking link checked every day, holiday hours, up to 2 posts a month and photos from your phone, the review link, QR code and counter card tools, and a weekly summary and a monthly report.",
  },
  {
    id: "n79",
    lang: "en",
    topic: "do prices change",
    ask: "With all these new features, are the prices going up?",
    kb: [
      PRICE,
      /Kabsi may change prices for future purchases\. A plan already paid for keeps its price\./,
    ],
    must: [ONE_PRICE],
    forbid: [OLD_PRICES, /launch price/i],
    coming: true,
    reference:
      "There is one plan, 29 US dollars a month per location, and there is no public discount or special offer. Kabsi may change prices for future purchases, and a plan already paid for keeps its price. Card payments are not open yet, so nothing can be bought today.",
  },
  {
    id: "n80",
    lang: "ar",
    topic: "the trial on the new plans",
    ask: "هل توجد فترة تجربة مجانية للخطط الجديدة؟",
    gloss: "Is there a free trial for the new plans?",
    kb: [TRIAL],
    must: [/14/, /بطاقة/],
    forbid: [/بدون بطاقة|دون بطاقة|لا تحتاج بطاقة|\bPro\b/],
    reference:
      "نعم، أول 14 يوما مجانا، ثم 29 دولارا أمريكيا في الشهر حتى تلغي. يلزم إدخال بطاقة للبدء، وإذا ألغيت قبل اليوم الرابع عشر لا تدفع شيئا. تبدأ التجربة عندما يعمل وصول كابسي إلى ملفك على Google.",
  },
];

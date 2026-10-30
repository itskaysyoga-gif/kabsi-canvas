// The 20 questions of master plan 28.7: Nora on the new position (maps, AI answers, competitors, review requests, what
// the free check shows, what each plan holds). Same shape and rules as questions.ts (60 questions, which stay as they
// are, so the "Nora gate (60 questions)" job keeps its name and its count). The live run asks all 80.
// Everything about the new product is [COMING]: the answer says it is not available yet and gives no date.
import type { Question } from "./questions.ts";

// "Kabsi doesn't guarantee any ranking" is the honest answer: a guarantee only counts when nothing negates it just before.
const NOT_PROMISED =
  /(?<!n['’]t\s)(?<!\bnot\s)(?<!\bnever\s)(?<!\bno\s)(?<!\bcannot\s)\bguarantee[sd]?\b|\b(we will get you|you will rank|top of google|#1|number one)\b/i;

export const QUESTIONS_28: Question[] = [
  // ── the Visibility Map ───────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "n61",
    lang: "en",
    topic: "the Visibility Map",
    ask: "Can Kabsi show me where my shop appears on Google Maps around my street?",
    kb: [/\*\*\[COMING\] Visibility Map:\*\* a 7 by 7 grid around the business/],
    // Eval 1: owners never read "grid" (30.15 section 1), so the 49 checked places say it as well.
    must: [/grid|49 (places|points)|7 by 7/i],
    forbid: [NOT_PROMISED],
    coming: true,
    reference:
      "That is the Visibility Map, and it is not available yet. It will show a 7 by 7 grid around your business with where you appear on Google Maps for a keyword you confirm, the average position, the share of the grid where you are in the top 3, and who appears above you. Kabsi shows what it measured and never promises a position.",
  },
  {
    id: "n62",
    lang: "en",
    topic: "map keywords per plan",
    ask: "How many keywords can I track on the map with Essentials and with Pro?",
    kb: [/\| Visibility Map \| 1 keyword, monthly \| 5 keywords, weekly \|/],
    // Eval 1: "search term" is the owner's word for a keyword since 30.15.
    must: [/\b1 (keyword|search term)/i, /\b5 (keywords|search terms)/i],
    coming: true,
    reference:
      "The Visibility Map is not available yet. When it is, Essentials will check 1 keyword a month and Pro 5 keywords every week.",
  },
  {
    id: "n63",
    lang: "en",
    topic: "map grid size",
    ask: "How far out does the map check go for a dental clinic?",
    kb: [/about 1 km for a cafe, 3 km for a salon, 5 km for a clinic or auto repair/],
    must: [/5 km/],
    coming: true,
    reference:
      "The Visibility Map is not available yet. The grid will be wider for a trade where customers travel further: about 5 km for a clinic, 3 km for a salon and 1 km for a cafe.",
  },
  {
    id: "n64",
    lang: "en",
    topic: "a promised map position",
    ask: "If I pay for Pro, will you get me into the top 3 on Google Maps?",
    kb: [/it never promises a position, reviews, calls or customers/],
    forbid: [/\b(yes|we will|you will)\b[^.]*\btop 3\b/i, NOT_PROMISED],
    reference:
      "No. Kabsi never promises a position, reviews, calls or customers. It looks after your reviews and your listing, and once the Visibility Map is available it will show what it measured and what changed, without saying a change happened because of Kabsi.",
  },
  // ── AI answers ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "n65",
    lang: "en",
    topic: "AI Visibility",
    ask: "Do you check whether ChatGPT recommends my restaurant?",
    kb: [
      /\*\*\[COMING\] AI Visibility:\*\* questions written in customers' words are run on ChatGPT and Perplexity/,
    ],
    must: [/ChatGPT/],
    coming: true,
    reference:
      "That is AI Visibility, and it is not available yet. Kabsi will ask ChatGPT and Perplexity questions in your customers' words and record whether your business is named, where, which competitors are named and which sources are cited. It is shown as a sample, because AI answers change from one run to the next.",
  },
  {
    id: "n66",
    lang: "en",
    topic: "AI prompts per plan",
    ask: "How many AI questions are checked on each plan?",
    kb: [/\| AI Visibility \| 3 prompts, monthly \| 10 prompts, every 2 weeks \|/],
    must: [/\b3\b/, /\b10\b/],
    coming: true,
    reference:
      "AI Visibility is not available yet. Essentials will check 3 prompts a month and Pro 10 prompts every 2 weeks.",
  },
  {
    id: "n67",
    lang: "es",
    topic: "AI Visibility in Spanish",
    ask: "¿Kabsi revisa si Perplexity menciona mi negocio?",
    gloss: "Does Kabsi check whether Perplexity mentions my business?",
    kb: [/run on ChatGPT and Perplexity/],
    must: [/Perplexity/],
    coming: true,
    reference:
      "Eso será AI Visibility y todavía no está disponible. Kabsi hará preguntas con las palabras de sus clientes en ChatGPT y Perplexity, y anotará si su negocio aparece, en qué lugar y qué competidores y fuentes se citan.",
  },
  // ── competitors ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "n68",
    lang: "en",
    topic: "Competitor Watch",
    ask: "Can I keep an eye on the salon across the road?",
    kb: [
      /\*\*\[COMING\] Competitor Watch:\*\* 3 competitors on Essentials and 5 on Pro, picked by the owner from the map results/,
    ],
    must: [/\b3\b/, /\b5\b/],
    coming: true,
    reference:
      "That will be Competitor Watch, and it is not available yet. You will pick 3 competitors on Essentials or 5 on Pro from the map results, and Kabsi will follow their rating, review count, new reviews a month, reply rate, posts, photos and main category, with an alert when one moves.",
  },
  {
    id: "n69",
    lang: "en",
    topic: "competitor data source",
    ask: "Where does the competitor information come from, and do you share my data with them?",
    kb: [/picked by the owner from the map results/],
    forbid: [/\bwe share\b/i],
    coming: true,
    reference:
      "Competitor Watch is not available yet. It will use the public map results, and the competitors are the ones you pick from those results. Kabsi never shows your own Google data to anyone else.",
  },
  {
    id: "n70",
    lang: "fr",
    topic: "Competitor Watch in French",
    ask: "Est-ce que je peux suivre mes concurrents avec Kabsi ?",
    gloss: "Can I follow my competitors with Kabsi?",
    kb: [/3 competitors on Essentials and 5 on Pro/],
    must: [/\b3\b/, /\b5\b/],
    coming: true,
    reference:
      "Ce sera Competitor Watch, qui n'est pas encore disponible. Vous choisirez 3 concurrents avec Essentials ou 5 avec Pro dans les résultats de la carte, et Kabsi suivra leur note, leur nombre d'avis, leurs nouveaux avis par mois et leur taux de réponse.",
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
      "No, Kabsi does not message your customers. Today you can use your review link and QR code, and you send them yourself, the same message to every customer. Ask a customer, where you share a customer's contact in WhatsApp and Kabsi sends you back a ready message to forward from your own phone, is not available yet.",
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
    reference:
      "Today you have your review link, the QR card and the staff Send review link. The rest of Review Growth, such as a monthly review goal and Ask a customer, is not available yet.",
  },
  // ── the free check ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "n75",
    lang: "en",
    topic: "what the free check shows",
    ask: "What does the free Google Profile Check show me?",
    kb: [
      /rating, number of reviews, opening hours and whether it is open now, phone, website, category and whether the profile has photos/,
    ],
    must: [/rating/i, /opening hours/i],
    reference:
      "It shows what customers see on Google, from public information only: your rating, number of reviews, opening hours and whether you are open now, phone, website, category and whether the profile has photos. Each item is a plain flag: Needs fixing, Worth fixing or After you connect. It changes nothing on your profile.",
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
  // ── prices per plan ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "n78",
    lang: "en",
    topic: "what each plan holds",
    ask: "What will I get with Essentials compared with Pro under the new plans?",
    kb: [
      /\| Posts and photos \| Holiday hours, 2 posts a month, photos from WhatsApp \| Weekly posts, photos from WhatsApp \|/,
      /\| Team roles and approval rules \| No \| Yes \|/,
    ],
    must: [/Essentials/, /Pro/],
    coming: true,
    reference:
      "The new plan contents are not available yet. Essentials and Pro will both have unlimited review replies, WhatsApp approvals, Google Protection and Review Growth. Essentials will have the Visibility Map with 1 keyword monthly, 3 AI prompts monthly, 3 competitors monthly, holiday hours and 2 posts a month. Pro will have 5 keywords weekly, 10 prompts every 2 weeks, 5 competitors weekly, weekly posts, the monthly PDF, and team roles and approval rules.",
  },
  {
    id: "n79",
    lang: "en",
    topic: "do prices change",
    ask: "With all these new features, are the prices going up?",
    kb: [
      /The first 30 paying businesses pay the founding price and keep it while they stay subscribed: Essentials \$19 a month/,
    ],
    must: [/\$29/, /\$19/],
    coming: true,
    reference:
      "The list prices are Essentials $29 a month or $290 a year and Pro $59 a month or $590 a year. The first 30 paying businesses pay the founding price, Essentials $19 or Pro $39 a month, and keep it while they stay subscribed. The plans cannot be bought yet, because card payments are not open yet.",
  },
  {
    id: "n80",
    lang: "ar",
    topic: "the trial on the new plans",
    ask: "هل توجد فترة تجربة مجانية للخطط الجديدة؟",
    gloss: "Is there a free trial for the new plans?",
    kb: [/The trial stays \*\*14 days of Pro, no card\*\*/],
    must: [/14/],
    reference:
      "نعم، التجربة 14 يوما من خطة Pro بدون بطاقة، وتبدأ عندما يعمل وصول كابسي إلى ملفك على Google.",
  },
];

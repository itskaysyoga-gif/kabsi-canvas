// Three review risk levels (K-13, P0.3-03). Code rules run first, then the small model (classify.v2, reply.ts); the
// higher level wins. Low drafts normally; medium drafts carefully and shows the issue on top; high gets no draft, a
// short checklist, and a neutral holding reply only when the owner asks for one.
// This file is pure (no imports): src/lib/review-risk.ts shows the same sentences and tests/review-risk.test.ts keeps
// the two equal.

export type Risk = "low" | "medium" | "high";
export type Industry = "health" | "legal" | "financial";

/** Every reason Kabsi can give, its level, and the sentence the owner reads. Stored as keys in reviews.risk_reasons;
 *  the sentences never quote the review (they outlive its text, K-113.3). */
export const RISK_REASONS = {
  legal_threat: { level: "high", issue: "They mention a lawyer or legal action." },
  discrimination: { level: "high", issue: "They say they were treated unfairly because of who they are." },
  health_safety: { level: "high", issue: "They describe an illness, an injury, an allergy or a safety problem." },
  threat: { level: "high", issue: "The review contains a threat." },
  harassment: { level: "high", issue: "They describe harassment." },
  privacy: { level: "high", issue: "They mention their personal data or privacy." },
  regulator: { level: "high", issue: "They mention a regulator, an inspection or a report to the authorities." },
  crime: { level: "high", issue: "They accuse someone of a crime." },
  refund: { level: "medium", issue: "They mention a refund. Kabsi didn't promise one." },
  staff_complaint: { level: "medium", issue: "They complain about someone on your team. The reply names no one." },
  disputed_fact: { level: "medium", issue: "They say something about your business that may not be right. The reply doesn't confirm or deny it." },
  complaint: { level: "medium", issue: "They are unhappy with their experience. The reply stays calm and doesn't argue." },
  low_rating: { level: "medium", issue: "They gave a low rating. The reply stays calm and doesn't argue." },
  regulated_industry: { level: "medium", issue: "Your business is in health, legal or financial services, so the reply never confirms they were a patient or client." },
} as const satisfies Record<string, { level: Risk; issue: string }>;

export type RiskReason = keyof typeof RISK_REASONS;
export const isReason = (k: unknown): k is RiskReason => typeof k === "string" && k in RISK_REASONS;

/** The checklist an owner sees for a high-risk review (K-13). No draft is offered. */
export const HIGH_RISK_TITLE = "This review needs a little more care.";
export const HIGH_RISK_CHECKLIST = [
  "Don't reply straight away. A calm reply later is better than a quick one now.",
  "Check what happened with your team, in private.",
  "If it mentions an illness, an injury or legal action, speak to your insurer or adviser before you reply.",
  "Never share the customer's details or discuss what happened in public.",
  "When you are ready, write your own reply, or ask Kabsi for a short, neutral holding reply.",
];

const RANK: Record<Risk, number> = { low: 0, medium: 1, high: 2 };
export const higher = (a: Risk, b: Risk): Risk => (RANK[b] > RANK[a] ? b : a);
export const isRisk = (v: unknown): v is Risk => v === "low" || v === "medium" || v === "high";

// Code rules. English first, then Spanish, French and Arabic (script and the common Arabizi spellings). A match only
// ever raises the level; the model can raise it further, never lower it.
const RULES: [RiskReason, RegExp][] = [
  ["legal_threat", /\b(lawyers?|attorneys?|solicitors?|lawsuits?|(going to|will|gonna|i'll|we'll|i will) sue|suing|sued|(take|taking|see) (you|them|this place) to court|in court|court case|legal action|small claims|abogad[oa]s?|demanda(r|ré)?|tribunal|avocats?|proc[eè]s|poursuites?|en justice)\b|محام|دعوى|محكمة|\bm[7h]ami\b/i],
  ["discrimination", /\b(racis[tm]\w*|discrimin\w*|sexis[tm]|homophob\w*|islamophob\w*|antisemit\w*|bigot\w*|because (of )?(my|i'?m|i am) (race|religion|skin|colou?r|disability|accent|hijab|black|muslim|jewish|gay|disabled|a woman)|racista|raciste)\b|عنصري|تمييز/i],
  ["health_safety", /\b(food poisoning|poison(ed|ing)?|got sick|made (me|us|my \w+) (sick|ill)|sick (after|from)|ill (after|from)|vomit\w*|threw up|diarrh\w*|hospital(s|ized|ised)?|emergency room|allerg\w*|anaphyla\w*|epipen|injur\w*|bleeding|chok(ed|ing)|salmonella|e\.? ?coli|listeria|cockroach\w*|rats?|mice|insects? in|glass in|intoxicaci[oó]n|enferm[oa]s?|alergi[ae]|intoxication|malade|allergi\w*|empoisonn\w*|bless[eé]s?)\b|تسمم|مريض|مستشفى|حساسية|صرصور|جرذ|فأر|\btasamom\b|\btasammum\b/i],
  ["threat", /\b(kill you|hurt you|watch your back|you('ll| will) (pay|regret)|burn (it|this place|the place) down|te voy a (matar|buscar)|vas a pagar|tu vas (le )?payer|je vais te (tuer|retrouver))\b|سأقتل|رح اقتل|بقتلك/i],
  ["harassment", /\b(harass\w*|stalk(ed|ing|er)|grop(ed|ing)|touched me|sexual\w*|acos(o|ad[oa])|harc[eè]l\w*)\b|تحرش/i],
  ["privacy", /\b(privacy|gdpr|data breach|leak(ed)? my|shared my (number|address|details|data|photo|information)|posted my (photo|picture|number|address)|filmed me|recorded me|personal (data|information|details)|privacidad|datos personales|vie priv[ée]e|donn[ée]es personnelles)\b|خصوصية|بياناتي/i],
  ["regulator", /\b(health (department|inspector|inspection)|inspector|ministry of (health|economy|tourism)|trading standards|consumer protection|better business bureau|bbb|food standards|fda|report(ed|ing)? (you|them|this place|this) to|sanidad|protecci[oó]n al consumidor|dgccrf|r[eé]pression des fraudes|inspection sanitaire)\b|حماية المستهلك|وزارة الصحة|وزارة الاقتصاد/i],
  ["crime", /\b(theft|thie(f|ves)|stole|stolen|robbed|robbery|scam(mers?|med)?|fraud\w*|police|cops|ladr[oó]n(es)?|robo|estafa\w*|policía|voleurs?|vol[ée]s?|arnaque\w*|escroc\w*)\b|سرقة|سرقوا|حرامي|نصاب|احتيال|شرطة|\b[7h]arame\b/i],
  ["refund", /\b(refund\w*|money back|reimburs\w*|chargeback|reembols\w*|devoluci[oó]n|rembours\w*)\b|استرداد|استرجاع المبلغ|رجعولي المصاري/i],
  ["staff_complaint", /\b(rude|unprofessional|disrespectful|impolite|arrogant|yelled|shouted|bad attitude|attitude problem|ignored (me|us)|maleducad[oa]s?|groser[oa]s?|descort[eé]s|impoli\w*|malpoli\w*|irrespectueu\w*)\b|قليل ادب|قليلة ادب|وقح|ما في احترام/i],
  ["disputed_fact", /\b(false advertising|misleading|not as (described|advertised|pictured)|(says|said|listed|shows|showed) (you('re| are) )?open but|(wrong|incorrect) (hours|price|prices|address|phone|information)|publicidad engañosa|publicit[eé] mensong[eè]re)\b|اعلان كاذب|إعلان كاذب/i],
  ["complaint", /\b(terrible|awful|horrible|worst|disappoint\w*|never again|not coming back|won'?t be back|waste of|overpriced|dirty|filthy|bad (service|experience|food)|p[eé]sim[oa]|decepci\w*|nunca m[aá]s|d[ée]çu\w*|d[ée]cevant|jamais plus)\b|سيء|سيئ|زفت|ما بنصح|مقرف|\bkhara\b/i],
];

/** The industry from the Google category (K-13). Health, legal and financial businesses are at least medium. */
export function industryOf(categories: (string | null | undefined)[]): Industry | null {
  const text = categories.filter(Boolean).join(" ").toLowerCase().replace(/_/g, " ");
  if (!text) return null;
  if (/\b(dentist|dental|orthodont\w*|doctor|physician|medical|clinic|hospital|health|pharmac\w*|physiotherap\w*|chiropract\w*|optometr\w*|optician|psycholog\w*|psychiatr\w*|therap\w*|dermatolog\w*|pediatr\w*|paediatr\w*|gyn\w*|surgeon|surgery|nurse|nursing|veterinar\w*|vet|laborator\w*|radiolog\w*|cardiolog\w*|counsel\w*)\b/.test(text)) return "health";
  if (/\b(lawyer|attorney|law firm|legal|notary|solicitor|barrister|paralegal)\b/.test(text)) return "legal";
  if (/\b(bank|accountant|accounting|financ\w*|insurance|tax|mortgage|loan|investment|credit union|wealth|broker)\b/.test(text)) return "financial";
  return null;
}

export type RiskResult = { risk: Risk; reasons: RiskReason[] };

/** Step 1, code only: the review's words, the rating and the industry. */
export function riskByRules(review: { rating: number; comment: string | null }, industry: Industry | null): RiskResult {
  const text = (review.comment ?? "").normalize("NFKC");
  const reasons: RiskReason[] = RULES.filter(([, re]) => re.test(text)).map(([k]) => k);
  if (review.rating <= 3) reasons.push("low_rating");
  if (industry) reasons.push("regulated_industry");
  return { risk: levelOf(reasons), reasons: order(reasons) };
}

export const levelOf = (reasons: RiskReason[]): Risk => reasons.reduce<Risk>((r, k) => higher(r, RISK_REASONS[k].level), "low");

/** High reasons first, then medium, in the table's order, without repeats. */
export function order(reasons: RiskReason[]): RiskReason[] {
  const keys = Object.keys(RISK_REASONS) as RiskReason[];
  return [...new Set(reasons)].sort((a, b) => RANK[RISK_REASONS[b].level] - RANK[RISK_REASONS[a].level] || keys.indexOf(a) - keys.indexOf(b));
}

/** Step 2: the model's answer merged in. The higher level wins; unknown reasons and levels are ignored. */
export function mergeRisk(code: RiskResult, model: { risk?: unknown; reasons?: unknown }): RiskResult {
  const modelReasons = Array.isArray(model.reasons) ? model.reasons.filter(isReason) : [];
  const reasons = order([...code.reasons, ...modelReasons]);
  let risk = higher(code.risk, levelOf(reasons));
  if (isRisk(model.risk)) risk = higher(risk, model.risk);
  return { risk, reasons };
}

/** The sentences shown on top of a medium or high review (at most `max`). A low rating alone says so; next to a more
 *  specific reason it adds nothing. */
export function issueLines(reasons: readonly string[], max = 2): string[] {
  const known = order(reasons.filter(isReason));
  const specific = known.filter((k) => k !== "low_rating" && k !== "regulated_industry");
  const pick = [...(specific.length ? specific : known.filter((k) => k === "low_rating")), ...known.filter((k) => k === "regulated_industry")];
  return pick.slice(0, max).map((k) => RISK_REASONS[k].issue);
}

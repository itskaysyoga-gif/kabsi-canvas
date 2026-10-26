// What the WhatsApp agent says (session 13b part 1). Plain words for owners (kabsi-copy skill): no em or en dashes, no
// exclamation marks, the business named first on anything that can change Google, one clear action per message.
// Each role has its own Nora voice (29.7): Kabsi's assistant for unknown phones and prospects, the owner's helper for
// owners, managers and staff, the partner desk for partners, and short ops lines for staff_admin.
// English first (K-119). The few lines below in Spanish and Arabic answer people who write in those languages; nothing
// here is shown on the website or in marketing (R-61, 27.6).

export type Lang = "en" | "es" | "ar";

export const SAY = {
  // 24.8: a chat that arrives without the scan code.
  greeting:
    "Welcome to Kabsi. Did you just scan your business on kabsi.co? Send me your business name or the code from the page and I will pick up from there.",
  scanPicked: (code: string) =>
    `Thanks, I have your scan ${code}. Your full map comes here as soon as it is ready. Kabsi is free for 14 days, no card: kabsi.co/get-started`,
  scanByName: (name: string) =>
    `Thanks. I will run the scan for ${name} here as soon as maps are switched on for WhatsApp. Until then you can scan your business at kabsi.co and send me the code from the page.`,
  mapComing:
    "Your full map is being made. It comes here as soon as it is ready.",
  partnerCodeNoted: "Welcome to Kabsi. You came through a Kabsi Partner, so your free Pro trial is 30 days, no card. Start here: kabsi.co/get-started",
  unknownHelp:
    "I am Nora, Kabsi's assistant. Kabsi looks after your Google listing from WhatsApp: a reply ready for every review, your listing kept right, and nothing goes live without your yes.\n\nYou can send: your business name for a free scan, \"prices\", \"start free\", \"partner\" or \"talk to a person\".",
  prices:
    "Kabsi is free for 14 days, no card. Then Essentials is 19 US dollars a month and Pro is 39 US dollars a month, with an extra location at 15. Card payments open soon. Details: kabsi.co/pricing",
  // 13b part 2 (judged 25 Oct): only what the facts say is open today; WhatsApp for owners and Partners are not open yet.
  trial: "Start free here, no card, about 10 minutes: kabsi.co/get-started. The free trial starts once Kabsi can reach your Google listing.",
  partnerProgram:
    "Kabsi Partners is not open yet. When it opens, a partner earns 25 percent of every payment for as long as the business pays. Read more: kabsi.co/partners",
  needsAccount: "That needs a Kabsi account for your business. Start free, no card: kabsi.co/get-started",

  // Binding (9.2).
  connected: "Kabsi is connected. Messages for your business will come here. Reply STOP at any time to stop them.",
  staffBound: "This phone is now Kabsi's staff phone. Send \"status\", \"waiting\", \"today\", \"pause\" followed by a business name, or \"help\".",
  badCode: "That code did not work. Open Kabsi, go to Settings, What Kabsi tells you, and press Connect WhatsApp again.",
  phoneInUse: "This phone is already connected to another Kabsi account. Disconnect it there first, then send the code again.",
  stopped: "You will get no more WhatsApp messages from Kabsi. Reply START at any time to turn them on again.",
  started: "Welcome back. Your Kabsi messages are on again. Send \"help\" to see what you can do here.",

  // Roles (29.7).
  whichRole: "Your business or your partner tools?",
  whichRoleStaff: "Your business or Kabsi staff tools?",
  whichBusiness: "Which business?",
  whichBusinessList: (names: string[]) =>
    `Which business? Reply with the number.\n\n${names.map((n, i) => `${i + 1}. ${n}`).join("\n")}`,
  switched: (to: string) => `Done. You are now working on ${to}. Send "switch" to change it.`,
  partnerOnly: "Partner tools are for Kabsi Partners. Send \"partner\" to hear about the program.",
  businessOnly: "Business tools are for businesses on Kabsi. Your partner tools: \"my link\", \"how am I doing\", \"kit\", \"payout\".",
  roleNotAllowed: (role: string) => `As ${role} you can send photos and news here. The owner approves everything that goes to Google.`,
  billingOwnerOnly: "Only the owner can change the plan and billing.",

  // Owner tools (9.3).
  ownerHelp:
    "You can send:\n\"stats\" or \"this month\"\n\"review link\" or \"QR\"\n\"ask a customer\" for a ready review message\na photo for your Google profile\na voice note or a message about what is new\n\"reply:\" and your exact reply to the last review\na change to the last draft, for example \"make it shorter\"\n\"switch\" to change business\n\"talk to a person\"",
  staffHelp: "You can send photos here for the owner to approve, \"ask a customer\" for the review message, or \"talk to a person\".",
  stats: (business: string, days: number, s: { new_reviews: number; answered: number; waiting: number; average: number | null }) =>
    `${business}, the last ${days} days: ${s.new_reviews} new ${s.new_reviews === 1 ? "review" : "reviews"}${s.average ? `, average ${s.average} stars` : ""}, ${s.answered} answered through Kabsi. ${s.waiting} waiting for you.`,
  reviewLink: (business: string, url: string) =>
    `${business}: your review link is ${url}\n\nShare it with every customer, the same way for everyone.`,
  noReviewLink: (business: string) => `${business} has no review link yet. Make one in Kabsi under Get Reviews.`,
  qr: (business: string, url: string) =>
    `${business}: your printable QR card is in Kabsi under Get Reviews. It opens this link: ${url}`,
  billingSoon: "Billing is coming soon, reply 'talk to a person' for help",
  // Session 10 (10.2.10): the owner's billing actions. Prices come from the Creem catalogue; dates are long dates.
  billingNoPlan: (business: string, url: string) => `${business} has no paid plan right now. Choose your plan here: ${url}`,
  billingStatus: (business: string, plan: string, end: string | null, ends: boolean) =>
    `${business} is on ${plan}. ${end ? (ends ? `It ends on ${end}.` : `It renews on ${end}.`) : ""} Reply "card", "invoice", "upgrade", "add a location" or "cancel".`.replace(/\s+/g, " "),
  billingPortal: (business: string, url: string) => `${business}: your card, invoices and receipts are here: ${url}`,
  billingCancelAsk: (end: string | null) => `Cancel your plan? It ends on ${end ?? "the last day you paid for"}, and everything keeps working until then.`,
  billingCancelled: (end: string | null) => `Done. Your plan ends on ${end ?? "the last day you paid for"}. Changed your mind? Tap Keep my plan.`,
  billingAlreadyEnds: (end: string | null) => `Your plan already ends on ${end ?? "the last day you paid for"}. Tap Keep my plan to carry on.`,
  billingKept: "Done. Your plan carries on.",
  billingUpgradeAsk: (price: string) => `Switch to Pro for ${price}? Creem charges the difference for the rest of this period today.`,
  billingUpgraded: "Done. You are on Pro now.",
  billingDowngradeAsk: (price: string, end: string | null) => `Switch to Essentials for ${price} from your next renewal${end ? `, ${end}` : ""}? You keep Pro until then.`,
  billingDowngraded: (end: string | null) => `Done. Essentials starts${end ? ` on ${end}` : " at your next renewal"}.`,
  billingSamePlan: (plan: string) => `You are already on ${plan}.`,
  billingAddAsk: (price: string) => `Add a location for ${price}? Creem charges the rest of this period today.`,
  billingAdded: (n: number) => `Done. Your plan now has ${n} extra ${n === 1 ? "location" : "locations"}.`,
  billingTryLater: "The payment service did not answer. Please try again in a minute, or reply \"talk to a person\".",
  handoff: "Thanks. A person from Kabsi will answer you here within one business day.",
  // 13b part 2 (30.10 point 7): hours and typed posts approved on WhatsApp, shown back exactly first (25.5).
  hoursShown: (business: string, line: string) => `${business}: Kabsi will set these hours on Google after your yes.\n\n${line}`,
  hoursAsk: "Which day, and what hours? For example: \"closed tomorrow\", \"open 10am to 2pm on Friday\" or \"closed 24 to 26 December\".",
  hoursNeedTimes: "What time do you open and close that day? For example: \"open 9am to 5pm\".",
  hoursBadTime: "Those times do not work: the closing time must come after the opening time. For example: \"open 9am to 5pm on Friday\".",
  hoursPast: "That day has already passed. Which day do you mean?",
  hoursTooFar: "Kabsi can set hours up to a year ahead. Which day do you mean?",
  hoursWeekly: (business: string, url: string) =>
    `${business}: a lasting change to your weekly hours is confirmed on kabsi.co, so you see exactly what Google will show. Open Hours: ${url}`,
  postAsk: (business: string) =>
    `${business}: send the words of the post starting with "post:", for example "post: Our autumn menu starts on Monday." Or send a photo with a short note.`,
  postShown: (business: string, text: string) => `${business}: Kabsi will post this on your Google listing after your yes.\n\n"${text}"`,
  postProblem: (business: string, problems: string[]) =>
    `${business}: Kabsi cannot post that as it is, because it ${problems.join(" and ")}. Please send it again without that.`,
  approverOnly: (business: string) => `Your role at ${business} cannot approve this. The owner can, on WhatsApp or on kabsi.co.`,
  notConnectedYet: (business: string, url: string) => `Kabsi cannot change ${business} on Google yet. Open your Kabsi account to finish setting up: ${url}`,
  // The map on WhatsApp (28.5, docs/COPY.md 0.1 and 20): places around you, never spots.
  keywordAsk: (business: string, keyword: string) =>
    `${business}: your first map is next. Kabsi will search '${keyword}' on Google Maps from places around you, like a customer standing there. Is that what your customers search for?`,
  keywordAskOpen: (business: string) =>
    `${business}: your first map is next. What would a customer type into Google Maps to find you? For example "bakery" or "dentist".`,
  keywordBad: "Please send the search as a customer would type it, in a few words. For example \"bakery\" or \"dentist\".",
  keywordSet: (business: string, keyword: string) =>
    `Done. Kabsi is searching '${keyword}' around ${business} now. Your map comes here within 5 minutes.`,
  keywordNoPlan: (business: string) => `${business}: maps come with a Kabsi plan. Choose yours on kabsi.co.`,
  keywordNotFound: (business: string) => `Kabsi could not find ${business} on Google Maps for that search. Send another search, for example "bakery".`,
  keywordLimit: (business: string) => `${business} already has the most searches its plan includes. You can change them on kabsi.co.`,
  keywordPaused: "Maps are paused for a moment. Kabsi will send yours as soon as they run again.",
  mapLater: "Okay. Your map stays in your Kabsi account on kabsi.co.",
  mapGone: "That map is no longer here. Your latest map is in your Kabsi account on kabsi.co.",
  editStarted: "On it. A new draft is coming.",
  noRecentReview: "Which review do you mean? Open the latest review alert and tap Edit in app, or send \"help\".",
  exactShown: (business: string, text: string) =>
    `${business}: Kabsi will post this reply on Google after your yes.\n\n"${text}"`,
  newDraft: (business: string, text: string) => `${business}: here is the new draft.\n\n"${text}"`,
  approved: (business: string) => `Approved for ${business}. It goes to Google in 10 seconds. Press Undo to stop it.`,
  undone: "Undone. Nothing was sent. The draft is waiting for you in Kabsi.",
  tooLate: "It has already gone to Google, so it cannot be undone here. Open Kabsi to see it.",
  alreadyHandled: "This one is already handled. Nothing changed.",
  notYours: "This is no longer yours to approve. Nothing changed.",
  whichOne: "Which one?",
  nothingWaiting: "Nothing is waiting for your yes right now.",
  noted: "Okay, nothing was changed.",
  onIt: "On it.",
  unclear: "I did not catch that. You can send \"help\" to see what you can do here, or \"talk to a person\".",
  abuseNotice: "Kabsi will not reply to messages like this. If you need help, send \"talk to a person\".",

  // Media (18.3, 28.3).
  photoTaken: "Got it. Kabsi is getting your photo ready and will ask you here in a minute: Yes, Edit or Skip. Nothing goes on Google until you say yes.",
  photoTakenStaff: "Thank you. Kabsi is getting the photo ready, and the owner is asked to approve it. Nothing goes on Google until they say yes.",
  photoUnreadable: "Please send it as a photo.",
  photoCategoryAsk: (menu: string) => menu,
  photoCategorySet: (label: string) => `Done. It will go on your Google profile as ${label}. Put it on your Google profile?`,
  photoCategoryBad: "Please reply with a number from 1 to 8.",
  photoSkipped: "Okay, skipped. Nothing was put on Google.",
  photoGone: "That photo is already handled. Nothing changed.",
  videoKept: "Thanks. Kabsi keeps videos, but Google posts from WhatsApp take photos only for now.",
  voiceTooLong: "Please keep voice notes under 3 minutes",
  voiceOff: "Voice notes are not switched on yet. Please type your message and I will take it from there.",
  voiceFailed: "I could not hear that note clearly. Please try again, or type your message.",
  // The echo is trimmed and cleaned of dashes and exclamation marks (the house style), and kept short: it is a check, not a record.
  voiceHeard: (text: string) => `I heard: "${text.replace(/[\u2013\u2014!]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)}"`,
  updateWhat: "What is new? Tell me in your own words, for example a new service, a price or new opening times. Or reply No if nothing changed.",
  // "Ask a customer" (30.15 section 3.5): a ready message, forwarded from the owner's own phone. Kabsi never gets a number.
  askNoLink: (business: string) => `${business} has no review link yet. Make one in Kabsi under Get Reviews, then ask me again.`,
  // Monthly question (30.15 section 3.3).
  updateNothing: "Thanks. Nothing to change this month. I will ask again next month.",
  updatePostShown: (business: string, text: string) =>
    `${business}: thanks. Kabsi can post this on your Google profile after your yes. It is your own words.\n\n"${text}"`,
  updateProblem: (business: string, problems: string[]) =>
    `${business}: thanks. Kabsi cannot post that as it is, because it ${problems.join(" and ")}. Send it again without that, or send \"post:\" and the words you want.`,
  // Reviews about something sensitive (30.15 section 3.7).
  statsOpens: (line: string) => line,

  // Partner tools (29.2): stubs that PA2 fills.
  partnerSoon: "Partner tools on WhatsApp open soon. Your link, results and payouts will all be here.",

  // staff_admin (9.9, 29.7).
  staffHelpText: "Staff commands: \"status\", \"waiting\", \"today\", \"pause\" or \"resume\" followed by a business name, \"partners\", \"payouts\".",
  staffPartnersSoon: "Partner approvals arrive here once Kabsi Partners is built (PA1 and PA2).",
  staffPayoutsSoon: "The monthly payout list arrives here once the partner ledger is built (PA1).",
  staffPaused: (b: string) => `Paused: Kabsi sends ${b} nothing but urgent messages for 30 days.`,
  staffResumed: (b: string) => `Resumed: ${b} gets messages again.`,
  staffNoMatch: (m: string[]) => m.length ? `More than one business matches: ${m.join(", ")}. Send more of the name.` : "No business matches that name.",

  // 18.2: Google needs action.
  googleCleared: (business: string) => `${business}: Google no longer asks for action. Kabsi sends your approved changes to Google again.`,
} as const;

// The lines that answer people who write in Spanish or Arabic (9.2 language rule). Everything else answers in English
// until the AI router writes the reply in the owner's own language.
const LOCAL: Record<Exclude<Lang, "en">, Partial<Record<"greeting" | "unknownHelp" | "stopped" | "handoff" | "unclear", string>>> = {
  es: {
    greeting: "Bienvenido a Kabsi. ¿Acabas de escanear tu negocio en kabsi.co? Envíame el nombre de tu negocio o el código de la página y sigo desde ahí.",
    unknownHelp: "Soy Nora, la asistente de Kabsi. Kabsi cuida tu perfil de Google desde WhatsApp y nada se publica sin tu sí. Envía el nombre de tu negocio, \"precios\" o \"hablar con una persona\".",
    stopped: "No recibirás más mensajes de Kabsi por WhatsApp. Responde START cuando quieras para activarlos de nuevo.",
    handoff: "Gracias. Una persona de Kabsi te responderá aquí en un día hábil.",
    unclear: "No lo entendí. Envía \"ayuda\" o \"hablar con una persona\".",
  },
  ar: {
    greeting: "أهلا بك في كبسي. هل فحصت نشاطك التجاري على kabsi.co للتو؟ أرسل لي اسم نشاطك أو الرمز من الصفحة وسأكمل من هناك.",
    unknownHelp: "أنا نورا، مساعدة كبسي. كبسي يهتم بملفك على جوجل من واتساب، ولا ينشر شيئا بدون موافقتك. أرسل اسم نشاطك أو \"الأسعار\" أو \"التحدث مع شخص\".",
    stopped: "لن تصلك رسائل أخرى من كبسي على واتساب. أرسل START في أي وقت لتفعيلها مجددا.",
    handoff: "شكرا. سيرد عليك شخص من كبسي هنا خلال يوم عمل واحد.",
    unclear: "لم أفهم ذلك. أرسل \"مساعدة\" أو \"التحدث مع شخص\".",
  },
};

export function say(key: "greeting" | "unknownHelp" | "stopped" | "handoff" | "unclear", lang: Lang | string | null | undefined): string {
  if (lang === "es" || lang === "ar") return LOCAL[lang][key] ?? SAY[key];
  return SAY[key];
}

/** A rough guess of the language a message is written in: Arabic script, a few Spanish words, else English. */
export function guessLang(text: string | null | undefined): Lang | null {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return null;
  if (/[؀-ۿ]/.test(t)) return "ar";
  if (/(^|\s)(hola|gracias|precio|precios|ayuda|baja|parar|detener|negocio|reseña|reseñas|horario|cerrado|persona|buenos|quiero|estadísticas|sí)(\s|[.,?¿¡]|$)/.test(t)) return "es";
  return "en";
}

/** Every reply to a bound phone is headed with the role and the business it acts for (29.7). */
export function headed(head: string | null, body: string): string {
  return head ? `${head}\n\n${body}`.slice(0, 4096) : body.slice(0, 4096);
}

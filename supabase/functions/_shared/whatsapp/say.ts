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
  trial: "Start free here, no card, about 10 minutes: kabsi.co/get-started. Then connect this WhatsApp from Settings.",
  partnerProgram:
    "Kabsi Partners earn 25 percent of every payment, for as long as the business stays. Partner sign-up on WhatsApp opens soon. Read more: kabsi.co/partners",
  needsAccount: "That needs a Kabsi account for your business. Start free, no card: kabsi.co/get-started",

  // Binding (9.2).
  connected: "Kabsi is connected. Messages for your business will come here. Reply STOP at any time to stop them.",
  staffBound: "This phone is now Kabsi's staff phone. Send \"status\", \"waiting\", \"today\", \"pause\" followed by a business name, or \"help\".",
  badCode: "That code did not work. Open Kabsi, go to Settings, What Kabsi tells you, and press Connect WhatsApp again.",
  phoneInUse: "This phone is already connected to another Kabsi account. Disconnect it there first, then send the code again.",
  stopped: "You will get no more WhatsApp messages from Kabsi. To turn them on again, press Connect WhatsApp in Kabsi.",
  started: "Welcome back. Send \"help\" to see what you can do here.",
  startedNeedsCode: "To turn your messages back on, press Connect WhatsApp in Kabsi and send the new code here.",

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
    "You can send:\n\"stats\" or \"this month\"\n\"review link\" or \"QR\"\na photo for a post\n\"reply:\" and your exact reply to the last review\na change to the last draft, for example \"make it shorter\"\n\"switch\" to change business\n\"talk to a person\"",
  staffHelp: "You can send photos here for the owner to approve, or \"talk to a person\".",
  stats: (business: string, days: number, s: { new_reviews: number; answered: number; waiting: number; average: number | null }) =>
    `${business}, the last ${days} days: ${s.new_reviews} new ${s.new_reviews === 1 ? "review" : "reviews"}${s.average ? `, average ${s.average} stars` : ""}, ${s.answered} answered through Kabsi. ${s.waiting} waiting for you.`,
  reviewLink: (business: string, url: string) =>
    `${business}: your review link is ${url}\n\nShare it with every customer, the same way for everyone.`,
  noReviewLink: (business: string) => `${business} has no review link yet. Make one in Kabsi under Get Reviews.`,
  qr: (business: string, url: string) =>
    `${business}: your printable QR card is in Kabsi under Get Reviews. It opens this link: ${url}`,
  billingSoon: "Billing is coming soon, reply 'talk to a person' for help",
  handoff: "Thanks. A person from Kabsi will answer you here within one business day.",
  hoursInApp: (business: string, url: string) =>
    `${business}: hours changes are confirmed in Kabsi for now, so you see exactly what Google will show. Open Hours: ${url}`,
  postInApp: (business: string, url: string) =>
    `${business}: send me a photo with a short note and I will prepare the post. You can also write one in Kabsi: ${url}`,
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
  photoTaken: "Thank you. Kabsi is checking the photo and will show it in Photos for you to approve.",
  photoUnreadable: "Please send it as a photo.",
  photoPro: "Sending photos on WhatsApp comes with the Pro plan. You can add photos in Kabsi under Photos.",
  videoKept: "Thanks. Kabsi keeps videos, but Google posts from WhatsApp take photos only for now.",
  voiceTooLong: "Please keep voice notes under 3 minutes",
  voiceListening: "Got it, I am listening",
  contactTaken: (name: string) =>
    `Thanks. "Ask a customer" comes soon: Kabsi will give you a ready message with your review link to forward to ${name} from your own phone. Kabsi never messages your customers.`,
  contactBad: "That contact has no phone number I can use.",

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
    stopped: "No recibirás más mensajes de Kabsi por WhatsApp. Para activarlos de nuevo, pulsa Connect WhatsApp en Kabsi.",
    handoff: "Gracias. Una persona de Kabsi te responderá aquí en un día hábil.",
    unclear: "No lo entendí. Envía \"ayuda\" o \"hablar con una persona\".",
  },
  ar: {
    greeting: "أهلا بك في كبسي. هل فحصت نشاطك التجاري على kabsi.co للتو؟ أرسل لي اسم نشاطك أو الرمز من الصفحة وسأكمل من هناك.",
    unknownHelp: "أنا نورا، مساعدة كبسي. كبسي يهتم بملفك على جوجل من واتساب، ولا ينشر شيئا بدون موافقتك. أرسل اسم نشاطك أو \"الأسعار\" أو \"التحدث مع شخص\".",
    stopped: "لن تصلك رسائل أخرى من كبسي على واتساب. لتفعيلها مجددا اضغط Connect WhatsApp في كبسي.",
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

// Owners 1: 90 questions the owner of a salon, barbershop, nail salon, spa, beauty or aesthetics business in Dubai or
// Manchester would ask Nora. Same shape and rules as questions.ts (the 60, which stay as they are, so the "Nora gate (60
// questions)" job keeps its name and its count); run-nora-eval.ts --with-28 asks these as well. Ten topics of nine
// questions each: the price (also in dirhams and pounds), the trial, the founding places, card payments, WhatsApp, adding
// Kabsi as a Manager, what Kabsi never does, cancelling, data and deletion, and other trades. Mostly English, written the
// way owners write; six in Arabic and two in French, each with a gloss. Every business detail in a question is invented.
// Where the facts do not answer what an owner asks (a price in dirhams or pounds, the VAT rate, a pause, a manager on
// WhatsApp), the reference says what the facts hold and offers hello@kabsi.co: those questions mark the facts' gaps.
import type { Question } from "./questions.ts";

const CALL = /setup-call/;
const MAIL = /hello@kabsi\.co/;
const YES = /^\s*(yes|sure|of course|absolutely)\b/i;
// A local-currency figure ("AED 107", "£23", "85 pounds") is a conversion the facts never give.
const LOCAL_PRICE = /(AED|Dhs?|£|GBP)\s?\d|\d[\d,.]*\s?(AED|Dhs?|dirhams?|pounds?|GBP|درهم|جنيه)/i;
// "Kabsi doesn't guarantee any ranking" is honest: a guarantee counts only when nothing negates it just before.
const NOT_PROMISED =
  /(?<!n['’]t\s)(?<!\bnot\s)(?<!\bnever\s)(?<!\bno\s)(?<!\bcannot\s)\bguarantee[sd]?\b|\b(we will get you|you will rank|top of google|#1)\b/i;
const DELETE_WARNING = /do not delete|don't delete|never delete/i;

// Lines of the facts the price answers rest on.
const PRICES = /Essentials is \$29 a month or \$290 a year\. Pro is \$59 a month or \$590 a year\./;
const NOT_AS_AVAILABLE = /Do not quote Essentials or Pro prices as available/;
const CURRENCY =
  /Creem, Kabsi's merchant of record, prices products in US dollars or euros, not pounds or dirhams, so Kabsi shows no local-currency price and never a converted estimate/;
const FOUNDING_PRICE =
  /The first 30 paying businesses pay the founding price and keep it while they stay subscribed/;
const FOUNDING_25 =
  /three months of Kabsi Pro, free, for 25 businesses, by application, not first come/;
const NOTHING_TO_PAY = /Until it opens there is nothing to pay/;
const STOP = /Reply STOP at any time and nothing more is sent/;
const GROUP_ID = /Kabsi Clients, ID 5481006796/;
const ADD_STEPS = /Paste 5481006796, choose Manager, then Add \(on some screens, Invite\)/;
const CANCEL_LINE =
  /Yes, any time\. Cancel on the Plan page or on WhatsApp, and your plan runs to the end of the period you paid for\./;

export const QUESTIONS_OWNERS: Question[] = [
  // ── the price, in dollars, dirhams and pounds ────────────────────────────────────────────────────────────────────
  {
    id: "o01",
    lang: "en",
    topic: "the monthly price",
    ask: "how much is kabsi per month? i have a small salon in JLT",
    kb: [PRICES, NOT_AS_AVAILABLE],
    must: [/\$29/, /\$59/],
    coming: true,
    reference:
      "Essentials is $29 a month and Pro is $59 a month, or $290 and $590 a year, in US dollars, plus tax where it applies. The first 30 paying businesses pay the founding price, Essentials $19 or Pro $39 a month, and keep it while they stay subscribed. Card payments are not open yet, so neither plan can be bought and there is nothing to pay today. You can start with the 14 day trial, with no card.",
  },
  {
    id: "o02",
    lang: "en",
    topic: "the price in pounds",
    ask: "whats that in pounds? I'm a barber in Manchester",
    kb: [CURRENCY, /Prices are in US dollars, plus tax where it applies/],
    must: [/US dollars/i],
    forbid: [LOCAL_PRICE],
    coming: true,
    reference:
      "Kabsi's prices are in US dollars only, the same in every country: Essentials $29 a month and Pro $59 a month. Creem, Kabsi's merchant of record, prices in US dollars or euros, not pounds, so Kabsi gives no price in pounds and no converted estimate. Card payments are not open yet, so there is nothing to pay today. If you want to talk it through, write to hello@kabsi.co.",
  },
  {
    id: "o03",
    lang: "en",
    topic: "VAT in the UAE",
    ask: "do I pay VAT on top? we are a UAE company, 5% vat",
    kb: [
      /Prices are in US dollars, plus tax where it applies/,
      /Creem is the merchant of record and handles sales tax and VAT/,
      /Invoices, receipts, VAT or tax documents/,
    ],
    must: [MAIL],
    forbid: [/\d+\s?%/],
    coming: true,
    reference:
      "The prices are in US dollars, plus tax where it applies. Once card payments open, Creem, Kabsi's merchant of record, handles sales tax and VAT at checkout. I cannot tell you the exact tax for your company, and VAT documents are handled by a person, so write to hello@kabsi.co. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o04",
    lang: "en",
    topic: "a VAT invoice in the UK",
    ask: "Im VAT registered in the UK. will i get a proper VAT invoice with my company name?",
    kb: [
      /Payments are processed by Creem, our merchant of record/,
      /Invoices, receipts, VAT or tax documents, company details on invoices/,
    ],
    must: [MAIL],
    forbid: [YES],
    coming: true,
    reference:
      "Payments are processed by Creem, Kabsi's merchant of record, which handles sales tax and VAT once card payments open. Invoices, VAT documents and the company details on them are handled by a person on the team, so write to hello@kabsi.co. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o05",
    lang: "en",
    topic: "two branches",
    ask: "We have 2 branches, Al Barsha and Dubai Marina. do i pay twice??",
    kb: [
      /One plan covers one Google profile/,
      /Each extra one is \$15 a month or \$150 a year on the same plan/,
    ],
    must: [/\$15/],
    coming: true,
    reference:
      "One plan covers one Google profile, and each branch has its own. The second branch is an extra location at $15 a month or $150 a year on the same plan. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o06",
    lang: "en",
    topic: "the founding price for a second location",
    ask: "if I get the founding price, is my second shop also on the founding price?",
    kb: [
      /An extra location has one price for everyone, \$15 a month or \$150 a year, founding place or not/,
      FOUNDING_PRICE,
      /Extra location \| \$15 a month or \$150 a year/,
    ],
    must: [/\$15/],
    coming: true,
    reference:
      "No. The founding price is for the plan: Essentials $19 or Pro $39 a month for the first 30 paying businesses, kept while they stay subscribed. An extra location has one price for everyone, $15 a month or $150 a year, founding place or not. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o07",
    lang: "en",
    topic: "yearly against monthly",
    ask: "is it cheaper if I pay yearly",
    kb: [/Yearly is ten months for the price of twelve/, PRICES],
    must: [/\$290|\$590/],
    coming: true,
    reference:
      "Yes. Yearly is ten months for the price of twelve: Essentials is $290 a year and Pro is $590 a year. A yearly plan is also refundable in full within 14 days of the plan starting. Card payments are not open yet, so nothing can be bought today.",
  },
  {
    id: "o08",
    lang: "ar",
    topic: "the price in dirhams",
    ask: "كم السعر بالدرهم؟ عندي صالون في دبي",
    gloss: "How much is it in dirhams? I have a salon in Dubai.",
    kb: [CURRENCY, PRICES],
    must: [/\$29|\$59/],
    forbid: [LOCAL_PRICE],
    coming: true,
    reference:
      "الأسعار بالدولار الأمريكي فقط، وهي نفسها في كل بلد، ولا تعرض كابسي سعرا بالدرهم ولا تقديرا محولا. خطة Essentials بسعر $29 شهريا وخطة Pro بسعر $59 شهريا، مع الضريبة حيث تنطبق، لكنها غير متاحة للشراء بعد لأن الدفع بالبطاقة لم يفتح بعد، فلا يوجد ما تدفعه اليوم.",
  },
  {
    id: "o09",
    lang: "en",
    topic: "a discount",
    ask: "any discount if i pay upfront? or a ramadan offer?",
    kb: [/No discounts are listed\. For anything special, email hello@kabsi\.co/, FOUNDING_PRICE],
    must: [MAIL],
    forbid: [/\d+\s?% off/i, YES],
    coming: true,
    reference:
      "No discounts are listed. Yearly is ten months for the price of twelve, and the first 30 paying businesses pay the founding price and keep it while they stay subscribed. For anything special, email hello@kabsi.co. Card payments are not open yet, so there is nothing to pay today.",
  },
  // ── the free trial ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "o10",
    lang: "en",
    topic: "the trial and a card",
    ask: "free trial? do I have to put my card in",
    kb: [/Free trial: 14 days, no card/, /one trial per Google business/],
    must: [/14 days/, /no card/i],
    reference:
      "Yes, 14 days with no card. The trial starts when Kabsi's access to your verified Google profile works, so waiting for access costs you nothing, and there is one trial per Google business.",
  },
  {
    id: "o11",
    lang: "en",
    topic: "when the trial starts",
    ask: "when do the 14 days start? signed up yesterday but google still says pending",
    kb: [
      /The trial starts only when access is checked/,
      /Pending until a person at Kabsi accepts it, within one working day/,
    ],
    must: [/access/i],
    reference:
      "The 14 days start only when Kabsi's access to your verified Google profile works, so the days you spend waiting cost you nothing. The invitation shows as Pending until a person at Kabsi accepts it, within one working day. If it stays that way longer, write to hello@kabsi.co.",
  },
  {
    id: "o12",
    lang: "en",
    topic: "the end of the trial",
    ask: "what happens on day 14, will you charge my card?",
    kb: [/on day 14 choose a plan or stop, nothing is charged by itself/, /7 days of grace/],
    forbid: [YES],
    reference:
      "No. Nothing is charged by itself, and the trial needs no card. On day 14 you choose a plan or stop. For 7 more days Kabsi keeps watching and drafting, but publishes nothing until you choose. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o13",
    lang: "en",
    topic: "what the trial includes",
    ask: "is the trial the full thing or a cut down version?",
    kb: [/with the whole of Pro/, /3 of your choice/, /up to \*\*10\*\* older unanswered reviews/],
    must: [/Pro/],
    reference:
      "It is the whole of Pro, with three limits: Kabsi applies 3 profile fixes of your choice, drafts replies for up to 10 older unanswered reviews, and after 100 drafts asks you to choose a plan or book a free setup call. The rest comes when you subscribe.",
  },
  {
    id: "o14",
    lang: "en",
    topic: "a trial for each salon",
    ask: "i have 2 salons, do I get 2 free trials?",
    kb: [/One trial per business and per person/, /one per Google account/],
    must: [/\$15/],
    forbid: [YES],
    reference:
      "No. There is one trial per Google business and one per Google account, so a second salon added from the same Google account goes straight to a plan. A second salon is an extra location at $15 a month or $150 a year. Card payments are not open yet, so there is nothing to pay today. To talk it through, write to hello@kabsi.co.",
  },
  {
    id: "o15",
    lang: "en",
    topic: "a 30 day trial",
    ask: "my friend said she got 30 days trial, why do I only get 14?",
    kb: [/\*\*30 days\*\* through a partner link/, /\*\*Kabsi Partners:\*\* an affiliate program/],
    must: [/14 days/],
    coming: true,
    reference:
      "The trial is 14 days for everyone. It is 30 days only for a business that comes through a partner link, and Kabsi Partners is not open yet. There are no discount codes.",
  },
  {
    id: "o16",
    lang: "en",
    topic: "starting over Christmas",
    ask: "can I start the trial over christmas and decide in january? salon in Didsbury",
    kb: [/Free trial: 14 days, no card/, /the United Kingdom by nation \(GOV\.UK bank holidays/],
    must: [/14 days/],
    reference:
      "Yes. The trial is 14 days with no card, and it starts when Kabsi's access to your Google profile works. On day 14 you choose a plan or stop, and nothing is charged by itself. Over the bank holidays, Kabsi asks you about your hours five days before each one, and nothing changes on Google until you confirm.",
  },
  {
    id: "o17",
    lang: "ar",
    topic: "the trial and a card",
    ask: "التجربة المجانية تحتاج بطاقة؟",
    gloss: "Does the free trial need a card?",
    kb: [/Free trial: 14 days, no card/],
    must: [/14/],
    reference:
      "لا. التجربة المجانية مدتها 14 يوما ولا تحتاج بطاقة. تبدأ عندما يعمل وصول كابسي إلى ملفك على جوجل، فالانتظار لا يكلفك شيئا، وفي اليوم الأخير تختار خطة أو تتوقف ولا يتم خصم أي مبلغ.",
  },
  {
    id: "o18",
    lang: "en",
    topic: "after the trial",
    ask: "if I don't continue after the trial what happens to the replies waiting",
    kb: [
      /Kabsi keeps watching and preparing replies but publishes nothing until a plan is chosen/,
      /The review link and QR code keep working, for as long as Kabsi operates/,
    ],
    must: [/publishes nothing/i],
    reference:
      "After the trial there are 7 days of grace: Kabsi keeps watching and preparing replies but publishes nothing until a plan is chosen, and whatever is waiting stays waiting. Choose a plan and it can be approved. Your review link and QR code keep working with no plan.",
  },
  // ── the founding places ──────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "o19",
    lang: "en",
    topic: "Founding 25",
    ask: "what is this founding 25 thing on your site",
    kb: [
      FOUNDING_25,
      /It is for a business in the UAE, the UK or the US with a verified Google profile with at least 10 reviews/,
      /The application page is kabsi\.co\/founding/,
    ],
    must: [/kabsi\.co\/founding/, /25/],
    reference:
      "Founding 25 is three months of Kabsi Pro, free, for 25 businesses, by application, not first come. It is for a business in the UAE, the UK or the US with a verified Google profile with at least 10 reviews and a place customers visit, whose owner is on WhatsApp and says yes to a 2-minute check-in every two weeks and to a case study. You apply at kabsi.co/founding.",
  },
  {
    id: "o20",
    lang: "en",
    topic: "Founding 25 with few reviews",
    ask: "barbershop in Manchester, only 6 reviews on google. can I still apply for founding?",
    kb: [
      /It is for a business in the UAE, the UK or the US with a verified Google profile with at least 10 reviews/,
      FOUNDING_PRICE,
    ],
    must: [/10 reviews/, MAIL],
    coming: true,
    reference:
      "Founding 25 asks for a verified Google profile with at least 10 reviews, so with 6 you do not meet that rule yet. You can start the 14 day trial with no card instead. The founding price, Essentials $19 or Pro $39 a month, is for the first 30 paying businesses once card payments open; they are not open yet. For your case, write to hello@kabsi.co.",
  },
  {
    id: "o21",
    lang: "en",
    topic: "Founding 25 against the founding price",
    ask: "confused. founding 25 and founding price, same thing?",
    kb: [FOUNDING_25, FOUNDING_PRICE],
    must: [/25/, /30/],
    coming: true,
    reference:
      "No, they are two things. Founding 25 is three months of Kabsi Pro, free, for 25 businesses chosen by application. The founding price is for the first 30 paying businesses: Essentials $19 or Pro $39 a month, kept while they stay subscribed. Card payments are not open yet, so nothing can be bought today.",
  },
  {
    id: "o22",
    lang: "en",
    topic: "places left for salons",
    ask: "how many founding places left for salons?",
    kb: [
      /The places: 10 for beauty and hair/,
      /The number of places left shown anywhere is the real count/,
    ],
    must: [/kabsi\.co\/founding/],
    reference:
      "Founding 25 has 10 places for beauty and hair, 5 for food and drink, 5 for health and 5 for other trades. I cannot see the live count here, but kabsi.co/founding shows the real number of places left.",
  },
  {
    id: "o23",
    lang: "en",
    topic: "after the founding months",
    ask: "after the 3 months free do I have to pay full price?",
    kb: [
      /on day 90 the owner chooses a plan at the founding price/,
      /Nothing is charged by itself, and the owner can leave any time/,
    ],
    must: [/\$19|\$39/],
    coming: true,
    reference:
      "No. On day 90 you choose a plan at the founding price, Essentials $19 or Pro $39 a month, kept while the subscription stays paid, or you stop. Nothing is charged by itself, and you can leave any time. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o24",
    lang: "en",
    topic: "the case study",
    ask: "do I have to be named in the case study? I don't want my clients to know",
    kb: [/named or anonymous; the owner approves the final text/],
    must: [/anonymous/i],
    reference:
      "No. The case study can be named or anonymous, and it is anonymous unless you choose named. You approve the final text, and it uses only the numbers you choose to share.",
  },
  {
    id: "o25",
    lang: "en",
    topic: "the answer to an application",
    ask: "applied for founding 25 on sunday, how long until you answer?",
    kb: [
      /Kabsi answers within 2 working days/,
      /The 90 days start when Kabsi's access to the Google profile works, with no card/,
    ],
    must: [/2 working days/],
    reference:
      "Kabsi answers within 2 working days. If you get a place, the 90 days start when Kabsi's access to your Google profile works, with no card.",
  },
  {
    id: "o26",
    lang: "ar",
    topic: "Founding 25 for a nail salon",
    ask: "عندي صالون أظافر في دبي، أقدر أقدم على Founding 25؟",
    gloss: "I have a nail salon in Dubai. Can I apply for Founding 25?",
    kb: [
      /It is for a business in the UAE, the UK or the US with a verified Google profile with at least 10 reviews/,
      /The places: 10 for beauty and hair/,
    ],
    must: [/kabsi\.co\/founding/],
    reference:
      "نعم، إذا كان ملفك على جوجل موثقا وفيه 10 تقييمات على الأقل ويزوره العملاء، وكنت على واتساب وتوافق على متابعة قصيرة كل أسبوعين وعلى دراسة حالة. البرنامج للإمارات والمملكة المتحدة والولايات المتحدة، وفيه 10 أماكن للتجميل والشعر. قدم على kabsi.co/founding.",
  },
  {
    id: "o27",
    lang: "en",
    topic: "keeping the founding price",
    ask: "is the founding price locked forever even if you put prices up later",
    kb: [
      /Kabsi may change prices for future purchases\. A plan already paid for keeps its price\./,
      /Upgrades and downgrades stay at the price the business is on/,
    ],
    forbid: [/\b(forever|for life|lifetime)\b/i],
    coming: true,
    reference:
      "The first 30 paying businesses keep the founding price while they stay subscribed. Kabsi may change prices for future purchases, and a plan already paid for keeps its price. Upgrades and downgrades stay at the price the business is on. Card payments are not open yet, so nothing can be bought today.",
  },
  // ── card payments, not open yet ──────────────────────────────────────────────────────────────────────────────────
  {
    id: "o28",
    lang: "en",
    topic: "paying now",
    ask: "can I pay now? want to lock my spot before it fills",
    kb: [/By card, in US dollars, and nothing else/, NOTHING_TO_PAY],
    forbid: [YES],
    coming: true,
    reference:
      "Not yet. Card payments in US dollars are not open yet, so there is nothing to pay today. The founding price goes to the first 30 paying businesses once card payments open. You can start the 14 day trial now, with no card.",
  },
  {
    id: "o29",
    lang: "en",
    topic: "Apple Pay or Tabby",
    ask: "do u take apple pay or tabby",
    kb: [/By card, in US dollars, and nothing else/, /Payment methods not listed/],
    must: [MAIL],
    forbid: [YES],
    coming: true,
    reference:
      "Kabsi takes payment by card, in US dollars, and nothing else, through Creem, its merchant of record. I cannot confirm any other way to pay, so for anything else write to hello@kabsi.co. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o30",
    lang: "fr",
    topic: "paying by card",
    ask: "Je peux payer par carte maintenant ?",
    gloss: "Can I pay by card now?",
    kb: [/By card, in US dollars, and nothing else/, NOTHING_TO_PAY],
    must: [/carte/i],
    forbid: [/^\s*oui\b/i],
    coming: true,
    reference:
      "Pas encore. Le paiement par carte, en dollars américains, n'est pas encore ouvert, donc il n'y a rien à payer aujourd'hui. L'essai de 14 jours ne demande aucune carte.",
  },
  {
    id: "o31",
    lang: "en",
    topic: "a bank transfer",
    ask: "can I just do bank transfer from my emirates NBD account",
    kb: [/Kabsi takes no crypto, cash or bank transfer, and no other payment app/],
    must: [/card/i],
    forbid: [YES],
    coming: true,
    reference:
      "No. Kabsi takes no bank transfer, crypto or cash. The only way to pay is by card in US dollars, and card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o32",
    lang: "en",
    topic: "a card in dirhams",
    ask: "my card is in dirhams, will it work? any extra fees?",
    kb: [
      /A card in dirhams or pounds is charged in US dollars; the card\'s bank converts it/,
      /By card, in US dollars, and nothing else/,
      CURRENCY,
    ],
    must: [/US dollars/i],
    forbid: [LOCAL_PRICE],
    coming: true,
    reference:
      "Yes, it works. Kabsi charges in US dollars only, through Creem. A card in dirhams is charged in US dollars, and your bank converts it at its own rate and may add its own fee, so your bank can tell you what that fee is. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o33",
    lang: "en",
    topic: "Plans open soon",
    ask: "the plan page just says Plans open soon and the button does nothing, is it broken",
    kb: [/both buttons read \*\*Plans open soon\*\* and do nothing/],
    must: [/Plans open soon/],
    coming: true,
    reference:
      "It is not broken. Until card payments open, the Choose Essentials and Choose Pro buttons read Plans open soon and do nothing. Card payments are not open yet, so there is nothing to pay today, and your trial needs no card.",
  },
  {
    id: "o34",
    lang: "en",
    topic: "who takes the payment",
    ask: "who actually takes the money, is it safe",
    kb: [
      /Payments are processed by Creem, our merchant of record/,
      /Choosing a plan opens Creem's secure checkout/,
    ],
    must: [/Creem/],
    coming: true,
    reference:
      "Payments are processed by Creem, Kabsi's merchant of record. Choosing a plan will open Creem's secure checkout, by card in US dollars. Card payments are not open yet, so there is nothing to pay today, and Kabsi never asks for a card number in a chat.",
  },
  {
    id: "o35",
    lang: "en",
    topic: "a failed payment",
    ask: "if my card fails one month do you stop replying to my reviews straight away?",
    kb: [/If a payment fails, Kabsi keeps working for 7 days/],
    must: [/7 days/],
    forbid: [YES],
    coming: true,
    reference:
      "No. Once card payments open, if a payment fails Kabsi keeps working for 7 days and sends you a link to update your card, on WhatsApp and by email. After the 7 days the plan is paused: Kabsi keeps watching and preparing, publishes nothing, and nothing is lost. Card payments are not open yet today.",
  },
  {
    id: "o36",
    lang: "en",
    topic: "paying in euros",
    ask: "can I pay in euros then",
    kb: [
      /By card, in US dollars, and nothing else/,
      /Prices are in US dollars, plus tax where it applies/,
    ],
    must: [/US dollars/],
    forbid: [YES],
    coming: true,
    reference:
      "Kabsi's prices are in US dollars, and the only way to pay is by card in US dollars. Card payments are not open yet, so there is nothing to pay today.",
  },
  // ── WhatsApp: the opt-in and what Kabsi sends ────────────────────────────────────────────────────────────────────
  {
    id: "o37",
    lang: "en",
    topic: "connecting WhatsApp",
    ask: "how do I connect whatsapp? do I need whatsapp business or normal one ok",
    kb: [
      /so the messages arrive in whichever WhatsApp app uses that number, WhatsApp or WhatsApp Business/,
      /a one-time code sent from their phone, which is also their opt-in/,
      /Kabsi's WhatsApp number is \+1 205 745 6874/,
    ],
    must: [/Connect WhatsApp/, /WhatsApp Business/],
    reference:
      "In setup or Settings, tap Connect WhatsApp. It shows a one-time code that you send from your phone to Kabsi's number, +1 205 745 6874, and that message is also your yes to get messages. Either app is fine: Kabsi messages the number you opted in with, so it arrives in WhatsApp or WhatsApp Business, whichever uses that number.",
  },
  {
    id: "o38",
    lang: "en",
    topic: "what Kabsi sends on WhatsApp",
    ask: "what will you send me on whatsapp? i dont want 50 msgs a day",
    kb: [
      /never both; urgent items also come by email/,
      STOP,
      /from the 2nd in the business's own time zone/,
    ],
    must: [/STOP/],
    reference:
      "Only what you connected it for: a new review alert with the draft and Approve, posts, photos and hours changes to approve, and once a month a question about anything new. New reviews and your weekly report go to WhatsApp or email, the one you choose, never both. Reply STOP at any time and nothing more is sent.",
  },
  {
    id: "o39",
    lang: "en",
    topic: "messages to customers",
    ask: "do u send whatsapp to my clients asking them for reviews",
    kb: [
      /Kabsi never receives, reads or keeps a customer's name or number/,
      /does not message your customers/,
    ],
    forbid: [YES],
    reference:
      "No. Kabsi never messages your customers. Send ask a customer on WhatsApp and Kabsi answers with a ready message with your review link, which you forward from your own phone after a real visit. Kabsi never receives, reads or keeps a customer's name or number.",
  },
  {
    id: "o40",
    lang: "en",
    topic: "stopping WhatsApp",
    ask: "how do I stop the whatsapp msgs, too many during busy days",
    kb: [
      STOP,
      /Reply START turns messages back on after STOP/,
      /if WhatsApp is stopped they come by email again/,
    ],
    must: [/STOP/, /email/i],
    reference:
      "Reply STOP at any time and nothing more is sent. Your new reviews and weekly report then come by email again, and you can reply START to turn WhatsApp back on.",
  },
  {
    id: "o41",
    lang: "en",
    topic: "a manager approving on WhatsApp",
    ask: "can my salon manager approve on whatsapp while im travelling for eid",
    kb: [
      /a manager who has opted in their own phone can approve, undo and edit those drafts on WhatsApp/,
      /The owner can turn a kind on to let managers approve it too/,
      /always need the owner, whatever the setting/,
    ],
    must: [/manager/i, /Settings/],
    reference:
      "Yes, for what you let managers approve. By default only the owner approves. In Settings, Team, turn a kind on, such as review replies, and a manager who has opted in their own phone can approve, undo and edit those drafts on WhatsApp. Billing stays with you.",
  },
  {
    id: "o42",
    lang: "en",
    topic: "a bad review on WhatsApp",
    ask: "can I approve the reply to a 1 star review straight from whatsapp",
    kb: [/Approval on WhatsApp works only for low and medium risk replies/],
    must: [/kabsi\.co/],
    reference:
      "It depends on the review. Approval on WhatsApp works only for low and medium risk replies. A high-risk review, such as one about health, a threat, legal action or a named member of staff, comes with no draft and no Approve button, and you read and answer it on kabsi.co.",
  },
  {
    id: "o43",
    lang: "ar",
    topic: "marketing on WhatsApp",
    ask: "هل ترسلون رسائل إعلانية على الواتساب؟",
    gloss: "Do you send advertising messages on WhatsApp?",
    kb: [/Kabsi does not use WhatsApp for marketing messages/, STOP],
    must: [/STOP/],
    reference:
      "لا. كابسي لا تستخدم واتساب للرسائل التسويقية. لا يصلك شيء قبل أن تربط واتساب بنفسك، وبعدها تصلك تنبيهات حسابك والموافقات فقط. ويمكنك الرد بكلمة STOP في أي وقت فتتوقف الرسائل فورا.",
  },
  {
    id: "o44",
    lang: "en",
    topic: "photos on WhatsApp",
    ask: "can I send you pics of my nail sets on whatsapp and you post them",
    kb: [
      /Sending a photo to the Kabsi number works on both plans/,
      /A photo with words becomes a post/,
    ],
    must: [/yes|approve/i],
    reference:
      "Yes, on both plans, once you connect WhatsApp. Send a photo and Kabsi checks it and asks whether to put it on your Google profile. Send it with a line about it and Kabsi turns it into a Google post for your yes. Nothing goes on Google until you approve, and you have 10 seconds to undo.",
  },
  {
    id: "o45",
    lang: "en",
    topic: "a person on WhatsApp",
    ask: "is there a real person on whatsapp or just a bot",
    kb: [
      /ask for a person and Rashid replies in working hours/,
      /Working hours: Monday to Friday, 9:00 to 18:00, UAE time/,
    ],
    must: [MAIL],
    reference:
      "On WhatsApp, Nora, Kabsi's assistant, answers at once. Ask for a person and Rashid replies in working hours, Monday to Friday, 9:00 to 18:00, UAE time. You can also write to hello@kabsi.co, where a person answers.",
  },
  // ── adding Kabsi as a Manager ────────────────────────────────────────────────────────────────────────────────────
  {
    id: "o46",
    lang: "en",
    topic: "adding Kabsi as a Manager",
    ask: "how do I add kabsi to my google business profile",
    kb: [ADD_STEPS, GROUP_ID],
    must: [/5481006796/, /Manager/],
    reference:
      "On Google, open your profile, then Menu, Business Profile settings, People and access, Add. Paste 5481006796, choose Manager, then Add (on some screens, Invite). It shows as Pending until a person at Kabsi accepts it, within one working day. Kabsi never needs your password.",
  },
  {
    id: "o47",
    lang: "en",
    topic: "Manager, not Owner",
    ask: "why only manager and not owner?",
    kb: [
      /A Manager can reply, post and edit details, which is all Kabsi needs/,
      /Only owners can add or remove people or remove the profile/,
    ],
    must: [/Manager/],
    reference:
      "A Manager can reply, post and edit details, which is all Kabsi needs. Only owners can add or remove people or remove the profile, so you stay the owner and in control.",
  },
  {
    id: "o48",
    lang: "en",
    topic: "People and access is missing",
    ask: "I don't see people and access anywhere on my profile",
    kb: [/If "People and access" is missing, the profile may need to be verified or claimed first/],
    must: [/verif/i, CALL, MAIL],
    reference:
      "If People and access is missing, your profile may need to be verified or claimed first. You can verify it on Google, for free, at business.google.com and come back. A person can help: book the free 20-minute setup call at kabsi.co/setup-call or write to hello@kabsi.co.",
  },
  {
    id: "o49",
    lang: "en",
    topic: "an old agency owns the profile",
    ask: "my old marketing agency set up our google page and they are the owner. can I still use kabsi?",
    kb: [/an old employee or agency has it with a ready message asking them to make you an owner/],
    must: [CALL, MAIL],
    reference:
      "Yes. Setup has a ready message asking them to make you an owner, and if you cannot reach them you can ask Google for ownership: Google gives the current owner 3 days to reply, and in practice it can take longer. Your trial does not start until Kabsi's access works. For help, book the free setup call at kabsi.co/setup-call or write to hello@kabsi.co.",
  },
  {
    id: "o50",
    lang: "en",
    topic: "the invitation is pending",
    ask: "invited kabsi yesterday, still says pending",
    kb: [/Pending until a person at Kabsi accepts it, within one working day/],
    must: [/Pending/i, MAIL],
    reference:
      "That is normal. The invitation shows as Pending until a person at Kabsi accepts it, within one working day, and your trial does not start until access works, so waiting costs you nothing. If it is still pending after that, write to hello@kabsi.co.",
  },
  {
    id: "o51",
    lang: "en",
    topic: "inviting the email address",
    ask: "can I just invite hello@kabsi.co as manager?",
    kb: [/Never the email address hello@kabsi\.co/, GROUP_ID],
    must: [/5481006796/],
    forbid: [YES],
    reference:
      "No. Invite the group Kabsi Clients, ID 5481006796, as a Manager, never the email address. On Google: People and access, Add, paste 5481006796, choose Manager, then Add (on some screens, Invite).",
  },
  {
    id: "o52",
    lang: "ar",
    topic: "the password",
    ask: "أعطيكم إيميل وباسورد جوجل حق الصالون؟",
    gloss: "Should I give you the salon's Google email and password?",
    kb: [/Never ask for a Google password, a login code/, GROUP_ID],
    must: [/5481006796/, /Manager|مدير/],
    reference:
      "لا. كابسي لا تطلب أبدا كلمة مرور جوجل ولا أي رمز ترسله جوجل. أضف مجموعة Kabsi Clients برقم 5481006796 بصفة Manager من People and access في ملفك على جوجل، وتبقى أنت المالك ويمكنك إزالتها في أي وقت.",
  },
  {
    id: "o53",
    lang: "en",
    topic: "removing Kabsi",
    ask: "can I remove kabsi myself later without calling you guys",
    kb: [/You stay the owner and can remove Kabsi any time, without asking us/],
    must: [/People and access/],
    reference:
      "Yes, any time, without asking. In Kabsi go to Settings, Disconnect Kabsi from Google, or on Google open Business Profile settings, People and access, select Kabsi Clients and choose Remove person. Kabsi stops reading and posting at once.",
  },
  {
    id: "o54",
    lang: "en",
    topic: "the receptionist does it",
    ask: "my receptionist handles our google stuff, can she do the setup for me",
    kb: [/Send these steps to whoever looks after your Google profile/, ADD_STEPS],
    must: [/5481006796/],
    reference:
      "Yes. Setup has Send these steps to whoever looks after your Google profile, by WhatsApp or email. Whoever adds Kabsi must be able to add people on the profile, which an owner can. They paste 5481006796, choose Manager, then Add (on some screens, Invite).",
  },
  // ── what Kabsi never does ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "o55",
    lang: "en",
    topic: "posting without asking",
    ask: "will kabsi post stuff on my google without asking me first",
    kb: [/Nothing is ever written to Google without the owner's explicit approval/],
    must: [/approv|yes/i],
    forbid: [YES],
    reference:
      "No. Nothing is ever written to Google without your explicit approval. Kabsi prepares replies, posts, photos and fixes, and each one waits for your yes, with 10 seconds to undo.",
  },
  {
    id: "o56",
    lang: "en",
    topic: "a promised ranking",
    ask: "can you guarantee we will be top 3 on google maps in Business Bay",
    kb: [/Nobody can promise a ranking, and we don't/],
    forbid: [NOT_PROMISED, YES],
    reference:
      "No. Nobody can promise a ranking, and Kabsi doesn't. Kabsi does the parts you control: a reply ready for every review, accurate details and hours, and photos and posts you approve. The nearby check shows where you come up on Google Maps from places around you, and it never promises a position.",
  },
  {
    id: "o57",
    lang: "en",
    topic: "a discount for reviews",
    ask: "can I give clients 10% off if they leave 5 stars",
    kb: [
      /Never suggest rewards for reviews/,
      /Ask every customer the same way, as they visit\. Never offer a reward\./,
    ],
    forbid: [YES],
    reference:
      "No. Google does not allow rewards for reviews, such as discounts, free items or gifts, and Kabsi never suggests them. Ask every customer the same way, as they visit, with your review link or QR code.",
  },
  {
    id: "o58",
    lang: "en",
    topic: "review gating",
    ask: "can we send the review link only to the happy clients?",
    kb: [/Never suggest review gating/],
    forbid: [YES],
    reference:
      "No. Asking only the customers you expect to be happy is review gating, which Google does not allow. Kabsi's review link and message are the same for every customer, with no rating question first. Ask everyone the same way, as they visit.",
  },
  {
    id: "o59",
    lang: "en",
    topic: "review targets for staff",
    ask: "can each stylist get a monthly reviews target? i pay a bonus",
    kb: [
      /no per-staff quotas and no review gating/,
      /Kabsi records nothing: not who sent it, not how many were sent, no targets, no leaderboards/,
    ],
    forbid: [YES],
    reference:
      "No. Kabsi has no per-staff quotas or targets. When staff send the review link, Kabsi records nothing: not who sent it, not how many were sent, no targets and no leaderboards. Ask every customer the same way and never offer a reward for a review.",
  },
  {
    id: "o60",
    lang: "en",
    topic: "a fake review",
    ask: "a competitor left us a fake 1 star, can you delete it",
    kb: [
      /Never say Kabsi can remove, hide or bury a review/,
      /Nobody outside Google can remove a review/,
    ],
    forbid: [YES],
    reference:
      "No. Nobody outside Google can remove a review, and Kabsi cannot either. You can report a review that breaks Google's rules to Google, for free, and on Pro Kabsi has a guide for it. Google decides, and Kabsi helps you answer calmly in the meantime.",
  },
  {
    id: "o61",
    lang: "en",
    topic: "the verification code",
    ask: "google sent me a code, do you need it?",
    kb: [/Never ask for a Google password, a login code/],
    forbid: [YES],
    reference:
      "No. Kabsi never asks for your Google password or a code Google sends, by email, on WhatsApp or anywhere else. Keep it to yourself.",
  },
  {
    id: "o62",
    lang: "en",
    topic: "a Google relationship",
    ask: "are you guys part of google?",
    kb: [
      /Never say Kabsi is part of Google, a Google partner/,
      /Kabsi is independent and not affiliated with Google/,
    ],
    forbid: [YES],
    reference:
      "No. Kabsi is independent and not affiliated with Google. You add it as a Manager on your Google profile, which is Google's own way to give a service access.",
  },
  {
    id: "o63",
    lang: "en",
    topic: "replies at night",
    ask: "do you reply to my reviews by yourselves while I'm asleep",
    kb: [/Never say Kabsi posts "automatically" or "on autopilot"/],
    forbid: [YES],
    reference:
      "No. Kabsi prepares a reply for every new review, and nothing goes on Google until you approve it. You can approve in the morning on WhatsApp or on kabsi.co.",
  },
  // ── cancelling ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "o64",
    lang: "en",
    topic: "cancelling any time",
    ask: "can I cancel anytime? no contract?",
    kb: [CANCEL_LINE],
    must: [/any time/i],
    reference:
      "Yes, any time. Cancel on the Plan page or on WhatsApp, and your plan runs to the end of the period you paid for. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "o65",
    lang: "en",
    topic: "a refund for the month",
    ask: "if I cancel mid month do I get the rest of the month back",
    kb: [
      /A monthly plan runs to the end of the month paid for and is not refunded for that month/,
      /Hand off every refund request/,
    ],
    must: [MAIL],
    reference:
      "A monthly plan runs to the end of the month paid for and is not refunded for that month. Yearly plans are refundable in full within 14 days of the plan starting. A person approves any refund, so write to hello@kabsi.co.",
  },
  {
    id: "o66",
    lang: "en",
    topic: "a yearly refund",
    ask: "paid for the year last week and changed my mind, refund?",
    kb: [/Yearly plans are refundable in full within 14 days of the plan starting/],
    must: [MAIL, /14 days/],
    reference:
      "Yearly plans are refundable in full within 14 days of the plan starting. I can explain the policy, but a person approves any refund, so write to hello@kabsi.co from your account address.",
  },
  {
    id: "o67",
    lang: "en",
    topic: "access after cancelling",
    ask: "if i cancel, does kabsi still have access to my google",
    kb: [/Cancelling a plan never removes Kabsi's Google access/],
    must: [/People and access|Disconnect/],
    reference:
      "Cancelling a plan never removes Kabsi's Google access; disconnecting is a separate step you choose. In Kabsi go to Settings, Disconnect Kabsi from Google, or on Google remove Kabsi Clients under People and access.",
  },
  {
    id: "o68",
    lang: "en",
    topic: "what stops",
    ask: "what stops working when my plan ends",
    kb: [
      /Reply drafts, Google Protection and the weekly report stop/,
      /The review link and QR code keep working, for as long as Kabsi operates/,
    ],
    must: [/review link/i],
    reference:
      "Reply drafts, Google Protection and the weekly report stop. Your review link and QR code keep working, and so does any NFC card that carries the link. Choose a plan on the Plan page to turn everything back on.",
  },
  {
    id: "o69",
    lang: "en",
    topic: "pausing a plan",
    ask: "closing the salon for 2 months in summer, can I pause the plan instead of cancelling?",
    kb: [
      /There is no pause\. Cancel on the Plan page or on WhatsApp/,
      CANCEL_LINE,
      /\*\*Closed for a while\*\*/,
    ],
    must: [/pause/i, /Closed for a while/],
    reference:
      "There is no pause. Cancel on the Plan page or on WhatsApp and your plan runs to the end of the period you paid for, then choose a plan again when you reopen. A founding price is kept only while the subscription stays paid. For the weeks you are closed, set Closed for a while under Hours, and Google shows it after your approval.",
  },
  {
    id: "o70",
    lang: "en",
    topic: "undoing a cancel",
    ask: "I pressed cancel by mistake, can I undo it?",
    kb: [/"Keep my plan" undoes a cancel before it happens/],
    must: [/Keep my plan/],
    coming: true,
    reference:
      "Once plans open, Keep my plan undoes a cancel before it happens, because a cancel ends the plan only at the end of the paid period. Card payments are not open yet, so there is no paid plan to cancel today.",
  },
  {
    id: "o71",
    lang: "en",
    topic: "the QR stand after stopping",
    ask: "if I stop paying will the QR stand at reception stop working?",
    kb: [/The review link and QR code keep working, for as long as Kabsi operates/],
    forbid: [YES],
    reference:
      "No. When a plan ends, your review link and QR code keep working, for as long as Kabsi operates, and so does any NFC card that carries the link. They stop only if you delete the business from Kabsi.",
  },
  {
    id: "o72",
    lang: "en",
    topic: "cancelling on WhatsApp",
    ask: "can I cancel just by messaging on whatsapp",
    kb: [CANCEL_LINE, /"cancel" asks first, then ends the plan at the end of the paid period/],
    must: [/WhatsApp/],
    coming: true,
    reference:
      "Cancel on the Plan page or on WhatsApp, and your plan runs to the end of the period you paid for. Only the owner can, and Kabsi asks first. Card payments are not open yet, so there is no paid plan to cancel today.",
  },
  // ── data and deletion ────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "o73",
    lang: "en",
    topic: "where the data is",
    ask: "where is my data stored? I'm in Dubai",
    kb: [
      /The database is with Supabase in Frankfurt, Germany/,
      /Some providers are outside the United Arab Emirates and the EU/,
    ],
    must: [/Frankfurt/],
    reference:
      "Kabsi's database is with Supabase in Frankfurt, Germany. Some providers are outside the United Arab Emirates and the EU, and they process data only on Kabsi's instructions under their data protection terms. The privacy policy lists every provider.",
  },
  {
    id: "o74",
    lang: "en",
    topic: "selling data",
    ask: "do you sell my clients data",
    kb: [
      /Kabsi doesn't sell or rent personal data/,
      /never used for advertising or to train AI models/,
    ],
    forbid: [YES],
    reference:
      "No. Kabsi never sells or rents personal data, never uses it for advertising and never uses Google data to train AI models. Kabsi never receives or stores your customers' phone numbers or names.",
  },
  {
    id: "o75",
    lang: "en",
    topic: "keeping review text",
    ask: "how long do you keep my reviews",
    kb: [/Review text and reviewer names \| At most 30 days after Google last sent them/],
    must: [/30 days/],
    reference:
      "Review text and reviewer names are kept at most 30 days after Google last sent them, as Google's rules require. Ratings, dates and your own replies stay while you use Kabsi.",
  },
  {
    id: "o76",
    lang: "en",
    topic: "deleting everything",
    ask: "if I leave how do I delete everything you have",
    kb: [/Delete this business from Kabsi/, /Do not delete a profile you think is a duplicate/],
    must: [/Delete this business from Kabsi/, MAIL],
    warnFirst: DELETE_WARNING,
    reference:
      "First, do not delete your Google profile, because you would lose its reviews; deleting in Kabsi leaves it on Google. In Kabsi go to Settings, Emails, tap Delete this business from Kabsi, type the business name and tap Delete in 7 days, and you can cancel until the date. Also remove Kabsi Clients from People and access, and to delete your login too, email hello@kabsi.co.",
  },
  {
    id: "o77",
    lang: "en",
    topic: "AI training",
    ask: "is the AI trained on my reviews and my clients",
    kb: [/Anthropic doesn't train on this data/],
    forbid: [YES],
    reference:
      "No. Review text and business facts go to Anthropic's API for drafts and checks, and Anthropic doesn't train on this data. Kabsi never uses Google data to train AI models.",
  },
  {
    id: "o78",
    lang: "en",
    topic: "reading WhatsApp messages",
    ask: "who reads my whatsapp messages to kabsi",
    kb: [
      /The WhatsApp messages an owner types to Kabsi are read by an AI model from Anthropic/,
      /Kabsi deletes its own record of each WhatsApp message 12 months after it was sent/,
    ],
    must: [/12 months/],
    reference:
      "The messages you type to Kabsi are read by an AI model from Anthropic to understand what you want, never for training. When you ask for a person, Rashid replies. Kabsi deletes its own record of each WhatsApp message 12 months after it was sent.",
  },
  {
    id: "o79",
    lang: "ar",
    topic: "deleting the data",
    ask: "كيف أحذف بيانات الصالون من كابسي؟",
    gloss: "How do I delete my salon's data from Kabsi?",
    kb: [/Delete this business from Kabsi/],
    must: [/Delete this business from Kabsi/, MAIL],
    warnFirst: /لا تحذف/,
    reference:
      "أولا، لا تحذف ملفك على جوجل لأنك قد تفقد تقييماته. في كابسي افتح Settings ثم Emails واضغط Delete this business from Kabsi واكتب اسم النشاط ثم Delete in 7 days، ويمكنك الإلغاء حتى ذلك التاريخ. أزل أيضا Kabsi Clients من People and access، ولحذف حسابك اكتب إلى hello@kabsi.co.",
  },
  {
    id: "o80",
    lang: "en",
    topic: "data protection law",
    ask: "are you compliant with UK GDPR and the UAE data law?",
    kb: [
      /You can ask to see, correct, delete, get a copy of, or object to the use of your data/,
      /Never give legal, tax or medical advice/,
    ],
    must: [MAIL],
    forbid: [/\bcompliant\b/i],
    reference:
      "I cannot give legal advice or answer for your case. What I can say: you can ask to see, correct, delete, get a copy of or object to the use of your data, Kabsi replies within 30 days, and you can complain to your local data protection authority. For a specific question, write to hello@kabsi.co.",
  },
  {
    id: "o81",
    lang: "en",
    topic: "deleting in Kabsi and the Google page",
    ask: "if I delete my business in kabsi does my google page disappear too",
    kb: [
      /Delete this business from Kabsi/,
      /Review links and QR codes stop working, and so does any NFC card that carries them/,
    ],
    warnFirst: DELETE_WARNING,
    reference:
      "Do not delete your Google profile itself, because deleting it can lose its reviews. Deleting the business in Kabsi removes what Kabsi keeps: reviews, drafts, posts, photos, reports and settings. Your review links and QR codes stop working, so remove Kabsi Clients from People and access on Google too.",
  },
  // ── other trades ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "o82",
    lang: "en",
    topic: "a nail salon",
    ask: "does this work for a nail salon or only hair?",
    kb: [/\/for\/nail-salon/, /nail and beauty salons "nail salon"/],
    must: [/nail/i],
    reference:
      "Yes, it works for a nail salon. Kabsi prepares a reply for every new review, keeps your hours and details right, and turns your photos into posts for your yes. The free check searches nail salon on Google Maps around you, and there is a page for nail salons at kabsi.co/for/nail-salon.",
  },
  {
    id: "o83",
    lang: "en",
    topic: "a mobile beautician",
    ask: "im a mobile beautician, no shop, I go to clients homes. can I use it",
    kb: [
      /a service-area business that travels to customers/,
      /online-only businesses with no in-person contact/,
    ],
    must: [/service area/i],
    reference:
      "Yes, if you have a verified Google profile. Kabsi works for a service-area business that travels to customers, with a service area set on Google, and you can hide an address customers cannot visit. Kabsi does not work for online-only businesses with no in-person contact.",
  },
  {
    id: "o84",
    lang: "en",
    topic: "an aesthetics clinic",
    ask: "aesthetics clinic in Jumeirah, botox and fillers. will the replies mention the treatments?",
    kb: [
      /a public reply shouldn't confirm someone is a patient or mention their care/,
      /no medical results for clinics/,
    ],
    forbid: [YES],
    reference:
      "No. For a clinic, replies stay calm and general: they never confirm someone is a patient, mention a treatment or make a medical claim, and they ask the reviewer to get in touch through the details on your profile. You can add Don't confirm the reviewer is a patient or mention any treatment under never-say, and posts never show medical results.",
  },
  {
    id: "o85",
    lang: "en",
    topic: "a lash studio and a reaction",
    ask: "lash studio. a client wrote a review saying she had a reaction. what does kabsi do",
    kb: [/A review about irritation or a reaction gets no draft/],
    must: [/no draft/i],
    reference:
      "A review about irritation or a reaction gets no draft. It is marked This review needs a little more care, with a short checklist, and Kabsi writes a short, neutral holding reply only if you ask. You decide what goes on Google.",
  },
  {
    id: "o86",
    lang: "fr",
    topic: "a spa",
    ask: "Est-ce que Kabsi marche pour un spa à Dubaï ?",
    gloss: "Does Kabsi work for a spa in Dubai?",
    kb: [/\/for\/spa-and-massage/, /a business that customers visit during stated hours/],
    must: [/spa/i],
    reference:
      "Oui. Kabsi fonctionne pour tout établissement avec une fiche Google vérifiée que les clients visitent, y compris un spa, et il y a une page pour les spas et massages sur kabsi.co/for/spa-and-massage. Kabsi prépare une réponse à chaque nouvel avis, dans la langue de l'avis, et rien ne va sur Google sans votre accord.",
  },
  {
    id: "o87",
    lang: "en",
    topic: "a barber with two shops",
    ask: "barber with 2 shops in Manchester, can I see both in one login",
    kb: [
      /Each location is its own business in Kabsi, with its own Google profile, reviews, plan and review link/,
      /"Your businesses", listing each business/,
    ],
    must: [/Your businesses/],
    reference:
      "Yes. Each shop is its own business in Kabsi, with its own Google profile, reviews and review link. Tap the business name at the top to open Your businesses and switch between them, or Add another business. The second shop is an extra location at $15 a month or $150 a year.",
  },
  {
    id: "o88",
    lang: "en",
    topic: "bookings like Fresha",
    ask: "does kabsi do bookings like fresha?",
    kb: [
      /Today, Kabsi works only with your Google Business Profile/,
      /Say it is \*\*not available today\*\*/,
    ],
    must: [/not available today/i, /kabsi\.co\/scan|free check/i],
    forbid: [/\bnever\b|\b(planned|coming soon|soon|will be added)\b/i],
    reference:
      "That is not available today. Today, Kabsi works only with your Google Business Profile. It does not connect to booking systems, Tripadvisor, Booking.com, Airbnb, Facebook reviews, a till or a CRM, and it does not message your customers. You can run the free check at kabsi.co/scan to see what customers see on your Google profile.",
  },
  {
    id: "o89",
    lang: "en",
    topic: "replies in Arabic",
    ask: "hair salon in Karama, clients write reviews in arabic and english. can replies be in arabic?",
    kb: [/an Arabic review gets a reply in Arabic/],
    must: [/Arabic/],
    reference:
      "Yes. Every reply is drafted in the reviewer's language: an Arabic review gets a reply in Arabic and an English review a reply in English, greeting and sign-off included. You approve each one before it goes on Google.",
  },
  {
    id: "o90",
    lang: "en",
    topic: "Eid and National Day hours",
    ask: "salon in Deira. will you remind me about eid and national day hours?",
    kb: [/A moon-dependent holiday \(Eid, Arafah Day/, /Singapore and the United Arab Emirates/],
    must: [/Eid/],
    reference:
      "Yes. Five days before a public holiday, Kabsi asks you by email and in Kabsi under Hours whether you keep normal hours, close or set custom hours, and nothing changes on Google until you confirm. The UAE's holidays come from its official source. Eid depends on the moon, so Kabsi says expected and you can move the days up to three either way. Ramadan is asked once, before the month starts.",
  },
];

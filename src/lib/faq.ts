// Questions shown on /faq (all) and the homepage (the first five). Every answer must stay true of the
// system as built (§3). Used for the FAQPage JSON-LD too, so answers are plain text.
import { PRICES } from "@/lib/site";

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Does Kabsi post replies by itself?",
    a: "No. Kabsi drafts a reply and emails it to you. Nothing goes on your Google profile until you tap Post, and you see the exact text before it goes.",
  },
  {
    q: "What does Kabsi need from me?",
    a: "Add hello@kabsi.co as a Manager on your Google Business Profile, then tell Kabsi a few facts about your business: how you sign off, your phone number, anything you want mentioned. Drafts only use the facts you give.",
  },
  {
    q: "Which languages does it reply in?",
    a: "The reviewer's language: English, Spanish, Arabic, French and many others. Arabic written in Latin letters (Franco-Arabic) gets a simple English reply, because it reads badly in public.",
  },
  {
    q: "Can Kabsi remove bad reviews?",
    a: "No. Nobody outside Google can remove a review. Kabsi helps you answer every review calmly, including the hard ones. For 1 and 2 star reviews it emails you a careful draft and no quick Post button, so you read it first.",
  },
  {
    q: "Will Kabsi get me more reviews, a better rating or a higher ranking?",
    a: "We don't promise that, and nobody honest can. Google decides local results by relevance, distance and prominence. Kabsi does the parts you control: every review gets a reply, your details stay accurate, your profile stays up to date, and leaving a review is one tap for every customer. Replies and posts help customers; Google doesn't say they raise your ranking.",
  },
  {
    q: "Do I need an NFC card?",
    a: "No. The card is optional. Every business gets a review link (go.kabsi.co/…) and a printable QR code in the dashboard, so you can use Kabsi 100% digitally.",
  },
  {
    q: "Can you ship an NFC card to my country?",
    a: "Kabsi ships NFC cards only in Lebanon. Anywhere else, get a card from a Kabsi partner in your area, or buy any blank NFC card or sticker online and write your Kabsi review link on it with a free NFC app. Your review link and QR code work in every country.",
  },
  {
    q: "Is Kabsi part of Google?",
    a: "No. Kabsi is an independent company and is not affiliated with Google. It works through Google's official Business Profile access, the same way a staff member you add as a Manager would.",
  },
  {
    q: "Can I remove Kabsi's access?",
    a: "Yes, at any time, from your Google profile under People and access. You don't need to ask us.",
  },
  {
    q: "What are the weekly posts?",
    a: "Once a week Kabsi drafts a short Google post from your business facts, with the phrases customers search for in the first line and a button like Call or Book. It emails you the draft. Nothing is posted until you approve it, and you can switch weekly drafts off.",
  },
  {
    q: "Is my Google data sold or used to train AI?",
    a: "No. Your Google data is never sold or rented, and it is never used to train AI models. Kabsi uses it only to draft your replies and posts, watch your listing and send your reports.",
  },
  {
    q: "What is Listing Shield?",
    a: "Kabsi watches your listing's name, phone, address, hours, website and categories. If something changes that you didn't approve, you get an email and can put yours back with one tap. It can't lock your listing or stop people from suggesting edits to Google.",
  },
  {
    q: "Does the card ask only happy customers?",
    a: "No. Every tap and scan opens your Google review page, the same for every customer. There's no rating screen before it.",
  },
  {
    q: "How do I pay?",
    a: `In USDT (TRC20 or Binance Pay) from anywhere. In Lebanon you can also pay with Whish, OMT or cash. Kabsi Pro is $${PRICES.pro6} for 6 months or $${PRICES.pro12} for 12 months. In Lebanon one NFC card is included.`,
  },
  {
    q: "What happens when my plan ends?",
    a: "Reply drafts, weekly posts, Listing Shield and the weekly report stop. Your card and review link keep working and still open your Google review page.",
  },
  {
    q: "Can I get a refund?",
    a: "Kabsi Pro is refundable in full within 14 days of the plan starting. Cards aren't refunded.",
  },
];

export const faqJsonLd = (items = FAQ) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

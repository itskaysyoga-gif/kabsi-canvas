// Questions shown on /faq (all) and the homepage (the first five). Every answer must stay true of the
// system as built (§3). Used for the FAQPage JSON-LD too, so answers are plain text.
import { PRICES } from "@/lib/site";

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What does Kabsi do for my Google Business Profile?",
    a: "Kabsi keeps your profile complete and current by following Google's own published guidance, and you approve every change. It shows a Profile Score and a short Do now list of things to improve, each with a ready draft. It also drafts a reply to every review in the reviewer's language, drafts a weekly post, checks your photos, sets special hours, and watches your listing for changes you did not make.",
  },
  {
    q: "Does Kabsi post or change anything by itself?",
    a: "No. Kabsi drafts and you approve. Nothing goes on your Google profile until you tap Post or Approve, and you see the exact text before it goes.",
  },
  {
    q: "Which businesses can use Kabsi?",
    a: "Kabsi works with a verified Google Business Profile that you own or manage, for a business that meets customers in person during stated hours, or that travels to them in a service area, such as a plumber or a cleaner. It does not work for online-only businesses, rental or for-sale properties, PO boxes or virtual offices used as an address, or other cases Google lists as not eligible in its Business Profile guidelines. If your profile is not verified yet, verify it on Google first (it is free and done at business.google.com), then come back and set up Kabsi.",
  },
  {
    q: "What does Kabsi need from me?",
    a: "Add the Kabsi group ID 5481006796 as a Manager on your Google Business Profile, then tell Kabsi a few facts about your business: your services, how you sign off, your phone number, anything you want mentioned or avoided. Drafts only use the facts you give.",
  },
  {
    q: "Will Kabsi get me more reviews, a better rating or a higher ranking?",
    a: "We don't promise that, and nobody honest can. Google decides local results by relevance, distance and prominence. Kabsi does the parts you control: every review gets a reply, your details stay accurate and complete, your profile stays up to date, and leaving a review is easy for every customer. Google doesn't say that replies or posts raise your ranking.",
  },
  {
    q: "What is the Profile Score?",
    a: "A checklist score out of 100 that Kabsi works out from things it can see: how many recent reviews are answered, how many key facts you have given, whether your review link is shared, whether you posted this week, how many photos you have added, whether your phone, website, category and hours are set, and whether Kabsi is watching your listing. It is Kabsi's own checklist. It is not a Google score and it does not predict how you rank.",
  },
  {
    q: "What is the Do now list?",
    a: "The few things worth doing next, biggest first, each with a short reason and a ready draft where Kabsi can write one. You can do it, put it off for 3 days, or skip it for 30 days. Nothing is sent to Google until you approve it.",
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
    q: "How do I make it easy for customers to leave a review?",
    a: "Every business gets a review link and a printable QR code in the dashboard, free in every country. Share the same link with every customer. If you already own an NFC tag, you can write the same link on it with a free phone app. Kabsi never asks only happy customers and never offers rewards for reviews.",
  },
  {
    q: "Does Kabsi sell NFC cards?",
    a: "Not on this site. Kabsi's team in Lebanon offers a card and setup bundle, described on the Lebanon page. Everywhere else, the review link and QR code do the same job, and any NFC tag you own can carry the link.",
  },
  {
    q: "Is Kabsi part of Google?",
    a: "No. Kabsi is an independent company and is not affiliated with Google. It works through Google's official Business Profile access, the same way a staff member you add as a Manager would.",
  },
  {
    q: "Can I remove Kabsi's access?",
    a: "Yes, at any time, from your Google profile under People and access: remove the Kabsi Clients group. You don't need to ask us.",
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
    q: "How do I pay?",
    a: `Kabsi Pro is $${PRICES.proMonthly} a month or $${PRICES.proYearly} a year, and you can start with a 14-day free trial, no card. You pay in USDT (TRC20 or Binance Pay) from anywhere. In Lebanon you can also pay with Whish, OMT or cash, and our team there sells a $${PRICES.lebanonBundle} a year bundle with an NFC card and setup.`,
  },
  {
    q: "What happens when my plan ends?",
    a: "Reply drafts, weekly posts, Listing Shield and the weekly report stop. Your review link and any card keep working and still open your Google review page.",
  },
  {
    q: "Can I get a refund?",
    a: "Kabsi Pro is refundable in full within 14 days of the plan starting. Cards aren't refunded.",
  },
  {
    q: "Will replying help me show up on Google?",
    a: "Google's own guidance lists complete and accurate details, up-to-date opening hours, replying to reviews and adding photos among the ways to improve local ranking. Kabsi helps with those jobs. Nobody can promise a ranking, and we don't.",
  },
  {
    q: "How is this different from Google's own AI replies?",
    a: "Google may offer its own reply suggestions inside Business Profile. A reply is one part of Kabsi. Kabsi also shows what to improve on your profile, drafts in the reviewer's language from facts you wrote about your business, checks each draft against your rules, comes to your inbox, watches your listing, and never posts until you approve the exact text.",
  },
  {
    q: "What can Kabsi do on my profile as a Manager?",
    a: "Kabsi uses Manager access to read your reviews, post the replies and posts you approve, and watch your listing for unwanted changes. It writes nothing you have not approved. You can remove Kabsi in People and access at any time.",
  },
  {
    q: "Who is behind Kabsi?",
    a: "Kabsi is an independent product run by Rashid Abou Hamzy. It is not affiliated with Google. You can write to hello@kabsi.co.",
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

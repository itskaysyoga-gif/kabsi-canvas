// Scope 1 (master plan 30.19 section 3 item 1): three questions on the honest limits. Same shape and rules as questions.ts.
// The 60 and the 20 of 28.7 stay as they are (their tests count them); the live run asks these as well with --with-28.
// Nora answers any question about another platform with the line in the facts (section 2.1b), says "not available today"
// (never "never"), gives no future date and offers the free check. These are stub cases: no live run belongs to Scope 1.
import type { Question } from "./questions.ts";

const LINE = /Today, Kabsi works only with your Google Business Profile/;
const NOT_AVAILABLE_TODAY = /not available today/i;
// The words an owner must not hear: "never", or a plan or date for the thing.
const NO_PROMISE_OF_LATER =
  /\bnever\b|\b(planned|coming soon|roadmap|soon|later this|next (week|month|year)|will be added)\b/i;
const FREE_CHECK = /kabsi\.co\/scan|free check/i;

export const QUESTIONS_SCOPE1: Question[] = [
  {
    id: "sc01",
    lang: "en",
    topic: "replies on Tripadvisor",
    ask: "Can Kabsi write my replies on Tripadvisor too?",
    kb: [LINE, /Say it is \*\*not available today\*\*/],
    must: [NOT_AVAILABLE_TODAY, /Google Business Profile/, FREE_CHECK],
    forbid: [NO_PROMISE_OF_LATER],
    reference:
      "That is not available today. Today, Kabsi works only with your Google Business Profile. It does not connect to booking systems, Tripadvisor, Booking.com, Airbnb, Facebook reviews, a till or a CRM, and it does not message your customers. If you like, run the free check at kabsi.co/scan to see what customers see on your Google profile.",
  },
  {
    id: "sc02",
    lang: "en",
    topic: "a Fresha or Booksy connection",
    ask: "Does Kabsi connect to Fresha or Booksy so it can see my bookings?",
    kb: [LINE, /Say it is \*\*not available today\*\*/],
    must: [NOT_AVAILABLE_TODAY, /booking systems/i, FREE_CHECK],
    forbid: [NO_PROMISE_OF_LATER],
    reference:
      "That is not available today. Today, Kabsi works only with your Google Business Profile. It does not connect to booking systems, Tripadvisor, Booking.com, Airbnb, Facebook reviews, a till or a CRM, and it does not message your customers. The free check at kabsi.co/scan shows what customers see on your Google profile.",
  },
  {
    id: "sc03",
    lang: "en",
    topic: "answering customers on WhatsApp",
    ask: "Can Kabsi answer my customers on WhatsApp?",
    kb: [LINE, /Say it is \*\*not available today\*\*/],
    must: [NOT_AVAILABLE_TODAY, /(does not|doesn't) message your customers/i, FREE_CHECK],
    forbid: [NO_PROMISE_OF_LATER],
    reference:
      "That is not available today. Today, Kabsi works only with your Google Business Profile. It does not connect to booking systems, Tripadvisor, Booking.com, Airbnb, Facebook reviews, a till or a CRM, and it does not message your customers. You can run the free check at kabsi.co/scan to see your Google profile as customers see it.",
  },
];

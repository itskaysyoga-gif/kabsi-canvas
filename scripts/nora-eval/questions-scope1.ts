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
// Sync 2a (R-142 item 8, KB-28): the booking answer. It describes no assistant and promises nothing later.
const BOOKING_LINE = /Kabsi looks after your Google Business Profile\. It is not a booking system and does not keep your customers' bookings or requests/;
const NO_PROMISE_OR_ASSISTANT =
  /\bnever\b|\b(planned|coming|soon|roadmap|later this|next (week|month|year)|will be added|request book|booking assistant that)\b|\bvamos a\b|\bpronto\b|\bpróximamente\b/i;

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
  {
    id: "sc04",
    lang: "en",
    topic: "customers' bookings and requests",
    ask: "Can Kabsi keep my customers' bookings and requests for me? Is it a booking assistant?",
    kb: [BOOKING_LINE, /Do not say it is planned, coming or soon/],
    must: [/not a booking system/i, /Google Business Profile/],
    forbid: [NO_PROMISE_OR_ASSISTANT],
    reference:
      "Kabsi looks after your Google Business Profile. It is not a booking system and does not keep your customers' bookings or requests.",
  },
  {
    id: "sc05",
    lang: "es",
    topic: "reservas y solicitudes de los clientes",
    ask: "¿Kabsi guarda las reservas y solicitudes de mis clientes? ¿Es un asistente de reservas?",
    gloss: "Does Kabsi keep my customers' bookings and requests? Is it a booking assistant?",
    kb: [BOOKING_LINE, /Do not say it is planned, coming or soon/],
    must: [/no es un sistema de reservas/i, /Google Business Profile/],
    forbid: [NO_PROMISE_OR_ASSISTANT],
    reference:
      "Kabsi cuida tu perfil de Google Business Profile. No es un sistema de reservas y no guarda las reservas ni las solicitudes de tus clientes.",
  },
];

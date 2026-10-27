// scripts/app-shots fixtures for the public leftovers of Web 2 (UX 1): the review page, the email action pages, the
// staff upload page and unsubscribe. Invented businesses and people only. Values or (ctx) => value; ctx.state is the
// route's state. Nothing here is imported from fixtures.mjs at the top level (fixtures.mjs imports this file).

const review = {
  id: "r1",
  reviewer: "Maya R.",
  rating: 5,
  comment: "Hana did my colour and it is exactly what I asked for. Lovely, calm place.",
  state: "drafted",
  risk: "low",
  risk_reasons: [],
  reply: null,
};

export const tables = {};
export const rpc = {};
export const functions = {
  // /a/TOKEN: the approve-a-reply link (GET reads it, POST acts on it).
  "GET api/action": (c) =>
    c.state === "a-expired"
      ? { status: "expired", mode: "mock" }
      : c.state === "a-used"
        ? {
            status: "used",
            action: "post",
            business: "Rose Lane Salon",
            mode: "mock",
            review: {
              ...review,
              state: "posted",
              reply: "Thank you, Maya. We will pass this on to Hana. See you at your next visit.",
            },
            result: { done: "posted" },
          }
        : {
            status: "ok",
            action: "post",
            business: "Rose Lane Salon",
            mode: "mock",
            review,
            draft: "Thank you, Maya. We will pass this on to Hana. See you at your next visit.",
            sign_in: false,
          },
  "POST api/action": {
    ok: true,
    done: "approved",
    state: "approved",
    publication: "p1",
    repeat: false,
  },
  // /h/TOKEN: the holiday hours link.
  "GET api/holiday": (c) =>
    c.state === "h-expired"
      ? { status: "expired" }
      : {
          status: "ok",
          business: "Rose Lane Salon",
          holiday: {
            name: "National Day",
            starts_on: "2026-12-02",
            ends_on: "2026-12-03",
            kind: "public",
            estimated: false,
          },
          answer: null,
          regular_hours: "Monday to Saturday, 9:00 to 20:00",
          signed_in: false,
        },
  // /u/TOKEN: the staff upload link.
  photos: (c) =>
    c.state === "u-off"
      ? {
          __status: 410,
          body: { message: "The owner turned this link off. Ask them for a new one." },
        }
      : { name: "Rose Lane Salon" },
  // /unsubscribe?t=TOKEN
  "email/unsubscribe": { label: "Results Report" },
  // /review/CODE: the review link page.
  "review-page": (c) =>
    c.state === "inactive"
      ? { __status: 404, body: {} }
      : {
          name: "Rose Lane Salon",
          review_url: "https://search.google.com/local/writereview?placeid=ChIJroselanesalon000001",
          whatsapp: "971500000102",
        },
};

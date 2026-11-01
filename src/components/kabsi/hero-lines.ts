// The hero lines a route's head needs (Design 8, Web 4). Their own tiny file: route heads stay in the shared bundle on
// every page (Lean 1), so a head must never import a page component or a page's data.

/** Home's supporting line (Design 7 line 1, picked). The WhatsApp switch adds WHATSAPP_LAUNCH_LINE while it is off. */
export const HOME_LINE =
  "Kabsi checks your Google profile every day, prepares the replies, posts and fixes it needs, and asks for your yes on WhatsApp.";

/** The free check's hero. */
export const CHECK_HERO = {
  title: "Check your business on Google, free.",
  line: "See what customers see on your Google profile and what to do first. About 10 seconds, and no access needed.",
} as const;

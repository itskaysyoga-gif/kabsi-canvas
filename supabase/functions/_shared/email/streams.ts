// The mail streams (master plan 30.18 section 2). Account and product mail: Kabsi <hello@send.kabsi.co>, Reply-To
// hello@kabsi.co. Lifecycle and news: Kabsi <hello@news.kabsi.co>. Both through Resend.
//
// news.kabsi.co is not a domain in Resend yet (Resend's domain list, read 27 Oct 2026: kabsi.co and send.kabsi.co, both
// verified). Until it is, lifecycle mail goes from send.kabsi.co: this one constant. Once Rashid has added the DNS records
// and Resend reads news.kabsi.co as verified, set it to true (and app_settings.email_from_news if the address changes).
export const NEWS_DOMAIN_VERIFIED = false;

/** Lifecycle mail: the tips while someone sets up and tries Kabsi, and the win-backs (all in the Trial tips category). */
export const LIFECYCLE_CATEGORIES: readonly string[] = ["trial"];

export type Stream = "send" | "news";
export const streamOf = (category: string): Stream => (NEWS_DOMAIN_VERIFIED && LIFECYCLE_CATEGORIES.includes(category) ? "news" : "send");

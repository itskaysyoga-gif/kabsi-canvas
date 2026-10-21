// The one place an email is rendered: structured content in, HTML and plain text out. The notification engine
// (notify-engine.ts) is the only caller. No imports with side effects, so Deno tests can use it without secrets.
import { emailLayout } from "./email-layout.ts";

export type EmailContent = {
  subject: string;
  preheader: string;
  title: string;
  bodyHtml: string;
  text: string;
  button?: { label: string; url: string };
  links?: { label: string; url: string }[];
  note?: string;
  /** What this item looks like inside a daily digest. Without it the digest shows the in-app title and link. */
  digest?: { html: string; text: string };
};

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const html = emailLayout({ preheader: c.preheader, title: c.title, bodyHtml: c.bodyHtml, button: c.button, links: c.links, note: c.note });
  return { html, text: c.text };
}

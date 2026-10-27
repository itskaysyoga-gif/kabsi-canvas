// Nora on WhatsApp (session 13b part 2; master plan 28.6, 28.7, 30.9 item 5). A question the fixed tools do not cover
// ("what happens to my reviews if I cancel", "can Kabsi post without asking me") is answered from the public facts, with
// the same standing rules as Nora on the website (nora-rules.ts) plus the few lines that differ on WhatsApp. QA 1 judged
// her WhatsApp answers 3.33 of 5 because a question got the welcome line instead of an answer: the welcome now goes only
// on a person's first message (agent.ts), and an answer never starts with it.
// Pure: the model call and the facts are passed in by db.ts, so the suite runs on a stub.
import { knownLinksOnly, noraRules } from "../nora-rules.ts";
import { houseStyle, stripAll } from "../ai/fence.ts";

export type Nora = (question: string, o: { role: string; lang: string | null; business: string | null }) => Promise<string>;

/** What is different on WhatsApp. Later lines win over the website rules where they differ. */
export const WHATSAPP_LINES = `## On WhatsApp (this chat), these lines win over anything above
- You are answering inside Kabsi's own WhatsApp chat. Answer the question in your first sentence. Never open with a welcome, a greeting or an introduction of yourself, and never repeat the menu of words they can send.
- Plain text only, short: at most 4 short sentences, or 3 short lines of steps. No Markdown, no links in brackets. Write a Kabsi page as a plain address without https, for example kabsi.co/pricing or kabsi.co/get-started.
- You have no tools here: never ask for an email, never call or mention save_contact, hand_off_to_human, list_tasks or save_fact. You cannot see or change anyone's account in this chat.
- A person: they send "talk to a person" in this chat and someone from Kabsi answers here within one business day. They can also write to hello@kabsi.co or book the free setup call at kabsi.co/setup-call.
- This chat is Kabsi's WhatsApp number. Never give any other number.
- Owners who connected their business approve replies, posts and hours here with a Yes; you yourself approve, publish and change nothing.`;

/** The cached system prompt: the website rules, the WhatsApp lines, then the facts (the cached part, 26.1). */
export function noraWhatsAppSystem(facts: string): string {
  const kb = facts.trim() || "(The knowledge base could not be loaded. Answer nothing factual; say they can send \"talk to a person\".)";
  return `${noraRules(true, "this chat")}\n\n${WHATSAPP_LINES}\n\n<knowledge_base>\n${kb}\n</knowledge_base>`;
}

/** The person's words, fenced as data, with what the router knows about them. */
export function noraUser(question: string, o: { role: string; lang: string | null; business: string | null }): string {
  const who = o.role === "unknown" || o.role === "prospect"
    ? "A person who is not a Kabsi customer yet."
    : `A ${o.role} of ${o.business ?? "a business"} on Kabsi.`;
  return `<context>\n${who}${o.lang ? ` They write in the language with code ${o.lang}.` : ""}\n</context>\n<message>\n${
    stripAll(question, /<\s*\/?\s*(message|context)\s*>/gi).slice(0, 1500)
  }\n</message>`;
}

/** The answer as WhatsApp shows it: plain text, the house style, no Markdown, never the welcome line. */
export function forWhatsApp(text: string): string {
  return houseStyle(
    knownLinksOnly(text)
      .replace(/\[([^\]]{1,80})\]\((?:https?:\/\/)?(?:kabsi\.co)?(\/[^)\s]*)\)/g, (_m, label: string, path: string) =>
        path === "/" ? `${label} (kabsi.co)` : `${label} (kabsi.co${path})`)
      .replace(/\[([^\]]{1,80})\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
      .replace(/\*\*|__|^#+\s*/gm, "")
      .replace(/^(welcome to kabsi[.,]?\s*|hi( there)?[,.]\s*|hello[,.]\s*)/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  ).slice(0, 1500);
}

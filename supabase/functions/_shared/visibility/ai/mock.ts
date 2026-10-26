// The mock AI provider (mock mode and the demo business, R-17): fixed, fictional answers, no network, no cost. The
// answer depends only on the prompt and the provider, so the same prompt gives the same answer every time. Names are
// fictional and match the Visibility Map's mock (Harbor Bakes and its neighbours).
import type { AiProvider, AiProviderName, AskContext, RawAnswer } from "./providers.ts";
import { MODELS } from "./providers.ts";

const RIVALS = ["Harbor Bakes", "Corner Crumb", "Oven Street", "Morning Loaf", "Sunrise Pastry"];
const SOURCES = [
  { domain: "timeout.com", title: "The best bakeries in town" },
  { domain: "tripadvisor.com", title: "Top 10 bakeries nearby" },
  { domain: "example-eats.test", title: "Where to eat this week" },
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Mock answer: the business is named in two of every three prompts, always after Harbor Bakes. */
export function mockAnswer(provider: AiProviderName, prompt: string, business: string): RawAnswer {
  const h = hash(`${provider}:${prompt}`);
  const named = h % 3 !== 0;
  const list = RIVALS.slice(h % 2, (h % 2) + 3);
  const items = named ? [list[0], business, ...list.slice(1)] : list;
  const text = `Here are some options:\n${items.map((n, i) => `${i + 1}. **${n}** - well reviewed and popular with locals.`).join("\n")}`;
  const sources = provider === "gemini" ? [] : SOURCES.slice(0, 1 + (h % 3));
  return { text, sources, model: MODELS[provider], costMicros: 0, sourceCount: provider === "gemini" ? 3 : sources.length };
}

export function mockAi(provider: AiProviderName, business: string): AiProvider {
  return { name: provider, live: false, ask: (prompt: string, _ctx: AskContext) => Promise.resolve(mockAnswer(provider, prompt, business)) };
}

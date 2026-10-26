// What an AI answer says about a business (master plan 27.3 item 2): named or not, where in the answer, which
// competitors were named (matched to the business's own competitor list where possible) and the sources cited. Pure.
import type { AiSource } from "./providers.ts";

export type KnownCompetitor = { key: string; name: string };
export type CompetitorNamed = { name: string; key: string | null; matched: boolean };
export type Analysis = { named: boolean; position: number | null; competitors: CompetitorNamed[]; sources: AiSource[] };

export const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

// Words that do not make a business name its own: "Harbor Bakes" and "Harbor Bakes Bakery" are the same business.
const GENERIC = new Set(["the", "a", "bakery", "cafe", "coffee", "restaurant", "clinic", "dental", "dentist", "salon", "shop", "store", "co", "ltd", "llc", "inc", "and"]);
const core = (s: string) => norm(s).split(" ").filter((w) => w && !GENERIC.has(w)).join(" ");

/** The whole name, or its distinctive part (at least 3 characters), as whole words in the text. */
export function mentions(text: string, name: string): number {
  const t = ` ${norm(text)} `;
  for (const cand of [norm(name), core(name)]) {
    if (cand.length < 3) continue;
    const i = t.indexOf(` ${cand} `);
    if (i >= 0) return i;
  }
  return -1;
}

const NOT_NAMES = /^(note|tip|here|these|this|there|however|overall|summary|answer|options?|top|best|recommendations?|please|sources?|disclaimer|i |you |if |for |based|according|keep|check|call|visit|consider|sure|certainly|of course)\b/i;

/** Business names a list in the answer names, in the order they appear: bold names, or the start of numbered and bulleted lines. */
export function listedNames(text: string): { name: string; at: number }[] {
  const out: { name: string; at: number }[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(?:\d{1,2}[.)]|[-*•])\s+(.*)$/);
    if (m) {
      const body = m[1];
      const bold = body.match(/\*\*([^*]{2,60})\*\*/) ?? body.match(/__([^_]{2,60})__/);
      let name = bold ? bold[1] : body.split(/\s[-:|]\s|:\s|,\s|\.\s|\(|\s{2,}/)[0];
      name = name.replace(/[*_`#[\]]/g, "").replace(/\s+/g, " ").replace(/[.,;:!?]+$/, "").trim();
      const words = name.split(" ");
      if (name.length >= 2 && name.length <= 60 && words.length <= 7 && /^[\p{Lu}\d]/u.test(name) && !NOT_NAMES.test(name)) {
        out.push({ name, at: offset + line.indexOf(m[1]) });
      }
    }
    offset += line.length + 1;
  }
  return out;
}

export function analyze(o: { text: string; sources?: AiSource[]; business: string; known?: KnownCompetitor[] }): Analysis {
  const known = o.known ?? [];
  const self = mentions(o.text, o.business);
  const named = self >= 0;
  type Ent = { name: string; at: number; key: string | null; matched: boolean; me: boolean };
  const ents: Ent[] = [];
  const same = (a: string, b: string) => core(a) === core(b) || norm(a) === norm(b);
  const add = (e: Ent) => {
    if (e.me) {
      if (!ents.some((x) => x.me)) ents.push(e);
      return;
    }
    if (same(e.name, o.business)) return;
    const dup = ents.find((x) => !x.me && same(x.name, e.name));
    if (dup) {
      dup.at = Math.min(dup.at, e.at);
      dup.key ??= e.key;
      dup.matched ||= e.matched;
      return;
    }
    ents.push(e);
  };
  if (named) add({ name: o.business, at: self, key: null, matched: false, me: true });
  for (const l of listedNames(o.text)) {
    if (mentions(l.name, o.business) >= 0 || same(l.name, o.business)) {
      if (named) {
        // The line that names the business gives its place in the list.
        const me = ents.find((x) => x.me);
        if (me) me.at = Math.min(me.at, l.at);
      }
      continue;
    }
    const k = known.find((c) => same(c.name, l.name) || mentions(l.name, c.name) >= 0);
    add({ name: k?.name ?? l.name, at: l.at, key: k?.key ?? null, matched: !!k, me: false });
  }
  for (const c of known) {
    const at = mentions(o.text, c.name);
    if (at >= 0) add({ name: c.name, at, key: c.key, matched: true, me: false });
  }
  ents.sort((a, b) => a.at - b.at);
  const position = named ? ents.findIndex((e) => e.me) + 1 : null;
  return {
    named,
    position: position && position > 0 ? position : null,
    competitors: ents.filter((e) => !e.me).slice(0, 10).map((e) => ({ name: e.name, key: e.key, matched: e.matched })),
    sources: o.sources ?? [],
  };
}

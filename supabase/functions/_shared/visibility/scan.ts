// What a finished grid means (master plan 27.3 items 1, 3 and 4; 28.6 Scout): the three numbers, the WhatsApp line,
// the competitors to offer and watch, and the category check. Pure functions over DataForSEO results only (30.10.2):
// nothing here reads the Business Profile, so no customer's Google data is ever set next to another business.
// Wording (docs/COPY.md sections 2, 19 and 20) states what was measured, never a promise or a cause (K-144).
import { DEPTH, type Identity, isSame, keyOf, type MapsItem } from "./dataforseo.ts";
import { type Direction, directionOf, GRID_SIZE } from "./grid.ts";

export type CellResult = { row: number; col: number; rank: number | null; items: MapsItem[] };

export type Beats = { key: string; name: string; spots: number; direction: Direction | null };
export type Summary = {
  points: number;
  /** Average rank over every spot; a spot outside the top 20 counts as 21. One decimal. */
  averageRank: number;
  top3: number;
  ranked: number;
  centreRank: number | null;
  beats: Beats | null;
};

const NOT_RANKED = DEPTH + 1;

export function summarize(cells: CellResult[], who: Identity): Summary {
  const n = cells.length;
  const avg = n ? cells.reduce((s, c) => s + (c.rank ?? NOT_RANKED), 0) / n : NOT_RANKED;
  const half = (GRID_SIZE - 1) / 2;
  // Who beats the business in the most spots: ranked above it, or ranked at all where the business is not.
  const wins = new Map<string, { name: string; cells: { row: number; col: number }[]; rankSum: number }>();
  for (const c of cells) {
    for (const i of c.items) {
      if (isSame(i, who)) continue;
      if (c.rank != null && i.rank >= c.rank) continue;
      const k = keyOf(i);
      const w = wins.get(k) ?? { name: i.title, cells: [], rankSum: 0 };
      w.cells.push({ row: c.row, col: c.col });
      w.rankSum += i.rank;
      wins.set(k, w);
    }
  }
  let beats: Beats | null = null;
  let best: { spots: number; rankSum: number } | null = null;
  for (const [key, w] of wins) {
    const spots = w.cells.length;
    if (!best || spots > best.spots || (spots === best.spots && w.rankSum < best.rankSum)) {
      best = { spots, rankSum: w.rankSum };
      beats = { key, name: w.name, spots, direction: spots < n ? directionOf(w.cells) : null };
    }
  }
  return {
    points: n,
    averageRank: Math.round(avg * 10) / 10,
    top3: cells.filter((c) => c.rank != null && c.rank <= 3).length,
    ranked: cells.filter((c) => c.rank != null).length,
    centreRank: cells.find((c) => c.row === half && c.col === half)?.rank ?? null,
    beats,
  };
}

// ─── the WhatsApp line (docs/COPY.md section 20, "Owner, first map") ─────────────────────────────────────────────
export type MapMessage = { body: string; buttons: { id: string; title: string }[] };

export function beatsLine(s: Summary, business: string): string | null {
  if (!s.beats) return null;
  return s.beats.direction
    ? `${s.beats.name} beats you ${s.beats.direction} of ${business}.`
    : `${s.beats.name} beats you in ${s.beats.spots} of ${s.points} spots.`;
}

/**
 * "Your first map is ready. You are top 3 in 18 of 49 spots for 'bakery'. Harbor Bakes beats you east of the
 * station. 3 next steps:" The steps come from Insights (V4); without them the line ends after the numbers.
 */
export function mapMessage(o: { summary: Summary; keyword: string; business: string; first: boolean; steps?: string[] }): MapMessage {
  const s = o.summary;
  const parts = [
    o.first ? "Your first map is ready." : "Your new map is ready.",
    `You are top 3 in ${s.top3} of ${s.points} spots for '${o.keyword}'.`,
  ];
  const b = beatsLine(s, o.business);
  if (b) parts.push(b);
  let body = parts.join(" ");
  if (o.steps?.length) body += ` ${o.steps.length} next steps:\n` + o.steps.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return { body, buttons: [{ id: "map_show", title: "Show me" }, { id: "map_later", title: "Later" }] };
}

// ─── Competitor Watch (27.3 item 3) ──────────────────────────────────────────────────────────────────────────────
export type Competitor = {
  key: string; name: string; cid: string | null; place_id: string | null; category: string | null; categories: string[];
  rating: number | null; reviews: number | null; photos: number | null; spots: number; bestRank: number; averageRank: number;
};

/** Every other business seen in the grid, most present first: the list the owner picks 3 (Essentials) or 5 (Pro) from. */
export function competitors(cells: CellResult[], who: Identity, limit = 10): Competitor[] {
  const seen = new Map<string, Competitor & { rankSum: number }>();
  for (const c of cells) {
    for (const i of c.items) {
      if (isSame(i, who)) continue;
      const k = keyOf(i);
      const cur = seen.get(k);
      if (!cur) {
        seen.set(k, {
          key: k, name: i.title, cid: i.cid, place_id: i.place_id, category: i.category, categories: i.categories,
          rating: i.rating, reviews: i.reviews, photos: i.photos, spots: 1, bestRank: i.rank, averageRank: 0, rankSum: i.rank,
        });
      } else {
        cur.spots++;
        cur.rankSum += i.rank;
        cur.bestRank = Math.min(cur.bestRank, i.rank);
      }
    }
  }
  const n = Math.max(cells.length, 1);
  return [...seen.values()]
    .map(({ rankSum, ...c }) => ({ ...c, averageRank: Math.round(((rankSum + (n - c.spots) * NOT_RANKED) / n) * 10) / 10 }))
    .sort((a, b) => a.averageRank - b.averageRank || b.spots - a.spots)
    .slice(0, limit);
}

/** The business's own public row (rating, reviews, categories), from the result at its own address. */
export function selfRow(cells: CellResult[], who: Identity): MapsItem | null {
  const half = (GRID_SIZE - 1) / 2;
  const order = [...cells].sort((a, b) => Math.abs(a.row - half) + Math.abs(a.col - half) - (Math.abs(b.row - half) + Math.abs(b.col - half)));
  for (const c of order) {
    const me = c.items.find((i) => isSame(i, who));
    if (me) return me;
  }
  return null;
}

/** "Smile Clinic got 14 reviews this month. You got 3." From two public counts about a month apart. */
export function reviewRaceLine(rival: { name: string; before: number | null; now: number | null }, me: { before: number | null; now: number | null }): string | null {
  if (rival.before == null || rival.now == null || me.before == null || me.now == null) return null;
  const theirs = Math.max(0, rival.now - rival.before), mine = Math.max(0, me.now - me.before);
  if (theirs <= mine) return null;
  const word = (n: number) => (n === 1 ? "review" : "reviews");
  return `${rival.name} got ${theirs} ${word(theirs)} this month. You got ${mine}.`;
}

// ─── Category check (27.3 item 4) ────────────────────────────────────────────────────────────────────────────────
export type CategoryCheck = { current: string | null; suggested: string; shared_by: string[] } | null;

/**
 * Compares the business's primary category with the top three competitors in the grid. When at least two of them
 * share a primary category the business does not have at all, Kabsi proposes it, as an approval the owner says yes
 * or no to, never automatically.
 */
export function categoryCheck(me: Pick<MapsItem, "category" | "categories"> | null, top: Competitor[]): CategoryCheck {
  if (!me) return null;
  const three = top.slice(0, 3).filter((c) => c.category);
  const counts = new Map<string, string[]>();
  for (const c of three) counts.set(c.category!, [...(counts.get(c.category!) ?? []), c.name]);
  const mine = new Set(me.categories.map((c) => c.toLowerCase()));
  for (const [cat, names] of [...counts].sort((a, b) => b[1].length - a[1].length)) {
    if (names.length >= 2 && !mine.has(cat.toLowerCase())) return { current: me.category, suggested: cat, shared_by: names };
  }
  return null;
}

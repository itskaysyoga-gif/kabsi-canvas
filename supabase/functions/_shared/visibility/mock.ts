// The mock Maps provider (mock mode and the demo business, R-17): the same answers every time, no network, no cost.
// The tag of a grid task is "<scan id>:<row>:<col>", so the mock knows where each point is. The business ranks well
// at home and slips to the east, where the fictional "Harbor Bakes" leads: enough to exercise every pin colour, the
// three numbers and the "beats you" line. All names are fictional.
import { DEPTH, type Identity, type MapsItem, type MapsProvider, type MapsTask } from "./dataforseo.ts";

export const MOCK_CENTER = { lat: 25.0805, lng: 55.1403 };

const RIVALS = [
  "Harbor Bakes", "Corner Crumb", "Oven Street", "Morning Loaf", "Grain and Co", "Sunrise Pastry", "Little Rye",
  "Flour Room", "Golden Crust", "Hearth House", "The Bread Shed", "Daily Knead", "Crumb and Coffee", "Rolling Pin",
  "Butter Lane", "Sweet Table", "Proof Bakery", "Kiln Kitchen", "Batch Twelve", "Seed and Stone", "Late Oven",
] as const;

function item(rank: number, title: string, i: number): MapsItem {
  return {
    rank, title, cid: `mock-${i}`, place_id: null, category: i % 4 === 0 ? "Cafe" : "Bakery",
    categories: i % 4 === 0 ? ["Cafe", "Bakery"] : ["Bakery"], rating: 4 + ((i * 7) % 10) / 10,
    reviews: 40 + i * 23, photos: 10 + i * 5, lat: null, lng: null,
  };
}

/** Rank of the business at a cell: 1 at home, worse with distance, much worse to the east; null means 20+. */
export function mockRank(row: number, col: number): number | null {
  const d = Math.abs(row - 3) + Math.abs(col - 3);
  const east = Math.max(0, col - 3);
  const r = 1 + d + east * 4 + (row === 0 ? 3 : 0);
  return r > DEPTH ? null : r;
}

export function mockItems(tag: string, who: Identity & { title: string }): MapsItem[] {
  const [, rowS, colS] = tag.split(":");
  const row = Number(rowS ?? 3), col = Number(colS ?? 3);
  const mine = mockRank(row, col);
  // Harbor Bakes leads in the east; elsewhere the order turns from cell to cell, so nobody else leads everywhere.
  const rest = RIVALS.slice(1);
  const turn = (row * 3 + col) % rest.length;
  const turned = [...rest.slice(turn), ...rest.slice(0, turn)];
  const rivals = col > 3 ? [RIVALS[0], ...turned] : [...turned.slice(0, 4), RIVALS[0], ...turned.slice(4)];
  const out: MapsItem[] = [];
  let k = 0;
  for (let rank = 1; rank <= DEPTH; rank++) {
    if (rank === mine) out.push({ ...item(rank, who.title, 99), cid: who.cid ?? "mock-self", place_id: who.place_id ?? null });
    else out.push(item(rank, rivals[k], RIVALS.indexOf(rivals[k++] as typeof RIVALS[number])));
  }
  return out;
}

export function mockProvider(who: Identity & { title: string }): MapsProvider {
  const posted = new Set<string>();
  return {
    live: false,
    post(tasks: MapsTask[]) {
      const out: Record<string, string> = {};
      for (const t of tasks) {
        out[t.tag] = `mock|${t.tag}`;
        posted.add(out[t.tag]);
      }
      return Promise.resolve(out);
    },
    ready: () => Promise.resolve([...posted]),
    get(id: string) {
      if (!id.startsWith("mock|")) return Promise.resolve(null);
      const tag = id.slice(5);
      return Promise.resolve({ tag, items: mockItems(tag, who) });
    },
    // Finding the business: a fixed made-up spot, so the demo map always draws.
    liveOne: (t: MapsTask) =>
      Promise.resolve(t.tag === "locate" ? [{ ...item(1, who.title, 99), cid: who.cid ?? "mock-self", place_id: who.place_id ?? null, lat: MOCK_CENTER.lat, lng: MOCK_CENTER.lng }] : mockItems("fast:3:3", who)),
  };
}

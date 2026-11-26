// FIX-6 (R-168 item 4): which business the app opens on when a user belongs to several. Pure, so a test can prove it.
//
//   - The default is the most recently used business that is not a demo business. A user who has used none yet gets the
//     newest real business. Demo businesses (is_demo) are never the default while a real one exists.
//   - In the switcher the demo businesses come last, each with its "Example" label (the label is the screen's).
//   - A business the person picks on purpose stays open for that browser tab (sessionStorage), demo or not, so looking at
//     the example once does not turn it into the next visit's default; the next visit opens on a real business again.
//   - What a person last used is kept per user (a recency list in this browser, never shared between two accounts).

export type Pickable = { id: string; is_demo?: boolean | undefined; created_at: string };

export const MRU_MAX = 10;
export const mruKey = (uid: string) => `kabsi.location.recent.${uid}`;
export const tabKey = (uid: string) => `kabsi.location.tab.${uid}`;

/** The recency list after a pick: the id first, the rest in order, no repeats, at most MRU_MAX. */
export function pushRecent(mru: readonly string[], id: string): string[] {
  return [id, ...mru.filter((x) => x !== id)].slice(0, MRU_MAX);
}

/** Real businesses first, demo businesses last; inside each group the most recently used first, then the newest. */
export function sortLocations<T extends Pickable>(list: readonly T[], mru: readonly string[]): T[] {
  const rank = (id: string) => {
    const i = mru.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...list].sort((a, b) => {
    const demo = Number(a.is_demo === true) - Number(b.is_demo === true);
    if (demo !== 0) return demo;
    const used = rank(a.id) - rank(b.id);
    if (used !== 0) return used;
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}

/** The business to open: the tab's own pick if it is still a business of the user, else the first of the sorted list. */
export function pickLocation<T extends Pickable>(
  list: readonly T[],
  o: { mru: readonly string[]; tab?: string | null },
): T | null {
  const tabbed = o.tab ? list.find((l) => l.id === o.tab) : undefined;
  return tabbed ?? sortLocations(list, o.mru)[0] ?? null;
}

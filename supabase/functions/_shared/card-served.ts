// Cards 2 (master plan 30.50 item 9): how the go.kabsi.co Worker is told to serve a card. One rule, read by the tap
// function (the Worker's database lookup) and kv-sync (the Worker's KV copy), so the two never disagree.
//   - A card linked to a business: as before (active, its page mode).
//   - A partner card no owner has claimed yet, with its business set by the partner: served as an active direct link, so a
//     tap goes straight to that business's Google review form: no page in between, no rating question, no filter. Its taps
//     are logged like any other (no IP), with no business in Kabsi until an owner claims the card.
//   - Anything else (a partner card with no business yet, an unassigned card, a card switched off): not active; the Worker
//     sends an unlinked card to kabsi.co/activate/CODE as before.
export type CardRow = {
  status: string;
  destination: string | null;
  location_id: string | null;
  page_mode: string | null;
  partner_id?: string | null;
};
export type Served = { status: string; destination: string | null; location_id: string | null; page_mode: "direct" | "page" };

const GOOGLE = /^https:\/\/search\.google\.com\/local\/writereview\?placeid=[A-Za-z0-9_-]{10,300}$/;

export function served(c: CardRow): Served {
  const partnerReady = c.status === "unassigned" && !!c.partner_id && !c.location_id && !!c.destination && GOOGLE.test(c.destination);
  if (partnerReady) return { status: "active", destination: c.destination, location_id: null, page_mode: "direct" };
  return { status: c.status, destination: c.destination ?? null, location_id: c.location_id ?? null, page_mode: c.page_mode === "page" ? "page" : "direct" };
}

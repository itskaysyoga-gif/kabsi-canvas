// Cards 2 (master plan 30.50 item 9): the partner's card links on kabsi.co/partners/home. Read and written only through the
// programs function (signed in): GET partner/cards, POST partner/cards/mint, POST partner/cards/place. Kabsi sells no
// cards: a partner writes each link on a card they sell. A tap on an unclaimed card goes straight to the business's
// Google review form; taps are shown only until the owner claims the card (then they are the business's).
import { supabase } from "@/lib/supabase";

export type CardLinkState = "new" | "set" | "claimed" | "off";
export type CardLink = {
  code: string;
  state: CardLinkState;
  destination: string | null;
  taps: number;
  minted_at: string;
};
export type CardLinks = {
  result: "ok" | "not_partner";
  limit: number;
  used: number;
  can_mint: boolean;
  cards: CardLink[];
};

export const CARD_LINK_HOST = "https://go.kabsi.co";
export const cardLinkUrl = (code: string) => `${CARD_LINK_HOST}/${code}`;
export const BATCHES = [10, 25, 50] as const;

export class CardLinkError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const TRY_AGAIN = "Something went wrong. Please try again in a minute.";
async function call<T>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(`programs/${path}`, {
    method,
    ...(body ? { body } : {}),
  });
  if (error) {
    const j = (await (error as { context?: Response }).context?.json?.().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    throw new CardLinkError(j?.error ?? "failed", j?.message ?? TRY_AGAIN);
  }
  return data as T;
}
export const loadCardLinks = () => call<CardLinks>("partner/cards", "GET");
export const mintCardLinks = (count: number) =>
  call<{ ok: true; codes: string[] }>("partner/cards/mint", "POST", { count });
export const setCardBusiness = (codes: string[], placeId: string) =>
  call<{ ok: true; count: number }>("partner/cards/place", "POST", { codes, place_id: placeId });

/** One file of the links, one per line, for the card writer. */
export const linksText = (cards: CardLink[]) => cards.map((c) => cardLinkUrl(c.code)).join("\n");

export const CARD_COPY = {
  title: "Card links",
  lead: "Make Kabsi card links for the review cards you sell. Write one link on each card. A tap goes straight to the business's Google review form: no page in between, no rating question.",
  count: (used: number, limit: number) =>
    `You have made ${used} of ${limit} card links. Kabsi sells no cards.`,
  make: (n: number) => `Make ${n}`,
  makeTitle: "Make card links",
  notActive: "Card links open once your partner account is active.",
  none: "No card links yet. Make a batch, then set the business for each card.",
  copyAll: "Copy all links",
  copied: "Links copied",
  select: (code: string) => `Choose card ${code}`,
  setTitle: "Set the business",
  setHint: "Choose the cards above, then find the business on Google.",
  searchLabel: "Find the business on Google",
  searchPlaceholder: "Business name and city",
  setButton: (n: number) => (n === 1 ? "Set it for 1 card" : `Set it for ${n} cards`),
  setDone: (n: number) =>
    n === 1
      ? "1 card now opens this business's review form."
      : `${n} cards now open this business's review form.`,
  change: "Change business",
  test: "Open the review form",
  taps: (n: number) => (n === 1 ? "1 tap" : `${n} taps`),
  tapNote:
    "A tap is not a review. Taps show here until the owner claims the card; then they are the business's.",
  state: {
    new: "No business yet",
    set: "Business set",
    claimed: "Claimed by the owner",
    off: "Switched off",
  } as Record<CardLinkState, string>,
  claimLine:
    'When the owner sends "Link card" and the code to Kabsi on WhatsApp, the card joins their account with a 30 day free trial through your link.',
  rule: "Give every customer the same card. Never pay for or reward reviews, and never ask only happy customers.",
} as const;

// review-cards: the print-ready counter card (A6) and table tent (A4) as PDF, for the signed-in owner, manager or staff of a
// business, on both plans. POST { code, kind } with the member's token, answers a PDF or { error, message }. Every check is
// here, in order, so a test drives it with stubs: signed in, a rate limit, an active review link of the caller's business.
// Nothing is stored and no model is called. The card carries the business's own link and name, never a customer's.
import { buildCard, type CardKind } from "./pdf.ts";

export type CardLink = { location_id: string; business: string };
export type CardsDeps = {
  getUser: (req: Request) => Promise<{ id: string } | null>;
  /** The active review link with this code and the business it belongs to; null when there is none. */
  loadLink: (code: string) => Promise<CardLink | null>;
  memberOf: (locationId: string, userId: string) => Promise<boolean>;
  rateLimit: (key: string, max: number, seconds: number) => Promise<boolean>;
  log: (fields: Record<string, unknown>) => void;
  captureError: (e: unknown) => Promise<void>;
  cors: Record<string, string>;
};

const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;
const KINDS: Record<string, CardKind> = { counter: "counter", tent: "tent" };
export const FILENAME: Record<CardKind, string> = { counter: "kabsi-counter-card.pdf", tent: "kabsi-table-card.pdf" };

export function makeHandler(d: CardsDeps) {
  const err = (status: number, error: string, message: string) =>
    new Response(JSON.stringify({ error, message }), { status, headers: { "content-type": "application/json", ...d.cors } });

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: d.cors });
    if (req.method !== "POST") return err(405, "method_not_allowed", "Use POST.");
    const user = await d.getUser(req);
    if (!user) return err(401, "sign_in_required", "Sign in to print a card.");
    const body = (await req.json().catch(() => ({}))) as { code?: string; kind?: string };
    const code = String(body.code ?? "").toUpperCase();
    const kind = KINDS[String(body.kind ?? "")];
    if (!CODE_RE.test(code) || !kind) return err(400, "bad_request", "Choose a review link and a card.");
    if (!(await d.rateLimit(`review-cards:${user.id}`, 30, 3600))) return err(429, "rate_limited", "That is a lot of cards. Try again in a little while.");
    const link = await d.loadLink(code);
    // A link that is not the caller's looks the same as one that does not exist.
    if (!link || !(await d.memberOf(link.location_id, user.id))) return err(404, "not_found", "That review link was not found.");
    try {
      const pdf = buildCard({ kind, businessName: link.business, code });
      d.log({ ok: true, kind });
      return new Response(pdf, {
        headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${FILENAME[kind]}"`, "cache-control": "private, no-store", ...d.cors },
      });
    } catch (e) {
      await d.captureError(e);
      return err(500, "card_failed", "The card did not come out. Try again.");
    }
  };
}

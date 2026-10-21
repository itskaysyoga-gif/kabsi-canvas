// review-graphic: the request logic (P0.8-07, K-134, K-126 Pro). POST { review_id, size } with the signed-in owner's or
// manager's token, answers a PNG or { error, message }. Every check is here, in order, so a test can drive it with stubs:
//   1. signed in, 2. owner or manager of the review's business, 3. Pro (public.feature_access, asked here again: hiding
//   the button in the app is not the lock), 4. a 4 or 5 star review with words in a script the fonts cover.
// The image is made from the stored review and returned. Nothing is stored and no model is called. Review text never
// goes to logs or error reports (kabsi.ts scrubs `comment` and `text`; this file does not log them either).
import { graphicText, REFUSAL } from "./text.ts";
import type { GraphicInput, GraphicSize } from "./render.ts";

export type ReviewForGraphic = {
  location_id: string;
  location_name: string;
  star_rating: number;
  comment: string | null;
  reviewer_name: string | null;
};

export type Deps = {
  getUser: (req: Request) => Promise<{ id: string } | null>;
  loadReview: (id: string) => Promise<ReviewForGraphic | null>;
  memberRole: (locationId: string, userId: string) => Promise<string | null>;
  featureAccess: (locationId: string) => Promise<{ pro: boolean } | null>;
  rateLimit: (key: string, max: number, seconds: number) => Promise<boolean>;
  render: (input: GraphicInput, size: GraphicSize) => Promise<Uint8Array>;
  log: (fields: Record<string, unknown>) => void;
  captureError: (e: unknown) => Promise<void>;
  cors: Record<string, string>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function makeHandler(d: Deps) {
  const err = (status: number, error: string, message: string) =>
    new Response(JSON.stringify({ error, message }), { status, headers: { "content-type": "application/json", ...d.cors } });

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: d.cors });
    if (req.method !== "POST") return err(405, "method_not_allowed", "Use POST.");

    const user = await d.getUser(req);
    if (!user) return err(401, "sign_in_required", "Sign in to make a graphic.");

    const body = (await req.json().catch(() => ({}))) as { review_id?: string; size?: string };
    const size: GraphicSize | null = body.size === "square" || body.size === "story" ? body.size : null;
    if (!size || !body.review_id || !UUID_RE.test(body.review_id)) return err(400, "bad_request", "Choose a review and a size.");

    if (!(await d.rateLimit(`review-graphic:${user.id}`, 40, 3600))) return err(429, "rate_limited", "That is a lot of graphics. Try again in a little while.");

    const review = await d.loadReview(body.review_id);
    const role = review ? await d.memberRole(review.location_id, user.id) : null;
    // A review that is not the caller's looks the same as one that does not exist.
    if (!review || (role !== "owner" && role !== "manager")) return err(404, "not_found", "That review was not found.");

    const access = await d.featureAccess(review.location_id);
    if (!access?.pro) return err(403, "pro_required", "Review graphics are part of Pro.");

    const text = graphicText(review);
    if (!text.ok) return err(422, text.reason, REFUSAL[text.reason]);

    try {
      const png = await d.render(
        { rating: review.star_rating === 4 ? 4 : 5, text: text.text, name: text.name, business: review.location_name },
        size,
      );
      d.log({ ok: true, size });
      return new Response(png as unknown as BodyInit, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "cache-control": "no-store",
          "content-disposition": `inline; filename="review-${size}.png"`,
          ...d.cors,
        },
      });
    } catch (e) {
      await d.captureError(e);
      return err(500, "render_failed", "The graphic could not be made. Try again.");
    }
  };
}

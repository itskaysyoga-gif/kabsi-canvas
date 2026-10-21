// insights: the request logic (P0.5-05, K-26, K-138). POST { location_id } with the signed-in owner's or manager's
// token. Answers this month's figures against last month's, the daily figures for the charts and, on Pro, the search
// terms of the last full month. Every check is here, in order, so a test can drive it with stubs:
//   1. signed in, 2. owner or manager of the business, 3. the figures (Google's, or labelled examples while Google is
//   in mock mode), 4. Pro for the search terms (public.feature_access, asked here again: hiding the block in the app
//   is not the lock).
// Google's figures are read when the screen opens and are never stored (K-26, K-40 `google_performance`): this
// handler has no write dependency at all. Search terms are not logged.
import { insightPeriods, termsMonth, type Day } from "./periods.ts";
import { ALL_METRICS, type DailySeries, summarise } from "./summary.ts";
import { normaliseTerms, type RawTerm, type Term } from "./terms.ts";
import { EXAMPLE_TERMS, exampleSeries } from "./example.ts";

export type Deps = {
  getUser: (req: Request) => Promise<{ id: string } | null>;
  memberRole: (locationId: string, userId: string) => Promise<string | null>;
  /** "mock" while Google is in mock mode or the business is a demo; "none" for a business with no Google location. */
  source: (locationId: string) => Promise<"live" | "mock" | "none">;
  featureAccess: (locationId: string) => Promise<{ pro: boolean } | null>;
  loadDaily: (locationId: string, metrics: string[], start: Day, end: Day) => Promise<DailySeries>;
  loadTerms: (locationId: string, month: { year: number; month: number }) => Promise<RawTerm[]>;
  rateLimit: (key: string, max: number, seconds: number) => Promise<boolean>;
  now: () => Date;
  log: (fields: Record<string, unknown>) => void;
  captureError: (e: unknown) => Promise<void>;
  cors: Record<string, string>;
};

export type InsightsAnswer = {
  available: boolean;
  example: boolean;
  summary: ReturnType<typeof summarise> | null;
  pro: boolean;
  terms: { month_label: string; items: Term[] } | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function makeHandler(d: Deps) {
  const send = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...d.cors } });
  const err = (status: number, error: string, message: string) => send(status, { error, message });

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: d.cors });
    if (req.method !== "POST") return err(405, "method_not_allowed", "Use POST.");

    const user = await d.getUser(req);
    if (!user) return err(401, "sign_in_required", "Sign in to see your Insights.");

    const body = (await req.json().catch(() => ({}))) as { location_id?: string };
    if (!body.location_id || !UUID_RE.test(body.location_id)) return err(400, "bad_request", "Choose a business.");

    if (!(await d.rateLimit(`insights:${user.id}`, 60, 3600))) return err(429, "rate_limited", "That is a lot of refreshes. Try again in a little while.");

    // A business that is not the caller's looks the same as one that does not exist.
    const role = await d.memberRole(body.location_id, user.id);
    if (role !== "owner" && role !== "manager") return err(404, "not_found", "That business was not found.");

    const source = await d.source(body.location_id);
    if (source === "none") {
      const none: InsightsAnswer = { available: false, example: false, summary: null, pro: false, terms: null };
      return send(200, none);
    }

    const access = await d.featureAccess(body.location_id);
    const pro = !!access?.pro;
    const now = d.now();
    const periods = insightPeriods(now);
    const month = termsMonth(now);

    try {
      let series: DailySeries;
      let rawTerms: RawTerm[] = [];
      if (source === "mock") {
        series = exampleSeries(periods);
        rawTerms = pro ? EXAMPLE_TERMS : [];
      } else {
        // One call covers both periods: they are the two latest months, back to back.
        series = await d.loadDaily(body.location_id, ALL_METRICS, periods.previous.start, periods.current.end);
        rawTerms = pro ? await d.loadTerms(body.location_id, month) : [];
      }
      const answer: InsightsAnswer = {
        available: true,
        example: source === "mock",
        summary: summarise(series, periods),
        pro,
        terms: pro ? { month_label: month.label, items: normaliseTerms(rawTerms) } : null,
      };
      d.log({ ok: true, source, pro });
      return send(200, answer);
    } catch (e) {
      await d.captureError(e);
      return err(502, "google_unavailable", "Google's figures could not be read just now. Try again in a little while.");
    }
  };
}

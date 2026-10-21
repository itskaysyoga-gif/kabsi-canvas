// Insights (P0.5-05, K-26, K-138): this month's Google figures against last month's and, on Pro, the search terms of
// the last full month. The insights Edge Function reads them from Google when the screen opens and stores nothing;
// the browser keeps them in memory only. While Google is in mock mode the answer says `example` and every figure is
// labelled Example on screen.
import { anonHeaders, supabase, supabaseUrl } from "@/lib/supabase";

export type TileKey = "calls" | "website_clicks" | "directions" | "views" | "bookings" | "messages";
export type InsightTile = {
  key: TileKey;
  label: string;
  this: number;
  last: number;
  change: string;
};
export type DailyPoint = {
  date: string;
  calls: number;
  website_clicks: number;
  directions: number;
  views: number;
};
export type SearchTerm = { term: string; count: number | null; fewer_than: number | null };
export type InsightsAnswer = {
  available: boolean;
  example: boolean;
  pro: boolean;
  summary: {
    headline: string;
    interactions: { this: number; last: number };
    tiles: InsightTile[];
    daily: DailyPoint[];
    periods: { kind: "month_so_far" | "last_month"; this_label: string; last_label: string };
  } | null;
  terms: { month_label: string; items: SearchTerm[] } | null;
};

export class InsightsError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function loadInsights(locationId: string): Promise<InsightsAnswer> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new InsightsError("sign_in_required", "Sign in to see your Insights.");
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/insights`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...anonHeaders,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ location_id: locationId }),
    });
  } catch {
    throw new InsightsError(
      "network",
      "We could not reach Kabsi. Check your connection and try again.",
    );
  }
  const j = (await res.json().catch(() => ({}))) as InsightsAnswer & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new InsightsError(j.error ?? "failed", j.message || "Your figures could not be read.");
  }
  return j;
}

/** How a search term's count reads: a number, or "fewer than 15" when Google only gives a threshold (K-26). */
export const termCountText = (t: SearchTerm) =>
  t.count !== null ? String(t.count) : `fewer than ${t.fewer_than}`;

/** "12% more" becomes "12% more than last month"; no comparison gives nothing to say. */
export const compareText = (change: string, against: string) =>
  !change ? "" : change === "no change" ? `no change from ${against}` : `${change} than ${against}`;

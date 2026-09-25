import { admin } from "./kabsi.ts";

// Google Business Profile access as hello@kabsi.co (one central Manager account, SPEC D203).
// GOOGLE_MODE=mock (default until the GBP API grant) simulates Google so every flow is testable.
// GOOGLE_MODE=live uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN.
// Live mode is written against the documented APIs but is unverified until access is granted.

export const googleMode = () => (Deno.env.get("GOOGLE_MODE") === "live" ? "live" : "mock");

let cached: { token: string; exp: number } | null = null;
async function accessToken() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "",
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`google token ${res.status}: ${data.error ?? ""}`);
  cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

async function g(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`google ${res.status} ${url.split("?")[0]}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

const AM = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BI = "https://mybusinessbusinessinformation.googleapis.com/v1";

export type ManagedLocation = { accountId: string; locationId: string; placeId: string | null; title: string };

// Accept every pending LOCATION invitation sent to hello@kabsi.co, then list every location we manage.
export async function acceptInvitationsAndListLocations(): Promise<{ accepted: number; locations: ManagedLocation[] }> {
  const { accounts = [] } = await g(`${AM}/accounts`);
  let accepted = 0;
  for (const acct of accounts) {
    const { invitations = [] } = await g(`${AM}/${acct.name}/invitations`);
    for (const inv of invitations) {
      if (inv.targetType && inv.targetType !== "LOCATIONS_ONLY" && !inv.targetLocation) continue;
      await g(`${AM}/${inv.name}:accept`, { method: "POST", body: "{}" });
      accepted++;
    }
  }
  const { accounts: after = [] } = await g(`${AM}/accounts`);
  const locations: ManagedLocation[] = [];
  for (const acct of after) {
    let pageToken = "";
    do {
      const data = await g(`${BI}/${acct.name}/locations?readMask=name,title,metadata&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
      for (const loc of data.locations ?? []) {
        locations.push({ accountId: acct.name, locationId: loc.name, placeId: loc.metadata?.placeId ?? null, title: loc.title ?? "" });
      }
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
  }
  return { accepted, locations };
}

// ─── Reviews (mock reads/writes public.mock_google_reviews; live uses the v4 reviews API)

export type GoogleReview = {
  reviewId: string; reviewer: string; rating: number; comment: string | null;
  createTime: string; updateTime: string | null; reply: string | null;
};
const RATING: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const V4 = "https://mybusiness.googleapis.com/v4";

export async function listReviews(accountId: string, locationId: string, max = 50): Promise<GoogleReview[]> {
  if (googleMode() === "mock") {
    const { data, error } = await admin().from("mock_google_reviews").select("*")
      .eq("google_location_id", locationId).order("create_time", { ascending: false }).limit(max);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      reviewId: r.review_id, reviewer: r.reviewer_name, rating: r.star_rating, comment: r.comment,
      createTime: r.create_time, updateTime: r.reply_update_time, reply: r.reply_comment,
    }));
  }
  const out: GoogleReview[] = [];
  let pageToken = "";
  do {
    const data = await g(`${V4}/${accountId}/${locationId}/reviews?pageSize=50&orderBy=updateTime%20desc${pageToken ? `&pageToken=${pageToken}` : ""}`);
    for (const r of data.reviews ?? []) {
      out.push({
        reviewId: r.reviewId ?? String(r.name).split("/").pop(), reviewer: r.reviewer?.displayName ?? "A customer",
        rating: RATING[r.starRating] ?? 0, comment: r.comment ?? null, createTime: r.createTime,
        updateTime: r.updateTime ?? null, reply: r.reviewReply?.comment ?? null,
      });
    }
    pageToken = out.length < max ? (data.nextPageToken ?? "") : "";
  } while (pageToken);
  return out;
}

// Writes the exact approved text, then reads it back. Only ever called by publish() after approval (D202).
export async function putReply(accountId: string, locationId: string, reviewId: string, text: string) {
  if (googleMode() === "mock") {
    const { error } = await admin().from("mock_google_reviews")
      .update({ reply_comment: text, reply_update_time: new Date().toISOString() }).eq("review_id", reviewId);
    if (error) throw error;
    return { state: "live" as const, response: { mock: true } };
  }
  const name = `${accountId}/${locationId}/reviews/${reviewId}`;
  const put = await g(`${V4}/${name}/reply`, { method: "PUT", body: JSON.stringify({ comment: text }) });
  // Read back: Google may hold a reply for moderation or reject it.
  const back = await g(`${V4}/${name}`);
  const state = back.reviewReply?.comment === text ? "live" as const : "in_review" as const;
  return { state, response: { put, reply: back.reviewReply ?? null } };
}

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

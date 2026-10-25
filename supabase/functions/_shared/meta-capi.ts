// Meta Conversions API (master plan 20.4, docs/EVENTS.md). Three server events, each sent once from a meta_capi job that
// private.product_event offers (supabase/migrations/20261025210000_growth_events.sql):
//   signup_completed -> CompleteRegistration, trial_started -> StartTrial, paid -> Subscribe.
// The event_id is the product_events row id, so Meta drops a browser event with the same id.
// Email and phone are normalised and hashed with SHA-256 as Meta requires; nothing readable about the person leaves.
// Conversions API for Business Messaging: when the owner's chat came from a Click to WhatsApp ad (ctwa_clid on the
// conversation, 20.3), the event goes as business_messaging on WhatsApp with that click id, so the ads learn from paying
// owners. Consent: sent only when the person allowed ad measurement (their latest privacy choice, or the browser's
// allowance when the account was saved). Mock: without META_PIXEL_ID and META_CAPI_TOKEN nothing is sent and the job
// ends as skipped.
import { admin, log, sha256Hex } from "./kabsi.ts";

export const META_EVENT: Record<string, string> = {
  signup_completed: "CompleteRegistration",
  trial_started: "StartTrial",
  paid: "Subscribe",
};

const GRAPH = "https://graph.facebook.com/v21.0";

export function normEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}
// Digits only, with the country code, no leading zeros or plus (Meta's rule).
export function normPhone(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^0+/, "");
  return d.length >= 8 && d.length <= 15 ? d : null;
}

export type CapiInput = {
  eventId: string;
  event: string;
  at: string;
  userId: string;
  email: string | null;
  phone: string | null;
  fbc: string | null;
  fbp: string | null;
  ctwaClid: string | null;
  wabaId: string | null;
  plan: string | null;
};

// The one event Meta receives. Pure (apart from hashing), so a test can read it.
export async function capiEvent(i: CapiInput): Promise<Record<string, unknown> | null> {
  const name = META_EVENT[i.event];
  if (!name) return null;
  const email = normEmail(i.email);
  const phone = normPhone(i.phone);
  const user: Record<string, unknown> = { external_id: [await sha256Hex(i.userId)] };
  if (email) user.em = [await sha256Hex(email)];
  if (phone) user.ph = [await sha256Hex(phone)];
  const messaging = Boolean(i.ctwaClid && i.wabaId);
  if (messaging) {
    user.ctwa_clid = i.ctwaClid;
    user.whatsapp_business_account_id = i.wabaId;
  } else {
    if (i.fbc) user.fbc = i.fbc;
    if (i.fbp) user.fbp = i.fbp;
  }
  const out: Record<string, unknown> = {
    event_name: name,
    event_time: Math.floor(Date.parse(i.at) / 1000),
    event_id: i.eventId,
    action_source: messaging ? "business_messaging" : "website",
    user_data: user,
    custom_data: { currency: "USD", ...(i.plan ? { content_name: i.plan } : {}) },
  };
  if (messaging) out.messaging_channel = "whatsapp";
  else out.event_source_url = "https://kabsi.co/";
  return out;
}

// Ad measurement allowed for this person: their latest privacy choice wins; without one, what the browser allowed when
// the account was saved (signup_attribution.ads_ok). No record at all means no.
export function adsAllowed(latestChoice: boolean | null, adsOk: boolean | null): boolean {
  if (latestChoice !== null) return latestChoice;
  return adsOk === true;
}

export type CapiResult = "sent" | "skipped_mock" | "skipped_no_consent" | "skipped_not_listed";

export async function sendCapi(
  eventId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CapiResult> {
  const db = admin();
  const { data: row, error } = await db
    .from("product_events")
    .select("id, event, distinct_id, created_at, properties")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!row || !META_EVENT[row.event as string]) return "skipped_not_listed";
  const pixel = Deno.env.get("META_PIXEL_ID") ?? "";
  const token = Deno.env.get("META_CAPI_TOKEN") ?? "";
  if (!pixel || !token) {
    log("meta_capi", { ok: true, mock: true, event: row.event });
    return "skipped_mock";
  }
  const userId = row.distinct_id as string;
  const [{ data: attr }, { data: choice }, { data: u }, { data: role }] = await Promise.all([
    db.from("signup_attribution").select("fbc, fbp, ads_ok").eq("user_id", userId).maybeSingle(),
    db
      .from("consent_records")
      .select("advertising")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.auth.admin.getUserById(userId),
    db
      .from("phone_roles")
      .select("phone")
      .eq("user_id", userId)
      .in("role", ["owner", "manager"])
      .is("revoked_at", null)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);
  if (
    !adsAllowed(
      typeof choice?.advertising === "boolean" ? choice.advertising : null,
      attr?.ads_ok ?? null,
    )
  ) {
    log("meta_capi", { ok: true, skipped: "no_consent", event: row.event });
    return "skipped_no_consent";
  }
  const phone = (role?.phone as string | undefined) ?? null;
  let ctwa: string | null = null;
  if (phone) {
    const { data: conv } = await db
      .from("whatsapp_conversations")
      .select("referral_last")
      .eq("phone", phone)
      .maybeSingle();
    const r = conv?.referral_last as Record<string, unknown> | null;
    ctwa = typeof r?.ctwa_clid === "string" ? r.ctwa_clid : null;
  }
  const event = await capiEvent({
    eventId: row.id as string,
    event: row.event as string,
    at: row.created_at as string,
    userId,
    email: u?.user?.email ?? null,
    phone,
    fbc: attr?.fbc ?? null,
    fbp: attr?.fbp ?? null,
    ctwaClid: ctwa,
    wabaId: Deno.env.get("META_WABA_ID") ?? null,
    plan: (((row.properties ?? {}) as Record<string, unknown>).plan as string) ?? null,
  });
  const res = await fetchImpl(`${GRAPH}/${encodeURIComponent(pixel)}/events`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: [event] }),
  });
  if (!res.ok) throw new Error(`meta_capi ${res.status}: ${(await res.text()).slice(0, 200)}`);
  log("meta_capi", { ok: true, event: row.event, messaging: Boolean(ctwa) });
  return "sent";
}

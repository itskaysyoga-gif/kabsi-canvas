// The WhatsApp owner channel in the app (P0.8-03, K-129): Connect WhatsApp, the status and the two choices. The opt-in
// happens when the owner sends the one-time code from their phone; the wording below is what they saw, and the server
// stores it with the time (supabase/functions/_shared/whatsapp/, whatsapp_connect_start). While Kabsi has no WhatsApp
// number (WHATSAPP_ON false) Settings shows "coming soon" and none of this is called.
import { supabase } from "@/lib/supabase";
import { WHATSAPP_DIGITS } from "@/lib/site";

/** Shown next to Connect WhatsApp and stored as the proof of the opt-in (K-113 as amended, K-129 point 1). */
export const WHATSAPP_CONSENT_TEXT =
  "Kabsi will send WhatsApp messages to the phone you connect: an alert for each new review of your business with " +
  "the business name, the star rating, the reviewer's first name, the review text up to 300 characters and the " +
  "draft reply, with a button to approve low and medium risk replies and posts. Meta (WhatsApp) and Kapso carry " +
  "these messages. Changes to your business name, address, categories, map pin, phone or opening status are never " +
  "approved on WhatsApp. Reply STOP at any time to stop.";

export type WhatsappStatus = {
  state: "none" | "pending" | "active" | "stopped";
  phone_last4?: string | null;
  review_alerts?: boolean;
  digest_optin?: boolean;
};

export async function whatsappStatus(): Promise<WhatsappStatus> {
  const { data, error } = await supabase.rpc("whatsapp_status");
  if (error) throw error;
  return data as WhatsappStatus;
}

/** The wa.me link that opens a chat with Kabsi's number with the code already typed. */
export function connectHref(code: string, digits: string = WHATSAPP_DIGITS): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(`KABSI ${code}`)}`;
}

export async function whatsappConnect(): Promise<{ code: string; href: string }> {
  const { data, error } = await supabase.rpc("whatsapp_connect_start", {
    p_consent_text: WHATSAPP_CONSENT_TEXT,
  });
  if (error) throw error;
  const code = String((data as { code: string }).code);
  return { code, href: connectHref(code) };
}

export async function whatsappPrefs(
  reviewAlerts: boolean | null,
  digest: boolean | null,
): Promise<WhatsappStatus> {
  const { data, error } = await supabase.rpc("whatsapp_set_prefs", {
    p_review_alerts: reviewAlerts,
    p_digest: digest,
  });
  if (error) throw error;
  return data as WhatsappStatus;
}

export async function whatsappDisconnect(): Promise<WhatsappStatus> {
  const { data, error } = await supabase.rpc("whatsapp_disconnect");
  if (error) throw error;
  return data as WhatsappStatus;
}

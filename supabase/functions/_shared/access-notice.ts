// Kabsi's own notice of every change to its Google access (master plan 30.10 point 5; Business Profile APIs policies:
// "provide notice to the end-client of the change within 48 hours after the change is made"). The email goes at once
// (disconnect.ts accessChangeEmail, email/copy.ts accessLost); this adds the same notice on WhatsApp to the owners who
// connected WhatsApp, and the line Google's third-party policies ask for. A WhatsApp send never fails the email or the job.
import { ref } from "./whatsapp/templates.ts";

export const FREE_FROM_GOOGLE = "Google Business Profile is free from Google. Kabsi is an independent paid service.";
export const THIRD_PARTY_HELP = "https://support.google.com/business/answer/7163406";

export type AccessNotice = { change: "granted" | "removing" | "removed" | "lost"; business: string };

/** The WhatsApp text: what changed, what it means, and how to undo it. Plain, one message, no buttons. */
export function accessWhatsappBody(n: AccessNotice, appUrl: string): string {
  const lines: Record<AccessNotice["change"], string[]> = {
    granted: [
      `${n.business}: Kabsi is now a Manager of your Google profile. You stay the owner.`,
      "Kabsi reads your reviews and profile, and publishes only what you approve.",
      `To remove Kabsi: Settings, then Disconnect Kabsi from Google. ${appUrl}/app/settings`,
      `${FREE_FROM_GOOGLE} Google's guide: ${THIRD_PARTY_HELP}`,
    ],
    removing: [
      `${n.business}: Kabsi has stopped and is removing its Manager access to your Google profile.`,
      "Nothing more is sent to Google. Our team finishes the removal and tells you when it is done.",
    ],
    removed: [
      `${n.business}: Kabsi no longer has Manager access to your Google profile. You stay the owner.`,
      "The Google data Kabsi kept for you is deleted within 7 days.",
    ],
    lost: [
      `${n.business}: Kabsi can no longer reach your Google profile. The Kabsi group was probably removed as a Manager.`,
      `Nothing is drafted or posted until you invite it again. ${appUrl}/app/settings`,
    ],
  };
  return lines[n.change].join("\n\n");
}

export type AccessNoticeDeps = {
  owners: (locationId: string) => Promise<string[]>;
  send: (userId: string, locationId: string, kind: string, dedupe: string, body: string) => Promise<string>;
};

/** One WhatsApp notice to each owner who opted in. Returns what happened per person; never throws. */
export async function sendAccessWhatsapp(locationId: string, n: AccessNotice, dedupe: string, appUrl: string, d: AccessNoticeDeps) {
  const out: Record<string, string> = {};
  try {
    for (const userId of await d.owners(locationId)) {
      out[userId] = await d.send(userId, locationId, "access_change", `${dedupe}:${userId}`, accessWhatsappBody(n, appUrl)).catch((e) => `failed: ${String(e).slice(0, 100)}`);
    }
  } catch (e) {
    out.error = String(e).slice(0, 200);
  }
  return out;
}

/** The live deps: owners of the business who opted in to WhatsApp, sent through the owner channel's rules. Loaded on
 *  first use so the rules above can be tested without the function's secrets. */
// The access template (named params, as 13b part 1's templates are), used outside the 24-hour window.
const accessTemplate = (business: string) => ref("access_change", { business });

export async function liveAccessWhatsapp(locationId: string, n: AccessNotice, dedupe: string) {
  const { WHATSAPP_ON } = await import("./whatsapp-setting.ts");
  if (!WHATSAPP_ON) return {};
  const { admin, APP_URL } = await import("./kabsi.ts");
  const { whatsappCtx } = await import("./whatsapp/db.ts");
  const { deliver } = await import("./whatsapp/deliver.ts");
  const ctx = await whatsappCtx();
  return sendAccessWhatsapp(locationId, n, dedupe, APP_URL, {
    // Owners with an active WhatsApp opt-in, whatever their alert choices: this notice is owed, not an alert.
    async owners(id) {
      const { data, error } = await admin().from("location_members").select("user_id").eq("location_id", id).eq("role", "owner");
      if (error) throw error;
      const ids = ((data ?? []) as { user_id: string }[]).map((m) => m.user_id);
      if (!ids.length) return [];
      const { data: o, error: oe } = await admin().from("whatsapp_optins").select("user_id").in("user_id", ids).eq("state", "active");
      if (oe) throw oe;
      return ((o ?? []) as { user_id: string }[]).map((r) => r.user_id);
    },
    send: (userId, id, kind, key, body) => deliver(ctx, { userId, locationId: id, kind, dedupe: key, body,
      template: accessTemplate(n.business) }),
  });
}

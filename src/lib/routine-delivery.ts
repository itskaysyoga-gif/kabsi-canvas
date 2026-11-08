// App 6 (master plan 30.34 item 5): what Settings shows for "Where your routine messages go", as plain functions so the
// rules are tested without a screen. The words are COPY.md 60. No Supabase call is made here.
import type { Pref, RoutineChannel } from "@/lib/notifications";
import type { WhatsappStatus } from "@/lib/whatsapp-owner";

/** Why WhatsApp cannot be chosen, and the one thing that fixes it. Null when it can be chosen. */
export type WhatsappBlock = { line: string; fix: "connect" | null };

export type DeliveryInput = {
  /** Kabsi's WhatsApp number is set in the one setting (WHATSAPP_ON). */
  whatsappOn: boolean;
  /** Launch 1: WhatsApp is switched on for owners (whatsapp_owners_on); undefined while unread or when the read fails. */
  ownersOn?: boolean | undefined;
  /** The person's WhatsApp opt-in, once read. */
  status: WhatsappStatus | undefined;
  /** The read of the opt-in failed. */
  statusFailed: boolean;
  /** The stored choice; null until the person has chosen once. */
  stored: RoutineChannel | null | undefined;
  prefs: Pref[];
};

const freq = (prefs: Pref[], category: string) =>
  prefs.find((p) => p.category === category && p.channel === "email")?.frequency ?? "default";

/** The reason WhatsApp cannot be chosen right now, in one line, or null when it can. */
export function whatsappBlock(
  i: Pick<DeliveryInput, "whatsappOn" | "ownersOn" | "status" | "statusFailed">,
): WhatsappBlock | null {
  if (!i.whatsappOn)
    return {
      line: "WhatsApp is not open yet. Your reports and reminders come by email.",
      fix: null,
    };
  // Launch 1: Kabsi's number exists but WhatsApp is switched off for owners, so nothing would arrive there.
  if (i.ownersOn === false)
    return {
      line: "WhatsApp messages from Kabsi are paused for now. Your reports and reminders come by email.",
      fix: null,
    };
  if (i.statusFailed)
    return { line: "We could not check your WhatsApp. Refresh the page and try again.", fix: null };
  const state = i.status?.state;
  if (state === "active") return null;
  if (state === "stopped")
    return {
      line: "WhatsApp is stopped. Connect it again below, then choose it here.",
      fix: "connect",
    };
  if (state === "none" || state === "pending")
    return {
      line: "WhatsApp is not connected yet. Connect it below, then choose it here.",
      fix: "connect",
    };
  return null;
}

/**
 * What the control shows as chosen. The stored choice wins; WhatsApp reads as Email while it cannot carry anything (the
 * engine does the same, routine_channel_of). Before a stored choice, an owner whose two routine emails were switched off
 * for WhatsApp by the earlier switch reads WhatsApp.
 */
export function chosenChannel(i: DeliveryInput): RoutineChannel {
  const blocked = whatsappBlock(i) !== null;
  const s = i.status;
  const legacy =
    s?.state === "active" &&
    s.review_alerts !== false &&
    s.digest_optin === true &&
    freq(i.prefs, "review_new") === "off" &&
    freq(i.prefs, "weekly_report") === "off";
  const v: RoutineChannel = i.stored ?? (legacy ? "whatsapp" : "email");
  return v === "whatsapp" && blocked ? "email" : v;
}

/** The Reports page lead (Fixes B, DSH-02): it says where the Monday report really goes, by the owner's choice. */
export function reportsLead(channel: RoutineChannel): string {
  return channel === "whatsapp"
    ? "Every Monday on WhatsApp. The last 12 weeks are here."
    : "Every Monday by email. The last 12 weeks are here. You can switch to WhatsApp in Settings.";
}

/** One stored choice changed in a copy of the list (what the page shows at once, before the save answers). */
export function withPref(prefs: Pref[], next: Pref): Pref[] {
  const rest = prefs.filter((p) => !(p.category === next.category && p.channel === next.channel));
  return [...rest, next];
}

/** The two routine emails go back to their default when the person returns to Email. */
export function backOnEmail(prefs: Pref[]): Pref[] {
  return ["review_new", "weekly_report"].reduce(
    (acc, category) => withPref(acc, { category, channel: "email", frequency: "default" }),
    prefs,
  );
}

const NAME: Record<RoutineChannel, string> = { whatsapp: "WhatsApp", email: "email" };

/** The line when a save failed and the page went back: names what is still true. */
export function deliveryFailedLine(was: RoutineChannel): string {
  return `Couldn't save that. Your messages still go by ${NAME[was]}. Try again.`;
}

/** The line when a switch or an email timing failed and went back. */
export function choiceFailedLine(): string {
  return "Couldn't save that. It is back as it was. Try again.";
}

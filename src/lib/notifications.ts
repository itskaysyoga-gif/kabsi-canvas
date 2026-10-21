// Notification choices and the bell on Home (K-46, P0.4-09). Read and written only through membership-checked
// functions: my_notification_prefs, set_notification_pref, list_my_notifications, mark_notifications_read. The engine
// that decides when an email goes is on the server (supabase/functions/_shared/notify-engine.ts).
import { supabase } from "@/lib/supabase";
import { CATEGORIES, DEFAULT_LINE, type Category } from "@/lib/notification-categories";

export type Channel = "email" | "in_app";
export type Frequency = "default" | "instant" | "daily_digest" | "off";
export type Pref = { category: string; channel: Channel; frequency: Frequency };

export type BellItem = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
};
export type Bell = { unread: number; items: BellItem[] };

export async function loadBell(locationId: string): Promise<Bell> {
  const { data, error } = await supabase.rpc("list_my_notifications", {
    p_location: locationId,
    p_limit: 30,
  });
  if (error) throw new Error(error.message);
  return data as unknown as Bell;
}

export async function markRead(locationId: string, ids?: string[]) {
  const { error } = await supabase.rpc("mark_notifications_read", {
    p_location: locationId,
    p_ids: ids ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function loadPrefs(locationId: string): Promise<Pref[]> {
  const { data, error } = await supabase.rpc("my_notification_prefs", { p_location: locationId });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Pref[];
}

export async function savePref(
  locationId: string,
  category: string,
  channel: Channel,
  frequency: Frequency,
) {
  const { error } = await supabase.rpc("set_notification_pref", {
    p_location: locationId,
    p_category: category,
    p_channel: channel,
    p_frequency: frequency,
  });
  if (error) throw new Error(error.message);
}

/** What a person has chosen for one category and channel; "default" when they never changed it. */
export function choice(prefs: Pref[], category: string, channel: Channel): Frequency {
  return (
    prefs.find((p) => p.category === category && p.channel === channel)?.frequency ?? "default"
  );
}

/** The email options a category offers: what cannot be switched off has no "Off". */
export function emailOptions(cat: Category): { value: Frequency; label: string }[] {
  const opts: { value: Frequency; label: string }[] = [
    { value: "default", label: `Default: ${DEFAULT_LINE[cat.emailDefault].toLowerCase()}` },
    { value: "instant", label: "At once" },
    { value: "daily_digest", label: "In the daily email" },
  ];
  if (cat.switchable) opts.push({ value: "off", label: "Off" });
  return opts;
}

/** The categories grouped for the Settings screen, in the order of the list. */
export function groupedCategories() {
  const groups: { group: string; items: Category[] }[] = [];
  for (const c of CATEGORIES) {
    const last = groups[groups.length - 1];
    if (last && last.group === c.group) last.items.push(c);
    else groups.push({ group: c.group, items: [c] });
  }
  return groups;
}

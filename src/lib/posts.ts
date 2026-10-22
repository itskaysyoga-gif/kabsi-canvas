// The Posts screen's data (P0.5-02, K-24, K-80). Posts are read through RLS; every change goes through the content
// function (the checks run there) or a membership-checked RPC.
import { supabase } from "@/lib/supabase";
import { contentCall } from "@/lib/reviews";

export type PostType = "STANDARD" | "OFFER" | "EVENT";
export type Post = {
  id: string;
  owner_input: string;
  body: string | null;
  cta_type: string | null;
  cta_url: string | null;
  state: "draft" | "publishing" | "posted" | "skipped" | "failed";
  source: "owner" | "auto";
  topic_type: PostType;
  event_title: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  offer_terms: string | null;
  coupon_code: string | null;
  redeem_url: string | null;
  photo_id: string | null;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
};

export const TYPE_LABEL: Record<PostType, string> = {
  STANDARD: "Update",
  OFFER: "Offer",
  EVENT: "Event",
};
// Buttons Google accepts on a post. "Call" uses the phone number on the profile.
export const CTA_LABEL: Record<string, string> = {
  CALL: "Call now",
  BOOK: "Book",
  ORDER: "Order online",
  SHOP: "Shop",
  LEARN_MORE: "Learn more",
  SIGN_UP: "Sign up",
};
// The month view's four states (K-24).
export const STATE_LABEL: Record<Post["state"], string> = {
  draft: "Prepared",
  publishing: "Waiting",
  posted: "Published",
  skipped: "Skipped",
  failed: "Not published",
};

const COLUMNS =
  "id, owner_input, body, cta_type, cta_url, state, source, topic_type, event_title, start_date, end_date, start_time, end_time, offer_terms, coupon_code, redeem_url, photo_id, publish_at, created_at, updated_at";

export async function loadPosts(locationId: string): Promise<Post[]> {
  const since = new Date(Date.now() - 120 * 86400_000).toISOString();
  const { data, error } = await supabase
    .from("gbp_posts")
    .select(COLUMNS)
    .eq("location_id", locationId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Post[];
}

/** The month a post belongs to (YYYY-MM, the owner's own clock): its publishing time, else when it was made. */
export const monthOf = (p: Pick<Post, "publish_at" | "created_at">) => {
  const d = new Date(p.publish_at ?? p.created_at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const monthName = (month: string) =>
  new Date(`${month}-15T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
export function nextMonths(n: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 15);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export type Settings = { auto_posts: boolean; posts_per_month: 1 | 2 | 4 };
export async function loadSettings(locationId: string): Promise<Settings> {
  const { data, error } = await supabase
    .from("locations")
    .select("auto_posts, posts_per_month")
    .eq("id", locationId)
    .single();
  if (error) throw new Error(error.message);
  return data as Settings;
}
export async function setAutoPosts(locationId: string, on: boolean) {
  const { error } = await supabase.rpc("set_auto_posts", { p_location: locationId, p_enabled: on });
  if (error) throw new Error("Couldn't change the setting. Try again.");
}
export async function setCadence(locationId: string, n: 2 | 4) {
  const { error } = await supabase.rpc("set_post_cadence", {
    p_location: locationId,
    p_per_month: n,
  });
  if (error) throw new Error("Couldn't change the setting. Try again.");
}

/** The photos a post may carry: the business's own checked photos with a 5-minute link to show them. */
export async function postPhotos(locationId: string) {
  const { data, error } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("location_id", locationId)
    .eq("kind", "photo")
    .in("state", ["draft", "publishing", "posted"])
    .is("file_deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; storage_path: string }[];
  if (!rows.length) return [];
  const { data: signed } = await supabase.storage.from("owner-photos").createSignedUrls(
    rows.map((r) => r.storage_path),
    300,
  );
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ id: r.id, url: url.get(r.storage_path) ?? "" }));
}

export type PostInput = {
  type: PostType;
  summary: string;
  cta_type?: string | null;
  cta_url?: string | null;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  terms?: string | null;
  coupon_code?: string | null;
  redeem_url?: string | null;
  photo_id?: string | null;
  publish_at?: string | null;
};
export const savePost = (locationId: string, input: PostInput, postId?: string) =>
  contentCall<{ post: { id: string } }>({
    do: "post_save",
    ...(postId ? { post_id: postId } : { location_id: locationId }),
    ...input,
  });
export const approveMonth = (locationId: string, month: string) =>
  contentCall<{ approved: unknown[]; held: { post_id: string }[] }>({
    do: "posts_approve_month",
    location_id: locationId,
    month,
  });

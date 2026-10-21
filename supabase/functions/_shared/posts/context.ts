// What the post checks need about one business (P0.5-02): the verified facts a post may use, the owner's website,
// the category, area and country, and the posts of the last 90 days. Read with the service client.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { businessFacts, loadCard } from "../facts.ts";
import type { CheckContext } from "./checks.ts";

export async function checkContext(db: SupabaseClient, locationId: string, ownerText = "", exceptPost?: string): Promise<CheckContext> {
  const since = new Date(Date.now() - 90 * 86400_000).toISOString();
  const [{ data: loc }, card, { data: site }, { data: recent }] = await Promise.all([
    db.from("locations").select("category, category_label, area, country").eq("id", locationId).single(),
    loadCard(db, locationId, "posts"),
    db.from("knowledge_facts").select("value").eq("location_id", locationId).eq("slot", "profile.website").is("superseded_by", null).maybeSingle(),
    db.from("gbp_posts").select("id, body").eq("location_id", locationId).neq("state", "skipped").gte("created_at", since).limit(100),
  ]);
  const website = (site?.value as { display?: string } | null)?.display?.trim() || null;
  return {
    allowedText: `${businessFacts(card ?? {}, "post").join("\n")}\n${ownerText}`,
    website,
    category: loc?.category ?? null,
    categoryLabel: loc?.category_label ?? null,
    city: loc?.area ?? null,
    country: loc?.country ?? null,
    recent: (recent ?? []).filter((r) => r.id !== exceptPost && r.body).map((r) => String(r.body)),
  };
}

// Something true to say this month: a verified fact for posts confirmed in the last 90 days, or a photo the owner
// approved in the last 30 days (the newest one goes with the first post).
export async function postMaterial(db: SupabaseClient, locationId: string): Promise<{ recentFacts: boolean; photoId: string | null }> {
  const facts = new Date(Date.now() - 90 * 86400_000).toISOString(), photos = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [{ count }, { data: photo }] = await Promise.all([
    db.from("knowledge_facts").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("status", "verified")
      .is("superseded_by", null).not("slot", "like", "profile.%").contains("uses", ["posts"]).gte("confirmed_at", facts),
    db.from("photos").select("id").eq("location_id", locationId).eq("kind", "photo").in("state", ["posted", "publishing"])
      .gte("updated_at", photos).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { recentFacts: (count ?? 0) > 0, photoId: photo?.id ?? null };
}

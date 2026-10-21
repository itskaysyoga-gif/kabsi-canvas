// coach: the Profile Coach's actions (P0.8-09 part B). The logic and its checks are in _shared/coach/handler.ts; this file
// wires it to the database, the Google layer (the mock until Gate A) and the network for the website check. It makes no
// model call: the description writer waits for AI credit (K-146), so `draft` has no writer.
import { admin, captureError, CORS, currentUser, log, rateLimit } from "../_shared/kabsi.ts";
import { auditedAdmin, auditHeaders } from "../_shared/audit.ts";
import { findCategory } from "../_shared/google/index.ts";
import { makeHandler, type Profile } from "../_shared/coach/handler.ts";
import type { Fact } from "../_shared/coach/description.ts";

type FactRow = { slot: string; key: string; value: { display?: string; raw?: unknown } | null; status: string };

async function loadProfile(locationId: string): Promise<Profile | null> {
  const db = admin();
  const { data: l } = await db.from("locations").select("name, country, status, concierge, google_location_id").eq("id", locationId).maybeSingle();
  if (!l) return null;
  const { data } = await db.from("knowledge_facts").select("slot, key, value, status").eq("location_id", locationId).is("superseded_by", null);
  const rows = (data ?? []) as FactRow[];
  const profile = (key: string) => rows.find((r) => r.slot === `profile.${key}`)?.value ?? null;
  const text = (key: string) => String(profile(key)?.display ?? "");
  const facts: Fact[] = rows
    .filter((r) => r.status === "verified" && !r.slot.startsWith("profile.") && r.value?.display)
    .map((r) => ({ key: r.key, text: String(r.value!.display) }));
  return {
    active: l.status === "active" && !!l.google_location_id,
    concierge: l.concierge === true,
    country: (l.country as string | null) ?? null,
    name: String(l.name ?? ""),
    phone: text("phone"),
    website: text("website"),
    address: { display: text("address"), raw: profile("address")?.raw },
    hours: { display: text("regular_hours"), raw: profile("regular_hours")?.raw },
    category: { display: text("main_category"), raw: profile("main_category")?.raw },
    facts,
  };
}

// A name's addresses over DNS over HTTPS: the Edge runtime has no resolver of its own to rely on.
async function resolveHost(host: string): Promise<string[]> {
  const out: string[] = [];
  for (const type of ["A", "AAAA"]) {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: "application/dns-json" } });
    if (!r.ok) throw new Error(`dns ${r.status}`);
    const j = (await r.json()) as { Answer?: { type: number; data: string }[] };
    for (const a of j.Answer ?? []) if (a.type === 1 || a.type === 28) out.push(a.data);
  }
  return out;
}

Deno.serve((req) =>
  makeHandler({
    getUser: async (r) => {
      const user = await currentUser(r);
      return user ? { id: user.id } : null;
    },
    memberRole: async (locationId, userId) => {
      const { data } = await admin().from("location_members").select("role").eq("location_id", locationId).eq("user_id", userId).maybeSingle();
      return (data?.role as string | undefined) ?? null;
    },
    featureAccess: async (locationId) => {
      const { data, error } = await admin().rpc("feature_access", { p_location: locationId });
      return error ? null : (data as { pro: boolean });
    },
    profile: loadProfile,
    findCategory,
    site: { resolve: resolveHost, fetch: (url, init) => fetch(url, init) },
    saveSite: async (locationId, website, pages, found) => {
      const { error } = await admin().rpc("coach_site_check_put", { p_location: locationId, p_website: website, p_pages: pages, p_found: found });
      if (error) throw new Error(error.message);
    },
    runDetectors: async (locationId) => {
      const { error } = await admin().rpc("run_task_detectors", { p_location: locationId });
      if (error) throw new Error(error.message);
    },
    apply: async (r, locationId, userId, field, display, raw) => {
      const { data, error } = await auditedAdmin(auditHeaders(r, userId)).rpc("apply_profile_field", {
        p_location: locationId, p_user: userId, p_channel: "dashboard", p_field: field, p_display: display, p_raw: raw,
      });
      if (error) throw new Error(error.message);
      return data as { state: string; publication_id?: string; publish_after?: string | null };
    },
    draft: {},
    rateLimit: (key, max, seconds) => rateLimit(key, max, seconds, { failClosed: true }),
    log: (fields) => log("coach", fields),
    captureError: (e) => captureError("coach", e),
    cors: CORS,
  })(req)
);

// The link_watch job (PROOF-2): one business, its website, booking and menu links. The real deps for link-watch.ts: the links
// are read from the Google listing now (never kept), the state is counts and times in public.link_watch, the retry is an
// ordinary job offered for later, and the one task is written by public.link_watch_event. Google in mock mode and demo
// businesses are skipped, so a mock never reaches out to a real website.
import { admin } from "../kabsi.ts";
import { googleMode, listingLinks } from "../google/index.ts";
import { coachTarget } from "../coach/refresh.ts";
import type { Job } from "../jobs.ts";
import {
  extractLinks, incidentTitle, incidentWhy, type LinkKind, type LinkState, type LinkWatchDeps, type LinkWatchResult, watchLinks,
} from "./link-watch.ts";

// A name's addresses over DNS over HTTPS: the Edge runtime has no resolver of its own to rely on (the same as the website check).
// SITE-3: the free check's link look uses it too (profile-snapshot/index.ts).
export async function resolveHost(host: string): Promise<string[]> {
  const out: string[] = [];
  for (const type of ["A", "AAAA"]) {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: "application/dns-json" } });
    if (!r.ok) throw new Error(`dns ${r.status}`);
    const j = (await r.json()) as { Answer?: { type: number; data: string }[] };
    for (const a of j.Answer ?? []) if (a.type === 1 || a.type === 28) out.push(a.data);
  }
  return out;
}

const RECOMMENDATION = "Check where the link points, then fix it there or change the link on your Google profile. Kabsi checks it again every day.";

export async function linkWatchJob(job: Job): Promise<LinkWatchResult | { skipped: string }> {
  const db = admin();
  const locationId = job.location_id;
  if (!locationId) throw new Error("link_watch needs a business");
  const { data: loc, error } = await db.from("locations")
    .select("id, status, google_location_id, concierge, is_demo").eq("id", locationId).maybeSingle();
  if (error) throw error;
  const target = coachTarget(loc);
  if (!loc || loc.status !== "active" || !target) return { skipped: "no_listing" };
  if (target.demo || googleMode() === "mock") return { skipped: "mock" };

  const deps: LinkWatchDeps = {
    links: async () => extractLinks(await listingLinks(target.name)),
    states: async () => {
      const { data, error: e } = await db.from("link_watch").select("kind, failures, alerted, retry_at, first_failed_at").eq("location_id", locationId);
      if (e) throw e;
      const out: Partial<Record<LinkKind, LinkState>> = {};
      for (const r of data ?? []) {
        out[r.kind as LinkKind] = { failures: r.failures, alerted: r.alerted, retryAt: r.retry_at, firstFailedAt: r.first_failed_at };
      }
      return out;
    },
    save: async (kind, s) => {
      const { error: e } = await db.from("link_watch").upsert({
        location_id: locationId, kind, failures: s.failures, alerted: s.alerted, retry_at: s.retryAt, first_failed_at: s.firstFailedAt,
        checked_at: new Date().toISOString(),
      });
      if (e) throw e;
    },
    drop: async (kind) => {
      const { error: e } = await db.from("link_watch").delete().eq("location_id", locationId).eq("kind", kind);
      if (e) throw e;
    },
    fetch: { resolve: resolveHost, fetch: (url, init) => fetch(url, init) },
    retry: async (minutes) => {
      const { error: e } = await db.rpc("enqueue_job", {
        p_kind: "link_watch", p_location: locationId, p_dedupe_key: `link_watch:${locationId}:retry:${minutes}`, p_payload: {},
        p_run_at: new Date(Date.now() + minutes * 60_000).toISOString(),
      });
      if (e) throw e;
    },
    openTask: async (kind) => {
      const { error: e } = await db.rpc("link_watch_event", {
        p_location: locationId, p_kind: kind, p_event: "down", p_title: incidentTitle(kind), p_why: incidentWhy(kind), p_recommendation: RECOMMENDATION,
      });
      if (e) throw e;
    },
    closeTask: async (kind, why) => {
      const { error: e } = await db.rpc("link_watch_event", { p_location: locationId, p_kind: kind, p_event: why === "removed" ? "removed" : "back" });
      if (e) throw e;
    },
    now: () => new Date(),
  };
  return await watchLinks(deps);
}

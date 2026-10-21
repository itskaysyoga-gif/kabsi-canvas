// coach: the Profile Coach's actions (P0.8-09 part B, K-136, K-126). POST { do, location_id, ... } with the signed-in owner's
// or manager's token. Every check is here, in order, so a test can drive it with stubs:
//   1. signed in, 2. owner or manager of the business (anyone else gets "not found"), 3. Pro (public.feature_access, asked
//   again here: hiding a button in the app is not the lock), 4. the business is a normal active one, 5. the action.
// What each action does:
//   snippet           a LocalBusiness snippet from the approved profile, to paste into the owner's website (no Google call)
//   website_tag       the website link and the same link with the Google tag, for the owner to read
//   website_tag_apply the owner's approval of that exact link: the database makes it the approved value and sends it through
//                     the one pipeline after the 10 second undo (public.apply_profile_field)
//   categories        up to three extra categories that belong with the main one (the mock list until Gate A)
//   categories_apply  the owner's approval of the ones chosen, signed in; the main category itself is never changed from here
//   website_check     the website against the profile: name, phone, address, opening times (SSRF safe, robots.txt first)
//   description       the description writer: waits for AI credit, so it answers "ai_off" and nothing runs
// Nothing here suggests a business name, and nothing here writes to Google by itself.
import { type Category, suggestCategories } from "./categories.ts";
import { type DraftDeps, draftDescription, type Fact, PROBLEM_WORDS } from "./description.ts";
import { schemaSnippet } from "./schema.ts";
import { checkWebsite, type SiteFound, type SiteProfile, type SiteResult } from "./site.ts";
import type { SafeFetchDeps } from "./safe-fetch.ts";
import { tagWebsite } from "./website.ts";

export type Profile = {
  active: boolean;
  concierge: boolean;
  country: string | null;
  name: string;
  phone: string;
  website: string;
  address: { display: string; raw?: unknown };
  hours: { display: string; raw?: unknown };
  category: { display: string; raw?: unknown };
  facts: Fact[];
};

export type Deps = {
  getUser: (req: Request) => Promise<{ id: string } | null>;
  memberRole: (locationId: string, userId: string) => Promise<string | null>;
  featureAccess: (locationId: string) => Promise<{ pro: boolean } | null>;
  profile: (locationId: string) => Promise<Profile | null>;
  findCategory: (locationId: string, region: string, displayName: string) => Promise<Category | null>;
  site: SafeFetchDeps;
  saveSite: (locationId: string, website: string, pages: number, found: SiteFound) => Promise<void>;
  runDetectors: (locationId: string) => Promise<void>;
  /** public.apply_profile_field, called with the signed-in user: the approval. */
  apply: (req: Request, locationId: string, userId: string, field: "website" | "main_category", display: string, raw: unknown) => Promise<
    { state: string; publication_id?: string; publish_after?: string | null }
  >;
  draft: DraftDeps;
  rateLimit: (key: string, max: number, seconds: number) => Promise<boolean>;
  log: (fields: Record<string, unknown>) => void;
  captureError: (e: unknown) => Promise<void>;
  cors: Record<string, string>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ACTIONS = ["snippet", "website_tag", "website_tag_apply", "categories", "categories_apply", "website_check", "description"] as const;
type Action = (typeof ACTIONS)[number];

type CategoriesRaw = { primaryCategory?: { name?: string; displayName?: string }; additionalCategories?: { name?: string; displayName?: string }[] };
/** The main category and the extra ones the profile has now; Google's own shape when Kabsi has it, the display text in the mock. */
function currentCategories(p: Profile): { primary: string; primaryRaw: { name?: string; displayName: string }; additional: Category[] } {
  const raw = p.category.raw as CategoriesRaw | string | null | undefined;
  if (raw && typeof raw === "object" && raw.primaryCategory) {
    const primary = raw.primaryCategory.displayName ?? p.category.display;
    return {
      primary,
      primaryRaw: { ...(raw.primaryCategory.name ? { name: raw.primaryCategory.name } : {}), displayName: primary },
      additional: (raw.additionalCategories ?? []).flatMap((c) => (c.name && c.displayName ? [{ name: c.name, displayName: c.displayName }] : [])),
    };
  }
  return { primary: p.category.display, primaryRaw: { displayName: p.category.display }, additional: [] };
}

export function makeHandler(d: Deps) {
  const send = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...d.cors } });
  const err = (status: number, error: string, message: string) => send(status, { error, message });

  const applyRefusal = (e: unknown): Response | null => {
    const m = String((e as Error)?.message ?? e);
    if (m.includes("high_risk_wait")) return err(409, "wait_a_week", "Google asks for a week between changes to the categories. Try again next week.");
    if (m.includes("owner_only")) return err(403, "owner_only", "Only the owner can change the categories, and only when signed in.");
    if (m.includes("not_allowed_to_approve")) return err(403, "not_allowed", "The owner has not let managers approve changes to the profile.");
    if (m.includes("location_not_active") || m.includes("concierge_profile")) return err(409, "not_active", "This business is not connected to Google yet.");
    return null;
  };

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: d.cors });
    if (req.method !== "POST") return err(405, "method_not_allowed", "Use POST.");

    const user = await d.getUser(req);
    if (!user) return err(401, "sign_in_required", "Sign in to use the Profile Coach.");

    const b = (await req.json().catch(() => ({}))) as { do?: string; location_id?: string; add?: unknown };
    if (!b.location_id || !UUID_RE.test(b.location_id)) return err(400, "bad_request", "Choose a business.");
    const action = ACTIONS.find((a) => a === b.do) as Action | undefined;
    if (!action) return err(400, "bad_request", "Choose what to do.");
    const loc = b.location_id;

    if (!(await d.rateLimit(`coach:${user.id}`, 120, 3600))) return err(429, "rate_limited", "That is a lot of requests. Try again in a little while.");

    // A business that is not the caller's looks the same as one that does not exist.
    const role = await d.memberRole(loc, user.id);
    if (role !== "owner" && role !== "manager") return err(404, "not_found", "That business was not found.");

    const access = await d.featureAccess(loc);
    if (!access?.pro) return err(403, "pro_required", "The Profile Coach actions are part of Pro.");

    const p = await d.profile(loc);
    if (!p) return err(404, "not_found", "That business was not found.");
    if (p.concierge) return err(409, "early_access", "Profile work starts once Kabsi connects to Google.");
    if (!p.active) return err(409, "not_active", "This business is not connected to Google yet.");

    try {
      switch (action) {
        case "snippet": {
          const snippet = schemaSnippet({
            name: p.name, phone: p.phone || null, website: p.website || null, category: p.category.display || null,
            address: p.address.display ? p.address : undefined, hours: p.hours.raw,
          });
          return send(200, { ok: true, snippet });
        }

        case "website_tag": {
          if (!p.website) return send(200, { ok: true, website: null, tagged: null, reason: "no_website" });
          const tagged = tagWebsite(p.website);
          return send(200, { ok: true, website: p.website, tagged, reason: tagged ? null : "already_tagged_or_not_a_link" });
        }

        case "website_tag_apply": {
          const tagged = p.website ? tagWebsite(p.website) : null;
          if (!tagged) return err(409, "nothing_to_change", "Your website link has no change to make.");
          if (!(await d.rateLimit(`coach_apply:${loc}`, 10, 86400))) return err(429, "rate_limited", "That is enough changes for today. Try again tomorrow.");
          const r = await d.apply(req, loc, user.id, "website", tagged, tagged);
          d.log({ ok: true, action, state: r.state });
          return send(200, { ok: true, state: r.state, publication: r.publication_id ?? null, publish_after: r.publish_after ?? null, website: tagged });
        }

        case "categories": {
          const cur = currentCategories(p);
          const region = (p.country ?? "US").toUpperCase();
          const suggestions = cur.primary
            ? await suggestCategories(cur.primary, cur.additional.map((c) => c.displayName), (n) => d.findCategory(loc, region, n))
            : [];
          return send(200, { ok: true, primary: cur.primary, additional: cur.additional.map((c) => c.displayName), suggestions });
        }

        case "categories_apply": {
          const chosen = Array.isArray(b.add) ? b.add.filter((x): x is string => typeof x === "string").map((x) => x.trim()) : [];
          if (!chosen.length || chosen.length > 3) return err(400, "bad_request", "Choose up to three categories.");
          const cur = currentCategories(p);
          const region = (p.country ?? "US").toUpperCase();
          const offered = await suggestCategories(cur.primary, cur.additional.map((c) => c.displayName), (n) => d.findCategory(loc, region, n));
          const picked = chosen.map((n) => offered.find((o) => o.displayName.toLowerCase() === n.toLowerCase()));
          if (picked.some((x) => !x)) return err(400, "bad_request", "Choose from the categories Kabsi suggested.");
          const additional = [...cur.additional, ...(picked as Category[])];
          if (additional.length > 9) return err(409, "too_many", "A profile can have up to nine extra categories.");
          if (!(await d.rateLimit(`coach_apply:${loc}`, 10, 86400))) return err(429, "rate_limited", "That is enough changes for today. Try again tomorrow.");
          // The main category is sent back exactly as it is: this action only ever adds.
          const raw = { primaryCategory: cur.primaryRaw, additionalCategories: additional };
          const r = await d.apply(req, loc, user.id, "main_category", cur.primary, raw);
          d.log({ ok: true, action, state: r.state });
          return send(200, { ok: true, state: r.state, publication: r.publication_id ?? null, publish_after: r.publish_after ?? null });
        }

        case "website_check": {
          if (!p.website) return err(409, "no_website", "Add a website to your profile first.");
          if (!(await d.rateLimit(`coach_site:${loc}`, 6, 3600))) return err(429, "rate_limited", "That is enough website checks for now. Try again in an hour.");
          const profile: SiteProfile = { website: p.website, name: p.name, phone: p.phone, address: p.address.display, hours: p.hours.display };
          const r: SiteResult = await checkWebsite(profile, d.site);
          if (r.state === "checked") {
            await d.saveSite(loc, p.website, r.pages, r.found);
            await d.runDetectors(loc);
          }
          d.log({ ok: true, action, state: r.state });
          return send(200, { ok: true, ...r });
        }

        case "description": {
          const r = await draftDescription(p.name, p.facts, d.draft);
          if (r.state === "rejected") return send(200, { ok: true, state: "rejected", problems: r.problems.map((x) => PROBLEM_WORDS[x]) });
          return send(200, { ok: true, ...r });
        }
      }
    } catch (e) {
      const refusal = applyRefusal(e);
      if (refusal) return refusal;
      await d.captureError(e);
      return err(502, "unavailable", "That did not work just now. Try again in a little while.");
    }
  };
}

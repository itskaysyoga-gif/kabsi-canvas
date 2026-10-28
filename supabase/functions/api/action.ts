// action: the email links (/a/:token). Public: the token is the credential, plus a signed-in session for the kinds
// that need one (K-17). The rules are in _shared/email-links.ts and the database (public.action_link_view,
// public.use_action_link, P0.2-05); this file wires them to Supabase.
//   POST { t, do: "view" }              what the link does (never performs anything)
//   POST { t, do, text?, version? }     performs it once; a second POST gets the first result
//   POST { t, do: "undo", publication } cancels that link's approval inside its 10 seconds (K-70)
import { clientIp } from "../_shared/client-ip.ts";
import { admin, captureError, CORS, currentUser, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";
import { auditedAdmin, auditHeaders } from "../_shared/audit.ts";
import { type EmailLinkDeps, LINK_HEADERS, linkRequest, type LinkResult, type LinkView } from "../_shared/email-links.ts";

// P0.1-08: anon can no longer run google_mode(), so the signed-out confirm page gets the Test mode flag from here.
async function mode(): Promise<"mock" | "live"> {
  const { data } = await admin().rpc("google_mode");
  return data === "live" ? "live" : "mock";
}

async function details(v: LinkView) {
  const db = admin();
  if (v.target_type === "listing_change") {
    // A Google Protection change (profile_changes, P0.2-04). No email carries such a link today; the page stays safe.
    const { data: ch } = await db.from("profile_changes").select("id, field, previous_value, google_value, status, locations(name, is_demo)").eq("id", v.target_id).single();
    return {
      action: v.action, business: (ch?.locations as unknown as { name: string } | null)?.name ?? "",
      demo: (ch?.locations as unknown as { is_demo: boolean } | null)?.is_demo === true,
      change: ch && {
        id: ch.id, field: String(ch.field).replace(/_/g, " "), before: (ch.previous_value as { display?: string })?.display ?? "",
        after: (ch.google_value as { display?: string })?.display ?? "", state: ["detected", "awaiting_review"].includes(ch.status) ? "open" : ch.status,
      },
    };
  }
  const { data: rv } = await db.from("reviews").select("id, reviewer_name, star_rating, comment, state, risk, risk_reasons, existing_reply, locations(name, concierge, is_demo)").eq("id", v.target_id).single();
  const { data: draft } = await db.from("reply_drafts").select("body, safety_ok, version").eq("review_id", v.target_id).order("version", { ascending: false }).limit(1).maybeSingle();
  return {
    action: v.action, business: (rv?.locations as unknown as { name: string } | null)?.name ?? "",
    concierge: (rv?.locations as unknown as { concierge: boolean } | null)?.concierge === true,
    demo: (rv?.locations as unknown as { is_demo: boolean } | null)?.is_demo === true,
    review: rv && { id: rv.id, reviewer: rv.reviewer_name, rating: rv.star_rating, comment: rv.comment, state: rv.state, risk: rv.risk, risk_reasons: rv.risk_reasons ?? [], reply: rv.existing_reply },
    draft: draft?.safety_ok ? draft.body : null,
    // Sec 2: the version the page shows; its Approve sends it back and a newer one is refused.
    draft_version: draft?.version ?? 0,
  };
}

function deps(req: Request): EmailLinkDeps {
  let session: Promise<string | null> | null = null;
  return {
    // A browser that is signed in sends its own access token; the anon key reads as no session.
    sessionUser: () => (session ??= currentUser(req).then((u) => u?.id ?? null)),
    view: async (hash, user) => {
      const { data, error } = await admin().rpc("action_link_view", { p_token_hash: hash, p_session_user: user });
      if (error) throw error;
      return data as LinkView;
    },
    details,
    mode,
    use: async (hash, input, recipient) => {
      const { data, error } = await auditedAdmin(auditHeaders(req, recipient)).rpc("use_action_link", {
        p_token_hash: hash, p_do: input.do, p_text: input.text ?? null, p_session_user: input.session, p_publication: input.publication ?? null,
        p_version: input.version ?? null,
      });
      if (error) throw new Error(error.message);
      return data as LinkResult;
    },
  };
}

export async function action(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ip = clientIp(req);
  // D266: this is the token-guessing surface (public, unauthenticated GET/POST): fail closed if the limiter breaks.
  if (!(await rateLimit(`action:${await sha256Hex(ip + new Date().toISOString().slice(0, 10))}`, 60, 600, { failClosed: true }))) return json({ error: "rate_limited", message: "Too many tries." }, 429, LINK_HEADERS);

  try {
    const r = await linkRequest(req, deps(req));
    return json(r.body, r.status, LINK_HEADERS);
  } catch (e) {
    await captureError("action", e);
    return json({ error: "internal", message: "Something went wrong. Nothing was posted. Try again from your Kabsi inbox." }, 500, LINK_HEADERS);
  }
}

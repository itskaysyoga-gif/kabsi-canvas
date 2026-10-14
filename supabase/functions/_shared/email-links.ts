// Email action links (/a/:token), tightened in P0.2-05 (K-17, K-38, K-70, A16).
//
//   GET  ?t=TOKEN                       what the link does, the exact text, and whether the page must sign in first.
//                                       Reads only: public.action_link_view is STABLE, so Postgres refuses any write
//                                       in it, and the details are plain selects. Mail scanners open links.
//   POST { t, do, text? }               the link's own action, once (public.use_action_link): post | skip |
//                                       handle_myself | revert | keep. A second POST gets the first result.
//   POST { t, do: "undo", publication } cancels the publication this link made, inside its 10 seconds (K-70).
//
// Links last 72 hours and belong to one item and one recipient. Profile changes, hours and high-risk reviews need that
// recipient signed in on the page (the page asks and comes back); any other account's session is refused. The token
// stays the credential for review replies, skips and photos. Every use is recorded with the channel email_link, the
// user, the IP country and the user agent (the audited client in api/action.ts forwards them).
//
// This file has no database or network import, so its tests run without credentials; api/action.ts wires it up.

export type LinkResult = {
  done: string;
  state?: string;
  publication_id?: string;
  publish_after?: string | null;
  repeat?: boolean;
};

export type LinkView = {
  status: "invalid" | "expired" | "used" | "ok";
  action?: string;
  target_type?: string;
  target_id?: string;
  location_id?: string;
  user_id?: string | null;
  sign_in?: boolean;
  signed_in?: boolean;
  other_account?: boolean;
  result?: LinkResult | null;
};

export type UseInput = { do: string; text?: string; session: string | null; publication?: string };

export type EmailLinkDeps = {
  /** The signed-in user behind the page (a verified Supabase session), or null. */
  sessionUser(): Promise<string | null>;
  /** public.action_link_view: read only. */
  view(tokenHash: string, session: string | null): Promise<LinkView>;
  /** The business, review, draft or change to show. Read only. */
  details(view: LinkView): Promise<Record<string, unknown>>;
  mode(): Promise<"mock" | "live">;
  /** public.use_action_link, through a client that carries the recipient's request headers for the audit log. */
  use(tokenHash: string, input: UseInput, recipient: string | null): Promise<LinkResult>;
};

export type Reply = { status: number; body: Record<string, unknown> };

const VERBS = ["post", "skip", "handle_myself", "revert", "keep", "undo"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function hashToken(t: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function wellFormed(t: unknown): t is string {
  return typeof t === "string" && t.length >= 40 && t.length <= 64;
}
function refusal(code: string, message: string, status: number): Reply {
  return { status, body: { error: code, message } };
}

// GET: never performs anything.
export async function linkGet(t: string | null, deps: EmailLinkDeps): Promise<Reply> {
  if (!wellFormed(t)) return { status: 404, body: { status: "invalid" } };
  const session = await deps.sessionUser();
  const v = await deps.view(await hashToken(t), session);
  if (v.status === "invalid") return { status: 404, body: { status: "invalid" } };
  const page = { status: v.status, mode: await deps.mode(), sign_in: v.sign_in === true, signed_in: v.signed_in === true,
    other_account: v.other_account === true };
  if (v.status === "expired") return { status: 200, body: page };
  // Another account on a link that needs its recipient: say so, show nothing of the item.
  if (v.sign_in && v.other_account) return { status: 200, body: { ...page, action: v.action } };
  const result = v.status === "used" && v.result ? { result: { done: v.result.done } } : {};
  return { status: 200, body: { ...page, ...result, ...(await deps.details(v)) } };
}

// POST: the one action.
export async function linkPost(body: { t?: unknown; do?: unknown; text?: unknown; publication?: unknown }, deps: EmailLinkDeps): Promise<Reply> {
  if (!wellFormed(body.t)) return refusal("invalid", "This link isn't valid.", 404);
  const verb = typeof body.do === "string" && VERBS.includes(body.do) ? body.do : null;
  if (!verb) return refusal("not_allowed", "This link can't do that.", 400);
  const publication = typeof body.publication === "string" && UUID.test(body.publication) ? body.publication : undefined;
  if (verb === "undo" && !publication) return refusal("not_allowed", "This link can't do that.", 400);
  const hash = await hashToken(body.t);
  const session = await deps.sessionUser();
  // The recipient, so the audit log records the action as theirs.
  const v = await deps.view(hash, session);
  if (v.status === "invalid") return refusal("invalid", "This link isn't valid.", 404);
  try {
    const r = await deps.use(hash, { do: verb, text: typeof body.text === "string" ? body.text : undefined, session, publication }, v.user_id ?? null);
    return { status: 200, body: { ok: true, done: r.done, state: r.state, publication: r.publication_id, publish_after: r.publish_after ?? null,
      repeat: r.repeat === true } };
  } catch (e) {
    const known = linkRefusal(String(e instanceof Error ? e.message : e));
    if (known) return known;
    throw e;
  }
}

// Owner-facing words for the refusals of use_action_link. Null for anything unexpected (the caller reports it).
export function linkRefusal(message: string): Reply | null {
  const known: [string, string, string, number][] = [
    ["invalid_link", "invalid", "This link isn't valid.", 404],
    ["link_expired", "expired", "This link has expired. Open your Kabsi inbox instead.", 410],
    ["link_used", "used", "This link was already used.", 409],
    ["wrong_account", "wrong_account", "This link was sent to someone else. Sign out, then sign in with the email address it was sent to.", 403],
    ["sign_in_required", "sign_in_required", "Sign in to Kabsi to approve this. Kabsi brings you back to this page.", 401],
    ["not_member", "not_member", "You no longer have access to this business.", 403],
    ["not_allowed", "not_allowed", "This link can't do that.", 400],
    ["already_handled", "already_handled", "This review was already handled.", 409],
    ["already_posted", "already_posted", "A reply is already posted for this review.", 409],
    ["bad_reply_text", "bad_text", "The reply is empty or too long.", 400],
    ["too_late", "too_late", "It is already on its way to Google.", 409],
    ["location_not_active", "not_active", "Kabsi can't reach your Google profile right now. Nothing was sent.", 409],
    ["already_decided", "already_decided", "This change was already handled.", 409],
    ["owner_only", "owner_only", "Only the owner can choose this one.", 403],
    ["not_confirmed", "not_confirmed", "You have not confirmed this detail yet, so Kabsi can't put the old value back.", 409],
    ["values_cleared", "values_cleared", "Google's value is no longer kept (after 30 days). Kabsi will show it again if it is still there.", 409],
  ];
  for (const [needle, code, text, status] of known) if (message.includes(needle)) return refusal(code, text, status);
  const wait = message.match(/high_risk_wait (\S+)/);
  if (wait) {
    const when = new Date(wait[1]).toUTCString().slice(0, 16);
    return refusal("high_risk_wait", `Kabsi changed another important detail on Google this week. To keep your profile safe, this one can go on ${when}.`, 409);
  }
  return null;
}

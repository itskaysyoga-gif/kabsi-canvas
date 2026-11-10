// Founding 1 (R-151, master plan 30.51): the Founding 25 count answers only to the private invite slug. Speed 2 part B had
// put the count on kabsi.co's own address and in Vercel's edge cache for 60 seconds; that cache is gone, because a copy kept
// for a slug would let an old link work after staff rotate it. Every answer here is no-store and noindex. The count is the
// same JSON programs/founding returns (programs.ts decides whether the slug is the current one); no visitor data is read.
import { isInviteShape } from "./founding-invite";
import { anonHeaders, supabaseUrl } from "./supabase-config";

export type FoundingCountResult =
  | { status: "ok"; body: { total: number; left: number } & Record<string, unknown> }
  | { status: "not_found" }
  | { status: "unavailable" };

const isCount = (v: unknown): boolean => {
  const o = v as { total?: unknown; left?: unknown } | null;
  return !!o && typeof o.total === "number" && typeof o.left === "number" && o.left >= 0;
};

/** Asks the programs function for the count with the slug. "not_found" means the slug is not the current one. */
export async function readFoundingCount(
  slug: unknown,
  fetcher: typeof fetch = fetch,
): Promise<FoundingCountResult> {
  if (!isInviteShape(slug)) return { status: "not_found" };
  try {
    const res = await fetcher(`${supabaseUrl}/functions/v1/programs/founding`, {
      headers: { ...anonHeaders, "x-founding-invite": slug },
      signal: AbortSignal.timeout(5000),
    });
    // Only the function's own answer means "not the current slug"; a gateway 404 (the function is missing) is "unavailable".
    if (res.status === 404) {
      const j = (await res.json().catch(() => null)) as { error?: unknown } | null;
      return j?.error === "not_found" ? { status: "not_found" } : { status: "unavailable" };
    }
    const body = res.ok ? ((await res.json()) as unknown) : null;
    if (isCount(body)) return { status: "ok", body: body as { total: number; left: number } };
  } catch {
    /* falls through to unavailable */
  }
  return { status: "unavailable" };
}

export async function foundingCountResponse(
  slug: unknown,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const headers = {
    "content-type": "application/json",
    "x-robots-tag": "noindex, nofollow",
    "cache-control": "no-store",
  };
  const r = await readFoundingCount(slug, fetcher);
  if (r.status === "ok") return new Response(JSON.stringify(r.body), { headers });
  if (r.status === "not_found")
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });
  return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers });
}

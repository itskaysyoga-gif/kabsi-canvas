// A fetch of the owner's own public website that cannot be turned on Kabsi's network (P0.8-09, K-136.9). The Edge Function
// is asked to read an address a business owner typed into Google, so every hop is checked before it is made: web
// addresses only, no passwords in them, port 80 or 443, no address that is an IP number, no name that is local, the name must
// resolve and every answer must be a public address, and a redirect may only stay on the same site. The body is capped and
// must be a page. Deps are passed in (the resolver and the fetch), so the Deno tests need no network.
// Known limit: the runtime does not let the request be pinned to the address that was checked, so a name that changes its
// answer between the check and the request is not caught here (docs: PROGRESS, P0.8-09 part B).

export class UnsafeUrl extends Error {
  constructor(public reason: string) {
    super(`unsafe_url:${reason}`);
  }
}

const V4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Is this IP number not a public address? Anything that does not parse counts as not public. */
export function isPrivateIp(ip: string): boolean {
  const s = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const m = V4.exec(s);
  if (m) {
    const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if ([m[1], m[2], m[3], m[4]].some((x) => Number(x) > 255)) return true;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 192 && b === 0 && c <= 2) || (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113);
  }
  if (!s.includes(":")) return true;
  if (s === "::" || s === "::1") return true;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (mapped) return isPrivateIp(mapped[1]!);
  if (s.startsWith("::ffff:")) return true;
  const first = parseInt(s.split(":")[0] || "0", 16);
  if (Number.isNaN(first)) return true;
  // fc00::/7 unique local, fe80::/10 link local, ff00::/8 multicast, the 64:ff9b NAT64 range, 2001:db8 documentation.
  if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00) return true;
  return s.startsWith("64:ff9b:") || s.startsWith("2001:db8:") || s.startsWith("2001:0db8:");
}

/** Why this address may not be fetched, or null when its text is acceptable. The name still has to resolve to public addresses. */
export function urlProblem(u: URL): string | null {
  if (u.protocol !== "http:" && u.protocol !== "https:") return "protocol";
  if (u.username || u.password) return "credentials";
  if (u.port && u.port !== "80" && u.port !== "443") return "port";
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return "host";
  if (host.startsWith("[") || V4.test(host)) return "ip_literal";
  if (!host.includes(".") || /(^|\.)(localhost|local|internal|lan|home|corp|intranet|localdomain)$/.test(host)) return "local_name";
  return null;
}

const stripWww = (h: string) => h.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
/** The same site: the same name, with or without www. */
export const sameSite = (a: URL, b: URL) => stripWww(a.hostname) === stripWww(b.hostname);

export type SafeFetchDeps = {
  /** The A and AAAA answers for a name. */
  resolve(host: string): Promise<string[]>;
  fetch(url: string, init: { redirect: "manual"; signal: AbortSignal; headers: Record<string, string> }): Promise<Response>;
  timeoutMs?: number;
};
export type Page = { url: string; status: number; text: string };

export const MAX_BYTES = 512 * 1024;
const MAX_HOPS = 3;
const USER_AGENT = "KabsiWebsiteCheck (+https://kabsi.co)";

async function readCapped(res: Response, max: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new UnsafeUrl("too_big");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** One page of the same site. `kind` says what it must be: a web page or a plain text file (robots.txt). */
export async function safeGet(start: string, origin: URL, deps: SafeFetchDeps, kind: "html" | "text" = "html"): Promise<Page> {
  let u = new URL(start);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const bad = urlProblem(u);
    if (bad) throw new UnsafeUrl(bad);
    if (!sameSite(u, origin)) throw new UnsafeUrl("other_site");
    const answers = await deps.resolve(u.hostname);
    if (!answers.length) throw new UnsafeUrl("no_address");
    if (answers.some(isPrivateIp)) throw new UnsafeUrl("private_address");
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), deps.timeoutMs ?? 8000);
    try {
      const res = await deps.fetch(u.toString(), {
        redirect: "manual", signal: ctl.signal,
        headers: { "user-agent": USER_AGENT, accept: kind === "html" ? "text/html,application/xhtml+xml" : "text/plain" },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        await res.body?.cancel();
        if (!loc) throw new UnsafeUrl("redirect_without_target");
        u = new URL(loc, u);
        continue;
      }
      const type = (res.headers.get("content-type") ?? "").toLowerCase();
      if (res.ok && kind === "html" && !/text\/html|application\/xhtml/.test(type)) {
        await res.body?.cancel();
        throw new UnsafeUrl("not_a_page");
      }
      if (res.ok && kind === "text" && !/^text\//.test(type)) {
        await res.body?.cancel();
        throw new UnsafeUrl("not_text");
      }
      return { url: u.toString(), status: res.status, text: res.ok ? await readCapped(res, MAX_BYTES) : "" };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new UnsafeUrl("too_many_redirects");
}

/** robots.txt for the group "*" and "KabsiWebsiteCheck": may this path be read? The longest matching rule wins; Allow wins a tie. */
export function allowedByRobots(robots: string, path: string): boolean {
  let applies = false;
  let any = false;
  const rules: { allow: boolean; prefix: string }[] = [];
  let groupHasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const i = line.indexOf(":");
    if (i < 0) continue;
    const field = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (field === "user-agent") {
      if (!groupHasAgent) applies = false;
      groupHasAgent = true;
      const agent = value.toLowerCase();
      if (agent === "*" || "kabsiwebsitecheck".startsWith(agent) && agent.length > 0 && agent !== "*") applies = true;
      any = any || applies;
    } else if (field === "allow" || field === "disallow") {
      groupHasAgent = false;
      if (applies && value) rules.push({ allow: field === "allow", prefix: value });
    } else {
      groupHasAgent = false;
    }
  }
  if (!any) return true;
  const matches = rules.filter((r) => matchRule(r.prefix, path));
  if (!matches.length) return true;
  matches.sort((a, b) => b.prefix.length - a.prefix.length || Number(b.allow) - Number(a.allow));
  return matches[0]!.allow;
}

function matchRule(rule: string, path: string): boolean {
  const end = rule.endsWith("$");
  const body = end ? rule.slice(0, -1) : rule;
  const re = new RegExp("^" + body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (end ? "$" : ""));
  return re.test(path);
}

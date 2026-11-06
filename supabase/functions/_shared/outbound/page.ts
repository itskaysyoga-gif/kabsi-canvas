// Reading a business's own page once, politely (Harvey 4A part B): robots.txt respected, a timeout, a size cap, no
// cookies, a plain user agent that names Kabsi. The page is read only to confirm the email is still published and to
// pick the one detail; nothing from it is stored but the detail sentence, the page address and the date.

export const USER_AGENT = "KabsiOutbound/1.0 (+https://kabsi.co/privacy)";
const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 10_000;

/** Whether robots.txt lets this user agent read the path (the group for KabsiOutbound, else *; longest match wins). */
export function robotsAllows(robots: string, path: string, agent = "kabsioutbound"): boolean {
  type Group = { agents: string[]; rules: { allow: boolean; path: string }[] };
  const groups: Group[] = [];
  let cur: Group | null = null;
  let lastWasAgent = false;
  for (const raw of String(robots ?? "").split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && cur) {
      lastWasAgent = false;
      if (val) cur.rules.push({ allow: key === "allow", path: val });
    } else lastWasAgent = false;
  }
  const mine = groups.find((g) => g.agents.some((a) => a !== "*" && agent.includes(a))) ?? groups.find((g) => g.agents.includes("*"));
  if (!mine) return true;
  let best: { allow: boolean; len: number } | null = null;
  for (const r of mine.rules) {
    if (ruleMatches(r.path, path) && (!best || r.path.length > best.len || (r.path.length === best.len && r.allow))) {
      best = { allow: r.allow, len: r.path.length };
    }
  }
  return best ? best.allow : true;
}

async function capped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => undefined);
  const all = new Uint8Array(Math.min(size, MAX_BYTES));
  let at = 0;
  for (const c of chunks) {
    const part = c.subarray(0, Math.max(0, all.length - at));
    all.set(part, at);
    at += part.length;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(all);
}

/** A robots.txt path rule: a prefix, where * matches anything and a final $ anchors the end. No regular expression is
 *  built from the file. */
export function ruleMatches(rule: string, path: string): boolean {
  const anchored = rule.endsWith("$");
  const parts = (anchored ? rule.slice(0, -1) : rule).split("*");
  if (!path.startsWith(parts[0])) return false;
  let at = parts[0].length;
  for (let i = 1; i < parts.length; i++) {
    const k = path.indexOf(parts[i], at);
    if (k < 0) return false;
    at = k + parts[i].length;
  }
  if (!anchored) return true;
  const last = parts[parts.length - 1];
  return parts.length === 1 ? path === parts[0] : path.endsWith(last) && path.length - last.length >= at - last.length;
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** The page, or why it was not read. One request for robots.txt and one for the page, each with the timeout. */
export async function readPage(url: string, fetcher: Fetcher = fetch): Promise<{ html: string } | { refused: string }> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { refused: "bad_url" };
  }
  if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname)) return { refused: "bad_url" };
  const get = async (target: string) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      return await fetcher(target, { headers: { "user-agent": USER_AGENT, accept: "text/html,text/plain" }, redirect: "follow", signal: ctl.signal });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    const robots = await get(`${u.origin}/robots.txt`);
    if (robots.status >= 500) return { refused: "robots_unreadable" };
    const text = robots.ok ? await capped(robots) : "";
    if (!robotsAllows(text, u.pathname + u.search)) return { refused: "robots" };
    const res = await get(u.href);
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      return { refused: `http_${res.status}` };
    }
    const type = res.headers.get("content-type") ?? "";
    if (type && !/text\/html|text\/plain|application\/xhtml/i.test(type)) return { refused: "not_html" };
    return { html: await capped(res) };
  } catch {
    return { refused: "unreachable" };
  }
}

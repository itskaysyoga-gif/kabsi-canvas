// Sec 1, webhooks: a small in-memory stand-in for PostgREST, so storeEvent and applyEvent (billing.ts) run their real
// code against tables held in memory. It answers only the calls those paths make: select with eq, is, in and not.is
// filters, insert (with a unique key that answers 23505 like Postgres), update, and rpc. No network: the fetch that
// supabase-js uses is replaced in this test isolate only, and every other address is refused.

type Row = Record<string, unknown>;
export type FakeDb = {
  tables: Record<string, Row[]>;
  rpcCalls: { fn: string; args: Row }[];
  /** Columns that must be unique together, per table (the Postgres unique keys the code relies on). */
  unique: Record<string, string[][]>;
  rpc: Record<string, (args: Row) => unknown>;
};

export const FAKE_URL = "https://fake-db.invalid";

export function newDb(): FakeDb {
  return {
    tables: {},
    rpcCalls: [],
    unique: {
      billing_events: [["provider", "event_key"]],
      subscriptions: [["provider", "provider_subscription_id"]],
      email_suppressions: [["address", "scope"]],
      google_events: [["message_id"]],
    },
    rpc: {},
  };
}

let active: FakeDb | null = null;
export const useDb = (db: FakeDb | null) => {
  active = db;
};

const matches = (row: Row, params: URLSearchParams): boolean => {
  for (const [col, raw] of params) {
    if (["select", "order", "limit", "columns", "on_conflict", "offset"].includes(col)) continue;
    const v = row[col];
    const [op, ...rest] = raw.split(".");
    const val = rest.join(".");
    if (op === "eq" && String(v) !== val) return false;
    if (op === "is" && val === "null" && v !== null && v !== undefined) return false;
    if (op === "not" && val === "is.null" && (v === null || v === undefined)) return false;
    if (op === "in") {
      const list = val.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      if (!list.includes(String(v))) return false;
    }
  }
  return true;
};

const reply = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function answer(db: FakeDb, req: { method: string; url: URL; accept: string; prefer: string; body: unknown }): Response {
  const path = req.url.pathname.replace(/^\/rest\/v1\//, "");
  if (path.startsWith("rpc/")) {
    const fn = path.slice(4);
    const args = (req.body ?? {}) as Row;
    db.rpcCalls.push({ fn, args });
    const f = db.rpc[fn];
    return reply(200, f ? f(args) : null);
  }
  const table = (db.tables[path] ??= []);
  const object = req.accept.includes("vnd.pgrst.object");
  const wantRows = req.prefer.includes("return=representation") || req.method === "GET";
  const out = (rows: Row[], created = false) => {
    if (object) {
      if (rows.length !== 1) return reply(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows`, hint: null });
      return reply(200, rows[0]);
    }
    if (!wantRows) return reply(created ? 201 : 204, undefined);
    const limit = Number(req.url.searchParams.get("limit") ?? "");
    return reply(200, Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows);
  };
  if (req.method === "GET") return out(table.filter((r) => matches(r, req.url.searchParams)));
  if (req.method === "POST") {
    const items = (Array.isArray(req.body) ? req.body : [req.body]) as Row[];
    const made: Row[] = [];
    for (const it of items) {
      const row: Row = { id: crypto.randomUUID(), ...it };
      for (const key of db.unique[path] ?? []) {
        if (table.some((r) => key.every((c) => r[c] === row[c]))) {
          // An upsert with ignoreDuplicates is "on conflict do nothing".
          if (req.prefer.includes("resolution=ignore-duplicates")) return out(made, true);
          return reply(409, { code: "23505", message: `duplicate key value violates unique constraint on ${path}`, details: null, hint: null });
        }
      }
      table.push(row);
      made.push(row);
    }
    return out(made, true);
  }
  if (req.method === "PATCH") {
    const hit = table.filter((r) => matches(r, req.url.searchParams));
    for (const r of hit) Object.assign(r, req.body as Row);
    return out(hit);
  }
  return reply(405, { code: "fake", message: `the fake database does not answer ${req.method}` });
}

/** Points admin() at the fake database: sets the two variables admin() reads, creates the client, and unsets them. */
export async function installFakeDb(): Promise<void> {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const r = new Request(input, init);
    const url = new URL(r.url);
    if (url.origin !== FAKE_URL) return new Response("no network in tests", { status: 599 });
    if (!active) return reply(503, { code: "fake", message: "no fake database in use" });
    const text = r.method === "GET" || r.method === "HEAD" ? "" : await r.text();
    return answer(active, {
      method: r.method, url, accept: r.headers.get("accept") ?? "", prefer: r.headers.get("prefer") ?? "",
      body: text ? JSON.parse(text) : undefined,
    });
  }) as typeof fetch;
  const was = { url: Deno.env.get("SUPABASE_URL"), key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") };
  Deno.env.set("SUPABASE_URL", FAKE_URL);
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "not-a-real-key");
  const { admin } = await import("../kabsi.ts");
  admin();
  if (was.url === undefined) Deno.env.delete("SUPABASE_URL"); else Deno.env.set("SUPABASE_URL", was.url);
  if (was.key === undefined) Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY"); else Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", was.key);
}

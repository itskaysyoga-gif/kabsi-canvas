// Sec 1: the pages that email, staff and card links open (/a, /h, /u, /activate, /unsubscribe). Opening a page only
// reads: the browser sends a GET (or the staff page's read-only lookup), and only a person's tap sends the POST that acts.
// The pages are never cached, give no Referer to any other site, and are not indexed. The Edge Function half is in
// supabase/functions/_shared/sec1/email-links.test.ts; the database half in supabase/tests/email_approvals.sql.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

type Rule = { source: string; headers: { key: string; value: string }[]; has?: unknown };
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { headers: Rule[] };
const read = (p: string) => readFileSync(p, "utf8");
const TOKEN = "Zk3n" + "x".repeat(39);

// Vercel applies every matching rule in order; for the same header the later rule wins.
function finalHeader(path: string, key: string): string | undefined {
  let value: string | undefined;
  for (const rule of vercel.headers) {
    if (rule.has) continue;
    const re = new RegExp(
      "^" + rule.source.replace(/:path\*/g, ".*").replace(/\(\.\*\)/g, ".*") + "$",
    );
    if (!re.test(path)) continue;
    const h = rule.headers.find((x) => x.key.toLowerCase() === key.toLowerCase());
    if (h) value = h.value;
  }
  return value;
}

const PAGES = [
  { path: `/a/${TOKEN}`, file: "src/routes/a.$token.tsx" },
  { path: `/h/${TOKEN}`, file: "src/routes/h.$token.tsx" },
  { path: `/u/${TOKEN}`, file: "src/routes/u.$token.tsx" },
  { path: "/unsubscribe", file: "src/routes/unsubscribe.tsx" },
];

describe("sec1: link pages are not cached, leak no Referer and are not indexed", () => {
  for (const { path } of PAGES) {
    it(`${path.slice(0, 3)}: no-store, no-referrer and noindex in vercel.json`, () => {
      expect(finalHeader(path, "Cache-Control")).toBe("no-store");
      expect(finalHeader(path, "Referrer-Policy")).toBe("no-referrer");
      expect(finalHeader(path, "X-Robots-Tag")).toBe("noindex");
    });
  }
  it("/activate: no-store and noindex (its code is not a credential)", () => {
    expect(finalHeader("/activate/AB12CD", "Cache-Control")).toBe("no-store");
    expect(finalHeader("/activate/AB12CD", "X-Robots-Tag")).toBe("noindex");
  });
  it("every other page keeps the site-wide referrer policy", () => {
    expect(finalHeader("/pricing", "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
  for (const { path, file } of PAGES) {
    it(`${path.slice(0, 3)}: the page itself asks for no-referrer and noindex (any host)`, () => {
      const src = read(file);
      expect(src).toContain('{ name: "referrer", content: "no-referrer" }');
      expect(src).toContain('{ name: "robots", content: "noindex" }');
    });
  }
});

describe("sec1: opening a page never acts", () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const stubFetch = (reply: unknown, status = 200) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({
          url: String(url),
          method: init?.method ?? "GET",
          body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
        });
        return new Response(JSON.stringify(reply), { status });
      }),
    );
  afterEach(() => {
    calls.length = 0;
    vi.unstubAllGlobals();
  });

  // Sec 2: the page load is a POST that only reads ({ do: "view" }), so the token is never in an address.
  it("/a: the page load reads with { do: view }, never in the address; approve, skip and undo are POSTs", async () => {
    const { loadAction, runAction, undoAction } = await import("../src/lib/reviews");
    stubFetch({ status: "ok" });
    await loadAction(TOKEN);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).not.toContain(TOKEN);
    expect(calls[0].body).toEqual({ t: TOKEN, do: "view" });
    await runAction(TOKEN, "post", "Thank you.");
    await undoAction(TOKEN, "00000000-0000-4000-8000-000000000901");
    expect(calls.slice(1).map((c) => c.method)).toEqual(["POST", "POST"]);
    expect(calls[1].url).not.toContain(TOKEN);
    expect(calls[1].body).toMatchObject({ t: TOKEN, do: "post", text: "Thank you." });
  });

  it("/a: the page loads with the GET only; every POST sits behind a person's tap", () => {
    const src = read("src/routes/a.$token.tsx");
    const effect = src.slice(src.indexOf("useEffect(() => {"), src.indexOf("async function run("));
    expect(effect).toContain("loadAction(token)");
    expect(effect).not.toMatch(/runAction|undoAction/);
    expect(src).toMatch(/async function run\(/);
    expect(src).toMatch(/onClick=\{\(\) => void undo\(\)\}/);
  });

  it("/a: a different signed-in account gets the sign-out page on every kind of link, not only the sign-in ones", () => {
    const src = read("src/routes/a.$token.tsx");
    expect(src).toContain('if (!done && view.other_account && view.status === "ok") {');
    expect(src).not.toContain("view.sign_in && view.other_account");
  });

  it("/h: the page load reads with { do: view }, never in the address; answering and undo are POSTs; ?a= only preselects", async () => {
    const { loadHolidayLink, answerHolidayLink, undoHolidayLink } =
      await import("../src/lib/holidays");
    stubFetch({ status: "ok", ok: true, state: "answered", answer: "normal" });
    await loadHolidayLink(TOKEN);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).not.toContain(TOKEN);
    expect(calls[0].body).toEqual({ t: TOKEN, do: "view" });
    await answerHolidayLink(TOKEN, "normal");
    await undoHolidayLink(TOKEN);
    expect(calls.slice(1).map((c) => c.method)).toEqual(["POST", "POST"]);
    const src = read("src/routes/h.$token.tsx");
    expect(src).toContain("initial={a ?? null}");
    const loader = src.slice(src.indexOf("useEffect(() => {"), src.indexOf("async function undo("));
    expect(loader).not.toMatch(/answerHolidayLink|undoHolidayLink/);
  });

  it("/unsubscribe: the page load only reads ({ view: true }); only the Unsubscribe button stops anything", async () => {
    const { lookUpUnsubscribe, unsubscribe } = await import("../src/lib/unsubscribe");
    stubFetch({ ok: true, label: "Weekly report" });
    await lookUpUnsubscribe("payload.sig");
    await unsubscribe("payload.sig");
    expect(calls.map((c) => c.method)).toEqual(["POST", "POST"]);
    expect(calls.every((c) => !c.url.includes("payload.sig"))).toBe(true);
    expect(calls[0].body).toEqual({ t: "payload.sig", view: true });
    expect(calls[1].body).toEqual({ t: "payload.sig" });
    const src = read("src/routes/unsubscribe.tsx");
    const effect = src.slice(src.indexOf("useEffect("), src.indexOf("async function stop("));
    expect(effect).toContain("lookUpUnsubscribe(token)");
    expect(effect).not.toMatch(/\bunsubscribe\((t|token)\)/);
    expect(src).toMatch(/onClick=\{\(\) => void stop\(\)\}/);
  });

  it("/u: opening the staff page only looks the business up; the upload needs a chosen file", async () => {
    const { linkBusiness } = await import("../src/lib/photos");
    stubFetch({ ok: true, name: "QA Bakery" });
    await linkBusiness(TOKEN);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toEqual({ do: "link", token: TOKEN });
    const fn = read("supabase/functions/photos/index.ts");
    // The lookup is a read (photo_link_location is STABLE); anything but a POST is refused before any work.
    expect(fn.indexOf('if (req.method !== "POST") return fail(')).toBeLessThan(
      fn.indexOf("await linkFor("),
    );
    const link = fn.slice(
      fn.indexOf('if (b.do === "link")'),
      fn.indexOf('return fail("bad_input", "Unknown action.")'),
    );
    expect(link).not.toMatch(/photo_upload|storage|acceptUpload/);
    const page = read("src/routes/u.$token.tsx");
    const effect = page.slice(page.indexOf("useEffect("), page.indexOf("async function onFiles("));
    expect(effect).toContain("linkBusiness(token)");
    expect(effect).not.toContain("staffUpload");
  });

  it("/activate: the page acts on nothing; it only offers /start with the cleaned code", () => {
    const src = read("src/routes/activate.$code.tsx");
    expect(src).not.toMatch(/fetch\(|supabase|rpc\(|activateCard|useEffect/);
    expect(src).toContain('.replace(/[^0-9A-Z]/g, "")');
    expect(src).toContain(".slice(0, 6)");
    expect(src).toMatch(/to="\/start"\s+search=\{\{ code: clean \}\}/);
  });
});

// Run: deno test --no-check supabase/functions/_shared/link-watch/link-now.test.ts
// SITE-3 (free check step 4): "Do your links work now?". One look at the website with a short limit, HEAD then GET, through
// the link watch's safe fetch. Every fetch and every name lookup here is a stub: no network.
import assert from "node:assert/strict";
import type { SafeFetchDeps } from "../coach/safe-fetch.ts";
import { linkNow } from "./link-watch.ts";

type Call = { url: string; method: string };
function deps(answer: (c: Call, signal: AbortSignal) => Promise<Response>, addresses = ["93.184.216.34"]) {
  const calls: Call[] = [];
  const d: SafeFetchDeps = {
    resolve: () => Promise.resolve(addresses),
    fetch: (url, init) => {
      const c = { url, method: init.method ?? "GET" };
      calls.push(c);
      return answer(c, init.signal);
    },
  };
  return { d, calls };
}
const page = (status: number, headers: Record<string, string> = { "content-type": "text/html" }) => Promise.resolve(new Response(status === 204 ? null : "", { status, headers }));

Deno.test("a page that answers the HEAD loads, with one request", async () => {
  const { d, calls } = deps(() => page(200));
  assert.equal(await linkNow("website", "https://example.com", d), "loads");
  assert.deepEqual(calls.map((c) => c.method), ["HEAD"]);
});

Deno.test("a site that refuses HEAD is asked again with a GET", async () => {
  const { d, calls } = deps((c) => page(c.method === "HEAD" ? 405 : 200));
  assert.equal(await linkNow("website", "https://example.com", d), "loads");
  assert.deepEqual(calls.map((c) => c.method), ["HEAD", "GET"]);
});

Deno.test("a redirect on the same site is followed; 3xx to a page that loads is loads", async () => {
  const { d, calls } = deps((c) => c.url === "https://example.com/" ? page(301, { location: "https://www.example.com/home" }) : page(200));
  assert.equal(await linkNow("website", "https://example.com/", d), "loads");
  assert.deepEqual(calls.map((c) => c.url), ["https://example.com/", "https://www.example.com/home"]);
});

Deno.test("a 404 or a 500 fails, after HEAD and GET", async () => {
  for (const status of [404, 500, 503]) {
    const { d, calls } = deps(() => page(status));
    assert.equal(await linkNow("website", "https://example.com", d), "fails", String(status));
    assert.equal(calls.length, 2);
  }
});

Deno.test("a network error fails", async () => {
  const { d } = deps(() => Promise.reject(new TypeError("connection refused")));
  assert.equal(await linkNow("website", "https://example.com", d), "fails");
});

Deno.test("a site that does not answer inside the limit fails, on time", async () => {
  const { d } = deps((_c, signal) => new Promise((_res, rej) => signal.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")))));
  const t0 = Date.now();
  assert.equal(await linkNow("website", "https://example.com", d, 60), "fails");
  assert.ok(Date.now() - t0 < 1000, "answered within the limit");
});

Deno.test("a private address is never fetched", async () => {
  for (const ip of ["10.0.0.5", "127.0.0.1", "169.254.169.254", "192.168.1.1", "::1", "fd00::1"]) {
    const { d, calls } = deps(() => page(200), [ip]);
    assert.equal(await linkNow("website", "https://intranet-name.example.com", d), "fails", ip);
    assert.equal(calls.length, 0, ip);
  }
  // An IP number or a local name in the address itself is refused before any lookup.
  for (const url of ["http://127.0.0.1/", "http://[::1]/", "http://localhost/", "http://router.local/", "ftp://example.com/"]) {
    const { d, calls } = deps(() => page(200));
    assert.equal(await linkNow("website", url, d), "fails", url);
    assert.equal(calls.length, 0, url);
  }
});

Deno.test("the website moving to another site fails, as in the daily watch", async () => {
  const { d } = deps(() => page(302, { location: "https://parked-domains.example.net/" }));
  assert.equal(await linkNow("website", "https://example.com", d), "fails");
});

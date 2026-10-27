// Sec 1: the one reader of the visitor's address for rate limit keys (_shared/client-ip.ts).
import assert from "node:assert/strict";
import { clientIp } from "../client-ip.ts";

const req = (h: Record<string, string>) => new Request("https://x/functions/v1/any", { headers: h });

Deno.test("cf-connecting-ip comes first, then the first X-Forwarded-For entry", () => {
  assert.equal(clientIp(req({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1, 10.0.0.1" })), "203.0.113.9");
  assert.equal(clientIp(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })), "198.51.100.1");
  assert.equal(clientIp(req({ "x-forwarded-for": "2001:db8::1" })), "2001:db8::1");
});

Deno.test("x-real-ip is never read, and anything that is not an address is unknown", () => {
  assert.equal(clientIp(req({ "x-real-ip": "10.1.2.3" })), "unknown");
  assert.equal(clientIp(req({})), "unknown");
  assert.equal(clientIp(req({ "x-forwarded-for": "<script>, 1.2.3.4" })), "unknown");
  assert.equal(clientIp(req({ "cf-connecting-ip": "not an ip", "x-forwarded-for": "198.51.100.7" })), "198.51.100.7");
  assert.equal(clientIp(req({ "x-forwarded-for": "1".repeat(200) })), "unknown");
});

Deno.test("every public function reads the address through clientIp, never the raw header", async () => {
  const root = new URL("../../", import.meta.url);
  const offenders: string[] = [];
  for await (const dir of Deno.readDir(root)) {
    if (!dir.isDirectory || dir.name === "_shared") continue;
    for await (const f of Deno.readDir(new URL(`${dir.name}/`, root))) {
      if (!f.name.endsWith(".ts") || f.name.endsWith(".test.ts")) continue;
      const text = await Deno.readTextFile(new URL(`${dir.name}/${f.name}`, root));
      if (/headers\.get\("(x-forwarded-for|cf-connecting-ip|x-real-ip)"\)/i.test(text)) offenders.push(`${dir.name}/${f.name}`);
    }
  }
  assert.deepEqual(offenders, []);
});

// Sec 1: the service role never reaches a browser. Fails when a service key name or a service key value appears in the
// app's code (src), in a variable Vite would put in the client bundle, or in a built client bundle that is on disk.
// Nothing here prints a value: a failure names the file and the kind of match only.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script without types
import { checkEnv } from "../scripts/check-env.mjs";

const NAME = /SERVICE_ROLE|SERVICE_KEY|SUPABASE_SECRET|sb_secret_[A-Za-z0-9_-]{8,}/;
const JWT = /eyJ[A-Za-z0-9_-]{5,}\.(eyJ[A-Za-z0-9_-]{5,})\.[A-Za-z0-9_-]{10,}/g;
// The client bundle may hold supabase-js's own check of the key prefix (`sb_secret_`), never a key itself.
const SECRET_VALUE = /sb_secret_[A-Za-z0-9_-]{8,}/;

function files(dir: string, exts: RegExp, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, exts, out);
    else if (exts.test(name)) out.push(p);
  }
  return out;
}

/** A JWT whose payload says role service_role (the legacy service key), anywhere in the text. */
function serviceJwt(text: string): boolean {
  for (const m of text.matchAll(JWT)) {
    try {
      const payload = JSON.parse(
        Buffer.from(m[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
      );
      if (payload?.role === "service_role") return true;
    } catch {
      // not a JWT after all
    }
  }
  return false;
}

describe("Sec 1: the service role stays on the server", () => {
  it("src never names or holds a service key, server files included", () => {
    const hits: string[] = [];
    for (const f of files("src", /\.(ts|tsx|js|jsx|mjs)$/)) {
      if (/\.test\./.test(f)) continue;
      const text = readFileSync(f, "utf8");
      if (NAME.test(text)) hits.push(`${f}: service key name`);
      if (serviceJwt(text)) hits.push(`${f}: service role JWT`);
    }
    expect(hits).toEqual([]);
  });

  it("the browser reads only the two public Supabase values and the pixel id from the environment", () => {
    const used = new Set<string>();
    for (const f of files("src", /\.(ts|tsx)$/)) {
      for (const m of readFileSync(f, "utf8").matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g))
        used.add(m[1]);
    }
    const allowed = new Set([
      "DEV",
      "PROD",
      "MODE",
      "SSR",
      "BASE_URL",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_META_PIXEL_ID",
    ]);
    expect([...used].filter((n) => !allowed.has(n))).toEqual([]);
  });

  it("vite.config.ts keeps the VITE_ prefix and defines nothing secret for the client", () => {
    const cfg = readFileSync("vite.config.ts", "utf8");
    // A wider envPrefix (or "") would put every server variable in the bundle.
    expect(cfg).not.toMatch(/envPrefix/);
    expect(cfg).not.toMatch(/loadEnv/);
    expect(cfg).not.toMatch(NAME);
    // `define` writes values into the client code: only the commit id may go there (the Sentry release tag).
    const define = /define:\s*\{([\s\S]*?)\n\s{2}\},/.exec(cfg)?.[1] ?? "";
    expect(define).not.toBe("");
    const defined = [
      ...define.matchAll(/process\.env\[["']([A-Z0-9_]+)["']\]|process\.env\.([A-Z0-9_]+)/g),
    ].map((m) => m[1] ?? m[2]);
    expect(defined.filter((n) => !["VERCEL_GIT_COMMIT_SHA", "GITHUB_SHA"].includes(n))).toEqual([]);
  });

  it("the build guard refuses a service key under any browser-visible name", () => {
    const good = { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" };
    for (const name of [
      "VITE_SUPABASE_SERVICE_ROLE_KEY",
      "VITE_SERVICE_KEY",
      "VITE_SUPABASE_SECRET_KEY",
      "VITE_SB_SECRET",
    ]) {
      const problems: string[] = checkEnv({ ...good, [name]: "x" });
      expect(problems.join("\n"), name).toContain(name);
    }
  });

  it("a built client bundle on disk holds no service key", () => {
    const hits: string[] = [];
    for (const dir of [".output/public", "dist/client", ".vercel/output/static"]) {
      for (const f of files(dir, /\.(js|mjs|html|json)$/)) {
        const text = readFileSync(f, "utf8");
        if (/SERVICE_ROLE|SERVICE_KEY/.test(text)) hits.push(`${f}: service key name`);
        if (SECRET_VALUE.test(text)) hits.push(`${f}: secret key value`);
        if (serviceJwt(text)) hits.push(`${f}: service role JWT`);
      }
    }
    expect(hits).toEqual([]);
  });
});

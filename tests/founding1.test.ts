// Founding 1 (lane R R-151, master plan 30.51): Founding 25 is private. These tests hold the decision:
//  - the page opens only at /founding/<slug>: no slug and a wrong slug are the real not-found page with a 404, the right slug
//    is the page, noindex and nofollow, no canonical, no share image, never cached;
//  - the slug is one setting that staff rotate with one staff-only function, and the old link stops at once;
//  - no public route, sitemap, llms file, IndexNow list or public fact names Founding 25 or links /founding.
// The slug in these tests is invented; the real one lives only in app_settings.founding_invite_slug and is never printed.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { routeTree } from "../src/routeTree.gen";
import { INVITE_SHAPE, isInviteShape } from "../src/lib/founding-invite";
import { readFoundingCount } from "../src/lib/founding-count";
import {
  INVITE_SHAPE as FUNCTION_SHAPE,
  inviteMatches,
} from "../supabase/functions/_shared/programs";
import { changedUrls } from "../scripts/lib/indexnow-lib.mjs";
import { isTokenPath, scrubString } from "../src/lib/scrub";

const SLUG = "AbCdEfGhIjKlMnOpQrStUvWx";
const read = (p: string) => readFileSync(p, "utf8");
const router = () => createRouter({ routeTree, context: { queryClient: new QueryClient() } });

describe("the slug", () => {
  it("has one shape on the website and in the function", () => {
    expect(INVITE_SHAPE.source).toBe(FUNCTION_SHAPE.source);
    expect(isInviteShape(SLUG)).toBe(true);
    for (const bad of ["", "short", `${SLUG}x`, "AbCdEfGhIjKlMnOpQrStUv-_", null, undefined, 24])
      expect(isInviteShape(bad), String(bad)).toBe(false);
  });
  it("matches only the stored value, character for character", () => {
    expect(inviteMatches(SLUG, SLUG)).toBe(true);
    expect(inviteMatches(SLUG.toLowerCase(), SLUG)).toBe(false);
    expect(inviteMatches(`${SLUG.slice(0, 23)}Z`, SLUG)).toBe(false);
    expect(inviteMatches(SLUG, `${SLUG.slice(0, 23)}Z`)).toBe(false);
    expect(inviteMatches(SLUG, undefined)).toBe(false);
    expect(inviteMatches(undefined, SLUG)).toBe(false);
    expect(inviteMatches("", "")).toBe(false);
  });
});

describe("the slug never leaves kabsi.co", () => {
  it("is scrubbed from every address Sentry and PostHog could send, and the Pixel and session replay skip the page", () => {
    expect(scrubString(`https://kabsi.co/founding/${SLUG}`)).toBe(
      "https://kabsi.co/founding/:token",
    );
    expect(scrubString(`https://kabsi.co/api/founding-count?slug=${SLUG}`)).toBe(
      "https://kabsi.co/api/founding-count?slug=redacted",
    );
    // The page's own server function is a POST, so its payload is never in an address.
    expect(read("src/lib/founding-invite-server.ts")).toContain(
      'createServerFn({ method: "POST" })',
    );
    expect(
      scrubString(`https://x.supabase.co/functions/v1/programs/founding?invite=${SLUG}`),
    ).toContain("invite=redacted");
    expect(isTokenPath(`/founding/${SLUG}`)).toBe(true);
    expect(read("src/lib/meta-pixel.ts")).toContain("/^\\/founding\\//");
  });
});

describe("the route: /founding/<slug> only", () => {
  it("has no /founding page of its own: the bare address matches no route, so it is the not-found page", () => {
    expect(existsSync("src/routes/founding.tsx")).toBe(false);
    for (const p of ["/founding", "/founding/"]) {
      const last = router().matchRoutes(p).at(-1)?.routeId;
      expect(last, p).toBe(rootRouteId);
    }
  });
  it("has one route with a slug, which is a loader that throws notFound for anything but the current slug", () => {
    expect(router().matchRoutes(`/founding/${SLUG}`).at(-1)?.routeId).toBe("/founding/$slug");
    const route = read("src/routes/founding.$slug.tsx");
    expect(route).toContain("checkFoundingInvite({ data: params.slug })");
    expect(route).toContain("throw notFound()");
  });
  it("is noindex and nofollow, with no canonical, no share image, no structured data and no referrer", () => {
    const route = read("src/routes/founding.$slug.tsx");
    expect(route).toContain('{ name: "robots", content: "noindex, nofollow" }');
    expect(route).toContain('{ name: "referrer", content: "no-referrer" }');
    expect(route).not.toMatch(/pageHead\(|rel: "canonical"|og:|jsonLd|faqJsonLd|links:/);
  });
  it("is sent with noindex and nofollow and no-store by vercel.json, and is in no edge cache", () => {
    const rules = (
      JSON.parse(read("vercel.json")) as {
        headers: { source: string; headers: { key: string; value: string }[] }[];
      }
    ).headers.filter((h) => h.source === "/founding/:path*");
    const all = Object.fromEntries(rules.flatMap((r) => r.headers.map((h) => [h.key, h.value])));
    expect(all["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(all["Cache-Control"]).toBe("private, no-store");
    expect(all["Referrer-Policy"]).toBe("no-referrer");
    expect(read("middleware.ts")).not.toContain("/founding");
  });
});

describe("the check on the server", () => {
  const real = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = real;
  });
  const reply = (status: number, body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("a right slug is ok, a wrong or missing one is not_found, and a function that is down is unavailable", async () => {
    const count = { total: 25, left: 3 };
    expect((await readFoundingCount(SLUG, reply(200, count))).status).toBe("ok");
    expect((await readFoundingCount(SLUG, reply(404, { error: "not_found" }))).status).toBe(
      "not_found",
    );
    expect((await readFoundingCount(undefined, reply(200, count))).status).toBe("not_found");
    expect((await readFoundingCount("wrong", reply(200, count))).status).toBe("not_found");
    expect((await readFoundingCount(SLUG, reply(503, { error: "unavailable" }))).status).toBe(
      "unavailable",
    );
  });

  it("the server function the route's loader calls refuses a slug of the wrong shape before asking, and fails closed when the function is down", () => {
    const code = read("src/lib/founding-invite-server.ts");
    expect(code).toContain('isInviteShape(slug) ? slug : ""');
    expect(code).toContain("if (!slug) return { ok: false };");
    expect(code).toContain('if (r.status === "not_found") return { ok: false };');
    // A count that cannot be read means the slug could not be checked: an error page, never "not found" for a real invite.
    expect(code).toContain('throw new Error("founding invite check unavailable")');
  });
});

describe("the function and the database", () => {
  const fn = read("supabase/functions/programs/index.ts");
  it("the count and the application both need the invite, and answer 404 without it", () => {
    expect(fn).toContain('invited(req.headers.get("x-founding-invite"))');
    expect(fn).toContain("invited(body.invite)");
    expect(fn).toMatch(/const notFound = \(\) => json\(\{ error: "not_found" \}, 404, NO_STORE\)/);
    // The invite is checked before the bot check or any application field is read.
    expect(fn.indexOf("invited(body.invite)")).toBeLessThan(
      fn.indexOf('gate(req, body, "founding")'),
    );
    // The count for an invited business is never cached.
    expect(fn).toMatch(/async function foundingCount[^]*?return json\(data, 200, NO_STORE\)/);
  });
  it("one migration makes the setting and the one staff function, with an empty search_path", () => {
    const file = readdirSync("supabase/migrations").find((f) =>
      f.endsWith("_founding1_private_invite.sql"),
    );
    expect(file).toBeTruthy();
    const sql = read(join("supabase/migrations", file!));
    expect(sql).toContain("'founding_invite_slug'");
    expect(sql).toContain("gen_random_bytes(18), 'base64'");
    expect(sql).toContain("on conflict (key) do nothing");
    expect(sql).toContain(
      "create or replace function public.staff_founding_invite(p_rotate boolean default false)",
    );
    expect(sql).toContain("security definer set search_path = ''");
    expect(sql).toContain(
      "if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'",
    );
    expect(sql).toContain(
      "revoke all on function public.staff_founding_invite(boolean) from public, anon;",
    );
    expect(sql).toContain(
      "grant execute on function public.staff_founding_invite(boolean) to authenticated;",
    );
    expect(
      sql
        .split("\n")
        .filter((l) => !l.startsWith("--"))
        .join("\n"),
    ).not.toMatch(/\bdrop\b|truncate|delete from/i);
    // No slug is written into the repository.
    expect(sql).not.toMatch(/'[A-Za-z0-9]{24}'/);
  });
  it("the database tests cover the 24 characters, staff only, and the old slug gone after a rotation", () => {
    const t = read("supabase/tests/founding1_private_invite.sql");
    for (const s of [
      "the slug has 24 characters",
      "an owner cannot rotate it",
      "staff read the current slug",
      "rotating makes a different slug",
      "the old slug is gone",
      "anon cannot read app_settings",
    ])
      expect(t, s).toContain(s);
    expect(read("supabase/tests/_definer_allowlist.psql")).toContain(
      "staff_founding_invite(boolean)",
    );
  });
});

// ─── no public surface names Founding 25 ───────────────────────────────────────────────────────────────────────────────────

/** Founding 25, or its address, in any case. "Founding Partners" (the first 20 partners) is another thing and stays. */
const FOUNDING_25 = /founding[\s-]*25|25[\s-]+founding|(?<!creem)(?<!programs)\/founding(?![\w-])/i;
const files = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p, ext) : ext.test(f) ? [p] : [];
  });

describe("no public surface names Founding 25 or links /founding", () => {
  it("the sitemap, the page list the sitemap is built from and the IndexNow list hold no founding address", async () => {
    const { sitemapXml } = await import("../src/lib/sitemap");
    const xml = sitemapXml([]);
    expect(xml).not.toMatch(/founding/i);
    const pages = JSON.parse(read("src/content/sitemap-pages.json")) as {
      path: string;
      sources: string[];
    }[];
    expect(pages.map((p) => p.path).filter((p) => /founding/i.test(p))).toEqual([]);
    expect(read("src/content/lastmod.json")).not.toMatch(/founding/i);
    // Even a change to the private page's own files tells IndexNow about nothing.
    const urls = changedUrls({
      changedFiles: ["src/routes/founding.$slug.tsx", "src/components/kabsi/d5-founding.tsx"],
      pages,
      guides: {},
      now: new Date("2026-11-10T12:00:00Z"),
    });
    expect(urls).toEqual([]);
  });

  it("every llms file and every public fact names no Founding 25 and no founding address", () => {
    for (const f of [
      "public/llms-full.txt",
      "src/content/llms-base.txt",
      "knowledge/kabsi-facts.md",
      "knowledge/facts/llms.txt",
      ...files("knowledge/facts", /\.md$/).map((p) => p.replaceAll("\\", "/")),
    ])
      expect(read(f), f).not.toMatch(FOUNDING_25);
    // The launch price is the one public name of the 19 and 39 price.
    expect(read("knowledge/kabsi-facts.md")).toMatch(/launch price/i);
    // "There is no public founding offer." is the one public sentence about it (R-151); no price or place is called founding.
    expect(read("knowledge/kabsi-facts.md")).not.toMatch(/founding (price|places?)\b/i);
    expect(read("knowledge/kabsi-facts.md").match(/founding offer/gi) ?? []).toHaveLength(2);
    expect(read("knowledge/kabsi-facts.md")).toContain(
      "There is no public founding offer. A business that was invited should open the link in its invitation.",
    );
  });

  it("no public page, component, library, email builder, share image or script names it", () => {
    const skip = new Set([
      "src/routes/founding.$slug.tsx",
      "src/components/kabsi/d5-founding.tsx",
      "src/components/kabsi/founding-private.ts",
      "src/lib/founding-invite.ts",
      "src/lib/founding-invite-server.ts",
      "src/lib/founding-count.ts",
      "src/routes/api.founding-count.ts",
    ]);
    const publicFiles = [
      ...files("src/routes", /\.tsx?$/).filter(
        (f) => !/_authenticated/.test(f) && !/routeTree/.test(f),
      ),
      ...files("src/components/kabsi", /\.tsx?$/),
      ...files("src/content", /\.(tsx?|json|txt)$/),
      "src/lib/site.ts",
      "src/lib/plans.ts",
      "src/lib/faq.ts",
      "src/lib/llms.ts",
      "src/lib/sitemap.ts",
      "src/lib/edge-cache.ts",
      "middleware.ts",
      "scripts/og.mjs",
      "scripts/routes.json",
    ]
      .map((p) => p.replaceAll("\\", "/"))
      .filter((p) => !skip.has(p));
    const hits: string[] = [];
    for (const f of publicFiles) {
      for (const [i, line] of read(f).split("\n").entries()) {
        // A comment that explains why it left is not a page; every rendered line is checked, so are strings in code.
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)) continue;
        if (FOUNDING_25.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
      }
    }
    expect(hits).toEqual([]);
    expect(existsSync("public/og/founding.png")).toBe(false);
  });

  it("the public email builders and previews for people who are not members never name it", () => {
    // The day 60, 85 and 90 messages go to members of an accepted place and keep their words (programs.ts). Every other kind
    // is for a visitor, an owner or a prospect.
    for (const f of readdirSync("docs/email-previews")) {
      if (!f.endsWith(".html") && !f.endsWith(".txt")) continue;
      if (/^founding_day(60|85|90)\./.test(f)) continue;
      expect(read(join("docs/email-previews", f)), f).not.toMatch(FOUNDING_25);
      expect(read(join("docs/email-previews", f)), f).not.toMatch(/founding price/i);
    }
  });
});

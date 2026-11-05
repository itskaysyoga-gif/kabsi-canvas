// App 5 (master plan 30.33): App 4's audit of the signed-in site (scripts/app4/audit.mjs), with three more checks for the
// 30.32 look: every H1 carries one phrase on the highlight bar, no paragraph runs past 25 words, and no grid leaves one
// card alone in its last row. Everything below is App 4's, unchanged but for those checks and the output folder.
// App 4 part E (master plan 30.31 item 5): the audit of the signed-in site, as Go live 1 audited the public site. Built on
// scripts/app-shots.mjs: a made-up owner (scripts/app-shots/fixtures.mjs) and every route and state in
// scripts/app-shots/routes, with no call to Supabase. For each route, state and width it records: page errors and
// console errors, failed requests and calls with no fixture, sideways scroll, labels cut off, text over text, controls
// covered by the phone bar or another fixed part, links to pages that do not exist, buttons without a name, more than one
// H1, the yellow on screen, axe serious or critical, and the words (dashes, exclamation marks, Arabic, retired names).
// Three extra states per path: loading (Supabase never answers), error (every read answers 500) and ended (every read
// answers 401: the session ends mid-use).
//   BASE=http://127.0.0.1:4173 node scripts/app4/audit.mjs           every route, 360 390 768 1280 1440
//   ONLY=/app/reviews WIDTHS=390 node scripts/app4/audit.mjs          one route, one width
// Writes shots/app4/<name>-<width>.png (gitignored) and shots/app4/findings.json; prints a summary.
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { answer, SESSION, STORAGE_KEY } from "../app-shots/fixtures.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axePath = require.resolve("axe-core/axe.min.js");

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
const OUT = process.env.OUT ?? "shots/app5";
const widths = (process.env.WIDTHS ?? "360,390,768,1280,1440").split(",").map(Number);
const AXE_AT = new Set([390, 1440]);
const SHOT_AT = new Set((process.env.SHOTS ?? "390,1440").split(",").map(Number));
const base = readdirSync("scripts/app-shots/routes")
  .filter((f) => f.endsWith(".json") && !/public|free-check/.test(f))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(`scripts/app-shots/routes/${f}`, "utf8")))
  .filter((r) => /^\/(app|start|staff)/.test(r.path))
  .filter((r) => !process.env.ONLY || r.path.split("?")[0] === process.env.ONLY);
// The three synthetic states, once per path.
const paths = [...new Set(base.map((r) => r.path))];
const extra = process.env.NO_EXTRA
  ? []
  : paths.flatMap((p) =>
      ["loading", "error", "ended"].map((s) => ({
        path: p,
        synthetic: s,
        name: `${p.replace(/^\//, "").replace(/\//g, "_").replace(/[?=&]/g, "-")}-${s}`,
      })),
    );
// SHARD=2/6 runs the second of six parts (the parts run side by side; findings-<n>.json each).
const [shard, shards] = (process.env.SHARD ?? "1/1").split("/").map(Number);
const routes = [...base, ...extra].filter((_, i) => i % shards === shard - 1);
mkdirSync(OUT, { recursive: true });
const browser = await chromium
  .launch()
  .catch(() => chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }));

const findings = [];
/** Calls the fixtures do not answer (answered empty): a gap in the audit's data, not a finding about the site. */
const gaps = new Set();
const links = new Map();
const add = (f) => findings.push(f);

for (const r of routes) {
  for (const w of r.synthetic ? widths.filter((x) => x === 390 || x === 1440) : widths) {
    const context = await browser.newContext({
      viewport: { width: w, height: w <= 390 ? 844 : 900 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      ([k, v]) => {
        try {
          window.localStorage.setItem(k, v);
          window.localStorage.setItem(
            "kabsi_consent",
            JSON.stringify({
              version: "2026-10-25",
              visitor: "audit",
              analytics: false,
              advertising: false,
              at: new Date().toISOString(),
            }),
          );
        } catch {
          /* blocked */
        }
      },
      [STORAGE_KEY, JSON.stringify(SESSION)],
    );
    const missing = new Set();
    await context.route(/supabase\.co\//, async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const read =
        /^\/(rest|functions)\/v1\//.test(u.pathname) && !u.pathname.endsWith("/rpc/is_staff");
      if (r.synthetic === "loading" && read && req.method() !== "OPTIONS") return; // never answered
      if (r.synthetic === "error" && read && req.method() !== "OPTIONS")
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"message":"audit"}',
          headers: { "access-control-allow-origin": "*" },
        });
      if (r.synthetic === "ended" && read && req.method() !== "OPTIONS")
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: '{"message":"JWT expired"}',
          headers: { "access-control-allow-origin": "*" },
        });
      const res = answer(req.method(), req.url(), req.headers(), req.postData(), r.state);
      if (res.missing) missing.add(res.missing);
      if (res.file)
        return route.fulfill({
          status: 200,
          path: res.file,
          headers: { "access-control-allow-origin": "*" },
        });
      await route.fulfill({
        status: res.status ?? 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": "*",
          "access-control-expose-headers": "content-range",
          ...(res.headers ?? {}),
        },
        body: res.body === undefined ? "" : JSON.stringify(res.body),
      });
    });
    await context.route(/challenges\.cloudflare\.com\/turnstile/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: `window.turnstile = { render: (el, o) => { setTimeout(() => o.callback("audit"), 30); return "w"; }, reset: () => {}, remove: () => {}, getResponse: () => "audit" };`,
      }),
    );
    await context.route(/posthog|sentry|googletagmanager|facebook/, (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    const page = await context.newPage();
    const errors = [];
    const consoleErrors = [];
    const failed = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    });
    page.on("requestfailed", (q) => {
      if (q.failure()?.errorText === "net::ERR_ABORTED") return; // a query cancelled on purpose
      if (!/supabase\.co/.test(q.url()) || r.synthetic !== "loading")
        failed.push(`${q.method()} ${q.url().slice(0, 120)} ${q.failure()?.errorText ?? ""}`);
    });
    page.on("response", (s) => {
      if (s.status() >= 400 && !/supabase\.co/.test(s.url()))
        failed.push(`${s.status()} ${s.url().slice(0, 120)}`);
    });
    const id = `${r.path}${r.state ? ` [${r.state}]` : ""}${r.synthetic ? ` [${r.synthetic}]` : ""} @${w}`;
    try {
      await page.goto(BASE + r.path, { waitUntil: "load" });
      await page
        .waitForSelector("main h1, h1", { timeout: r.synthetic ? 4000 : 15_000 })
        .catch(() => undefined);
      await page.waitForTimeout(r.wait ?? (r.synthetic === "error" ? 6000 : 1500));
      if (r.click) {
        await page
          .getByRole("button", { name: r.click })
          .click()
          .catch(() =>
            add({
              id,
              kind: "Links and buttons",
              what: `the route's button "${r.click}" was not found`,
            }),
          );
        await page.waitForTimeout(300);
      }
    } catch (e) {
      add({ id, kind: "Errors", what: `did not load: ${String(e).slice(0, 160)}` });
      await context.close();
      continue;
    }
    const name =
      (r.name ??
        r.path.replace(/^\//, "").replace(/\//g, "_").replace(/[?=&]/g, "-") +
          (r.state ? `-${r.state}` : "")) + "";
    if (SHOT_AT.has(w)) await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });

    for (const e of errors) add({ id, kind: "Errors", what: `page error: ${e.slice(0, 200)}` });
    // A failed load is expected in the error and ended states (the mock answers 500 or 401 on purpose).
    for (const e of [...new Set(consoleErrors)])
      if (!(r.synthetic && /Failed to load resource/.test(e)))
        add({ id, kind: "Console", what: e });
    for (const f of [...new Set(failed)]) add({ id, kind: "Requests", what: f });
    for (const m of missing) gaps.add(m);

    const deep = AXE_AT.has(w);
    const facts = await page.evaluate((deep) => {
      const out = {
        sideways: false,
        cut: [],
        overlap: [],
        covered: [],
        links: [],
        noName: [],
        h1: 0,
        yellow: [],
        words: [],
        gate: false,
        otherTappable: 0,
        unmarked: [],
        long: [],
        lone: [],
      };
      const vis = (el) => {
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0)
          return false;
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      };
      out.sideways = document.documentElement.scrollWidth > window.innerWidth + 1;
      out.h1 = [...document.querySelectorAll("h1")].filter(vis).length;
      // App 5: the highlight bar in each H1, paragraphs of at most 25 words, and no lone card in a grid's last row.
      for (const h of [...document.querySelectorAll("h1")].filter(vis))
        if (!h.querySelector(".d9-mark")) out.unmarked.push(h.textContent.trim().slice(0, 60));
      for (const p of document.querySelectorAll("main p, [role='dialog'] p")) {
        if (!vis(p) || p.closest(".sr-only, [data-long-ok]")) continue;
        const n = (p.innerText || "").trim().split(/\s+/).filter(Boolean).length;
        if (n > 25) out.long.push(`${n} words: ${p.innerText.trim().slice(0, 70)}`);
      }
      for (const g of document.querySelectorAll("main *")) {
        if (!vis(g)) continue;
        const cs = getComputedStyle(g);
        if (cs.display !== "grid") continue;
        const cols = cs.gridTemplateColumns.split(" ").filter(Boolean).length;
        const kids = [...g.children].filter(vis);
        if (cols >= 2 && kids.length > 1 && kids.length % cols === 1)
          out.lone.push(`${kids.length} cards in ${cols} columns: ${(kids[0].textContent || "").trim().slice(0, 40)}`);
      }
      // Cut off: text clipped by its own box.
      for (const el of document.querySelectorAll(
        "button, a, label, h1, h2, h3, p, span, li, td, th, dt, dd",
      )) {
        if (!vis(el) || !el.textContent?.trim()) continue;
        const s = getComputedStyle(el);
        const r0 = el.getBoundingClientRect();
        if (
          r0.width <= 2 ||
          r0.height <= 2 ||
          s.clip === "rect(0px, 0px, 0px, 0px)" ||
          el.closest(".sr-only")
        )
          continue;
        const clips = s.overflowX !== "visible" || s.textOverflow === "ellipsis";
        if (
          clips &&
          el.scrollWidth > el.clientWidth + 2 &&
          el.clientWidth > 0 &&
          !el.closest(
            "[data-allow-truncate], .truncate, [class*='truncate'], [class*='line-clamp'], [class*='overflow-x-auto'], [role='tablist']",
          )
        )
          out.cut.push(el.textContent.trim().slice(0, 60));
      }
      // Text over text: two text leaves whose boxes overlap.
      const leaves = [...document.querySelectorAll("body *")].filter(
        (el) =>
          vis(el) &&
          el.children.length === 0 &&
          el.textContent?.trim() &&
          !el.closest(
            "[aria-hidden='true'], svg, [role='dialog'], [role='alertdialog'], [data-radix-popper-content-wrapper]",
          ),
      );
      const boxes = (deep ? leaves : [])
        .slice(0, 400)
        .map((el) => ({ el, b: el.getBoundingClientRect() }));
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            c = boxes[j];
          if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
          const blk =
            "p, li, dd, dt, h1, h2, h3, h4, button, a, label, td, th, figcaption, blockquote";
          if (a.el.closest(blk) && a.el.closest(blk) === c.el.closest(blk)) continue;
          if (a.el.closest(".sr-only") || c.el.closest(".sr-only")) continue;
          const x = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left);
          const y = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top);
          if (x > 4 && y > 4) {
            const small = Math.min(a.b.width * a.b.height, c.b.width * c.b.height);
            if (x * y > small * 0.3)
              out.overlap.push(
                `${a.el.textContent.trim().slice(0, 30)} / ${c.el.textContent.trim().slice(0, 30)}`,
              );
          }
        }
      // Links and names.
      for (const a of document.querySelectorAll("a[href]")) {
        const h = a.getAttribute("href");
        if (h && h.startsWith("/") && !h.startsWith("//")) out.links.push(h.split("#")[0]);
      }
      for (const b of document.querySelectorAll("button, a[href], [role='button']")) {
        if (!vis(b)) continue;
        const n = (
          b.getAttribute("aria-label") ||
          b.textContent ||
          b.getAttribute("title") ||
          ""
        ).trim();
        if (!n && !b.getAttribute("aria-labelledby")) out.noName.push(b.outerHTML.slice(0, 80));
      }
      // Yellow on screen (kb-yellow, rgb 255 214 10).
      for (const el of document.querySelectorAll("body *")) {
        if (!vis(el)) continue;
        const yb = el.getBoundingClientRect();
        if (yb.bottom + window.scrollY <= 0 || yb.right <= 0) continue;
        if (getComputedStyle(el).backgroundColor === "rgb(255, 214, 10)")
          out.yellow.push(
            `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}`,
          );
      }
      // Words.
      const t = document.body.innerText;
      if (/[\u2013\u2014]/.test(t)) out.words.push("an em or en dash");
      if (t.includes("!"))
        out.words.push(`an exclamation mark: ${(t.match(/.{0,30}!.{0,10}/) || [""])[0]}`);
      if (/[\u0600-\u06FF]/.test(t)) out.words.push("Arabic script");
      for (const n of [
        "Profile Score",
        "Do now",
        "Listing Shield",
        "Put mine back",
        "Results Report",
        "Monday receipt",
        "Weekly Care Report",
        "Monday Report",
      ])
        if (t.includes(n)) out.words.push(`retired name: ${n}`);
      // The session-ended gate: shown, and nothing else can be tapped.
      const gate = document.querySelector(
        "[role='alertdialog'][aria-labelledby='session-ended-title']",
      );
      out.gate = !!gate;
      return out;
    }, deep);
    // Covered controls: walk the page a screen at a time and hit-test each control in view.
    const covered = await page.evaluate(async () => {
      const found = new Set();
      if (
        [...document.querySelectorAll("[role='dialog'], [role='alertdialog']")].some(
          (d) => d.getBoundingClientRect().height > 0,
        )
      )
        return [];
      const H = window.innerHeight;
      const max = Math.max(0, document.documentElement.scrollHeight - H);
      // At the top: the upper 60 percent of the screen. At the very bottom: the lower 40 percent (nothing can scroll
      // further, so a control under the phone bar or Nora there can never be reached).
      for (const [y, lo, hi] of [
        [0, 0, 0.6],
        [max, 0.6, 1],
      ]) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
        for (const el of document.querySelectorAll(
          "main button, main a[href], main input, main select, main textarea",
        )) {
          const b = el.getBoundingClientRect();
          if (b.width < 2 || b.height < 2 || b.top < H * lo || b.bottom > H * hi + 1) continue;
          const s = getComputedStyle(el);
          if (s.visibility === "hidden" || el.closest(".sr-only")) continue;
          const x = b.left + b.width / 2,
            yy = b.top + b.height / 2;
          const hit = document.elementFromPoint(x, yy);
          if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) {
            const fixed = hit.closest("nav, header, [role='dialog'], aside, footer") ?? hit;
            found.add(
              `${(el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30)} under ${fixed.tagName.toLowerCase()}${fixed.getAttribute("aria-label") ? `(${fixed.getAttribute("aria-label")})` : ""}`,
            );
          }
        }
      }
      window.scrollTo(0, 0);
      return [...found];
    });
    if (facts.sideways) add({ id, kind: "Layout", what: "sideways scroll" });
    for (const c of [...new Set(facts.cut)]) add({ id, kind: "Cut off", what: c });
    for (const o of [...new Set(facts.overlap)].slice(0, 5))
      add({ id, kind: "Text over text", what: o });
    if (r.synthetic !== "ended") for (const c of covered) add({ id, kind: "Covered", what: c });
    for (const n of facts.noName) add({ id, kind: "Links and buttons", what: `no name: ${n}` });
    if (facts.h1 !== 1 && r.synthetic !== "ended" && r.synthetic !== "loading")
      add({ id, kind: "Design rules", what: `${facts.h1} H1 on screen` });
    const yellowButtons = facts.yellow.filter((y) => /^(a|button):/.test(y));
    if (yellowButtons.length > 1)
      add({
        id,
        kind: "Design rules",
        what: `${yellowButtons.length} yellow buttons: ${yellowButtons.join(", ")}`,
      });
    for (const x of facts.words) add({ id, kind: "Words", what: x });
    if (r.synthetic !== "ended" && r.synthetic !== "loading")
      for (const x of facts.unmarked) add({ id, kind: "Look", what: `H1 without its phrase: ${x}` });
    for (const x of [...new Set(facts.long)]) add({ id, kind: "Look", what: `long paragraph, ${x}` });
    for (const x of [...new Set(facts.lone)]) add({ id, kind: "Look", what: `lone card, ${x}` });
    if (r.synthetic === "ended" && !facts.gate)
      add({ id, kind: "Session", what: "the session-ended screen did not show after a 401" });
    for (const l of facts.links) links.set(l, (links.get(l) ?? new Set()).add(id));
    if (AXE_AT.has(w)) {
      await page.addScriptTag({ path: axePath });
      const found = await page.evaluate(async () => {
        const res = await window.axe.run(document, { resultTypes: ["violations"] });
        return res.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map(
            (v) => `${v.id} (${v.impact}): ${v.nodes.length} at ${v.nodes[0]?.target?.join(" ")}`,
          );
      });
      for (const f of found) add({ id, kind: "Accessibility", what: f });
    }
    await context.close();
  }
  console.log(
    `done ${r.path}${r.state ? ` (${r.state})` : ""}${r.synthetic ? ` [${r.synthetic}]` : ""}`,
  );
}

// Links: every internal link found, asked once from the server.
for (const [href, where] of links) {
  const res = await fetch(BASE + href, { redirect: "manual" }).catch(() => null);
  const ok = res && res.status < 400;
  let notFound = false;
  if (ok && res.status === 200) {
    const html = await res.text();
    notFound = html.includes("This page is not here.") && !href.startsWith("/staff");
  }
  if (!ok || notFound)
    add({
      id: [...where][0],
      kind: "Broken links",
      what: `${href} answers ${res ? res.status : "nothing"}${notFound ? " (not-found page)" : ""}`,
    });
}
await browser.close();
writeFileSync(`${OUT}/findings-${shard}.json`, JSON.stringify(findings, null, 1));
writeFileSync(`${OUT}/fixture-gaps-${shard}.json`, JSON.stringify([...gaps].sort(), null, 1));
const byKind = {};
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
console.log(`visits done; ${findings.length} findings`);
console.log(byKind);

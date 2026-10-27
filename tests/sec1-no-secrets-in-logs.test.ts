// Sec 1: no tokens, codes, review text, reviewer names, emails or phone numbers in logs, Sentry or PostHog.
// 1. A source scan: every console call and every log() call in the Edge Functions, the Worker and the app is read, and
//    one whose arguments name a sensitive value fails the build unless it is on the reviewed list below.
// 2. The scrubbers themselves: the browser rule (src/lib/scrub.ts), Sentry's beforeSend and PostHog's before_send in the
//    boot script (src/lib/telemetry.ts), and the Edge Functions' rule (supabase/functions/_shared/log-scrub.ts).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isTokenPath, scrubString, scrubUrl } from "../src/lib/scrub";
import { describeError } from "../src/lib/error-capture";
import { telemetryHeadScripts } from "../src/lib/telemetry";
import { scrubFields, scrubText } from "../supabase/functions/_shared/log-scrub";

const ROOTS = ["supabase/functions", "workers", "src"];
const EXT = /\.(ts|tsx|js|mjs)$/;
const SKIP = /(\.test\.|_test\.|\/node_modules\/|routeTree\.gen\.ts$)/;

// A call that writes to a log: console.*, the Edge Functions' log(fn, fields) and the d.log / log: wrappers around it.
const CALL = /(?:\bconsole\.(?:log|error|warn|info|debug)|(?<![.\w])log|\bd\.log)\s*\(/g;
// Names that must never be an argument of a log call.
const FORBIDDEN =
  /\b(token|tokens|code|otp|phone|phones|email|emails|to_address|comment|reviewer_name|reviewer|review_text|body|payload|authorization|bearer|api_?key|apiKey|secret|password|text)\b/i;

// Reviewed and safe. Each entry: the file, a piece of the call's argument text, and why it may stay.
const ALLOWED: Array<{ file: string; has: string; why: string }> = [
  {
    file: "supabase/functions/visibility/index.ts",
    has: "has_email: !!c.value.email, has_phone: !!c.value.phone",
    why: "booleans only: whether an email or a phone was given, never the value",
  },
  {
    file: "supabase/functions/kv-sync/index.ts",
    has: "code, action: card",
    why: "a card's six-character code is printed on the card and its QR code; it is not a credential",
  },
  {
    file: "supabase/functions/tap/index.ts",
    has: "code, source, country",
    why: "the same public card code as kv-sync",
  },
  {
    file: "src/server.ts",
    has: "h3 swallowed SSR error: ${body}",
    why: 'the body is h3\'s fixed {"unhandled":true,"message":"HTTPError"}, and console.error is scrubbed (error-capture.ts)',
  },
];

function files(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(files(p));
    else if (EXT.test(p) && !SKIP.test(p)) out.push(p);
  }
  return out;
}

// The text between the call's parentheses (strings with unbalanced parentheses are rare enough to ignore).
function argsAt(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) return src.slice(open + 1, i);
  }
  return src.slice(open + 1);
}

type Hit = { file: string; line: number; args: string };
function logCalls(): Hit[] {
  const hits: Hit[] = [];
  for (const root of ROOTS) {
    for (const file of files(root)) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(CALL)) {
        const at = m.index ?? 0;
        const lineStart = src.lastIndexOf("\n", at) + 1;
        const before = src.slice(lineStart, at);
        if (before.includes("//") || /^\s*\*/.test(before)) continue; // a comment
        if (/function\s+$/.test(before)) continue; // the definition of log() itself
        const args = argsAt(src, at + m[0].length - 1);
        hits.push({
          file: file.replace(/\\/g, "/"),
          line: src.slice(0, at).split("\n").length,
          args,
        });
      }
    }
  }
  return hits;
}

describe("Sec 1: log calls never carry a secret", () => {
  const calls = logCalls();

  it("finds the log calls (the scan works)", () => {
    expect(calls.length).toBeGreaterThan(30);
    expect(calls.some((c) => c.file.endsWith("_shared/kabsi.ts"))).toBe(true);
  });

  it("no log call names a token, code, phone, email, review text, key or secret outside the reviewed list", () => {
    const bad = calls
      // A reviewed piece is taken out of the call before the check, so anything added next to it is still caught.
      .filter((c) => {
        const rest = ALLOWED.filter((a) => a.file === c.file).reduce(
          (s, a) => s.split(a.has).join(" "),
          c.args,
        );
        return FORBIDDEN.test(rest.replace(/"[^"]*"/g, '""'));
      })
      .map((c) => `${c.file}:${c.line}: ${c.args.replace(/\s+/g, " ").slice(0, 140)}`);
    expect(bad).toEqual([]);
  });

  it("every reviewed exception still exists (a stale entry is removed, not kept)", () => {
    for (const a of ALLOWED) {
      expect(
        calls.some((c) => c.file === a.file && c.args.includes(a.has)),
        `${a.file}: ${a.has}`,
      ).toBe(true);
    }
  });

  it("the Edge Functions' log() scrubs its fields and the rate limiter logs only the key's kind", () => {
    const src = readFileSync("supabase/functions/_shared/kabsi.ts", "utf8");
    expect(src).toContain(
      "console.log(JSON.stringify({ fn, ...(scrub(fields) as Record<string, unknown>) }));",
    );
    expect(src).toContain('key: key.split(":")[0]');
    // Direct console calls in the Edge Functions: log() itself, and the model fallback note (model names and a status).
    const src2 = calls.filter(
      (c) => c.file.startsWith("supabase/") && /^\s*JSON\.stringify/.test(c.args),
    );
    expect(src2.map((c) => c.file).sort()).toEqual([
      "supabase/functions/_shared/ai/client.ts",
      "supabase/functions/_shared/kabsi.ts",
    ]);
  });

  it("a model's text never rides in an error message", () => {
    const src = readFileSync("supabase/functions/_shared/ai/client.ts", "utf8");
    expect(src).not.toMatch(/no JSON: \$\{text/);
  });
});

describe("Sec 1: the browser rule (src/lib/scrub.ts)", () => {
  it("replaces the credential in every link that carries one", () => {
    const cases: Array<[string, string]> = [
      ["https://kabsi.co/a/abcDEF123_-xyz", "https://kabsi.co/a/:token"],
      ["https://kabsi.co/h/tok123?a=closed", "https://kabsi.co/h/:token?a=closed"],
      ["/u/tok456", "/u/:token"],
      ["/activate/K7P2QX", "/activate/:token"],
      ["/scan/KAB-12345678", "/scan/:token"],
      ["/review/K7P2QX", "/review/:token"],
      ["/start/resume/ABC123", "/start/resume/:token"],
      ["https://kabsi.co/unsubscribe?t=eyJhbGciOi.x.y", "https://kabsi.co/unsubscribe?t=redacted"],
      [
        "https://x.supabase.co/functions/v1/api/action?t=secret1&go=1",
        "https://x.supabase.co/functions/v1/api/action?t=redacted&go=1",
      ],
      ["/start?code=K7P2QX&new=1", "/start?code=redacted&new=1"],
      [
        "/login#access_token=aaa.bbb.ccc&refresh_token=rrr&type=bearer",
        "/login#access_token=redacted&refresh_token=redacted&type=bearer",
      ],
    ];
    for (const [input, want] of cases) expect(scrubUrl(input)).toBe(want);
  });

  it("leaves ordinary pages alone", () => {
    for (const keep of [
      "https://kabsi.co/pricing",
      "/app/reviews?filter=new",
      "/guides/reply-to-reviews",
      "/scan",
      "/for/dentists",
    ]) {
      expect(scrubUrl(keep)).toBe(keep);
    }
  });

  it("scrubString does tokens, emails and phones together", () => {
    expect(scrubString("Failed /a/tok1 for owner@example.com, +961 70 123 456")).toBe(
      "Failed /a/:token for [email], [phone]",
    );
  });

  it("session replay is off on every page whose address holds a credential", () => {
    for (const p of [
      "/a/x",
      "/h/x",
      "/u/x",
      "/activate/x",
      "/scan/KAB-1",
      "/review/ABC",
      "/start/resume/x",
      "/unsubscribe",
    ]) {
      expect(isTokenPath(p), p).toBe(true);
    }
    for (const p of ["/", "/pricing", "/scan", "/reviews", "/app"])
      expect(isTokenPath(p), p).toBe(false);
    const src = readFileSync("src/lib/telemetry.ts", "utf8");
    expect(src).toContain("isPrivatePath(path) || isTokenPath(path) || !analyticsPersistent()");
  });

  it("server error logs are scrubbed too (error-capture.ts)", () => {
    const e = new Error("fetch failed for https://kabsi.co/a/tok999?t=abc owner@example.com");
    const out = describeError(e);
    expect(out).not.toContain("tok999");
    expect(out).not.toContain("t=abc");
    expect(out).not.toContain("owner@example.com");
  });
});

// Runs the inline boot script with stand-ins for window, Sentry and PostHog, and returns the two hooks it installs.
function bootHooks() {
  const boot = String((telemetryHeadScripts[0] as { children: string }).children);
  let sentryOptions: Record<string, unknown> = {};
  let posthogOptions: Record<string, unknown> = {};
  const win: Record<string, unknown> = {};
  const Sentry = { init: (o: Record<string, unknown>) => (sentryOptions = o) };
  const posthog = {
    __SV: 1,
    init: (_k: string, o: Record<string, unknown>) => (posthogOptions = o),
  };
  win.posthog = posthog;
  const location = { hostname: "kabsi.co", origin: "https://kabsi.co" };
  new Function("window", "location", "Sentry", "posthog", "document", boot)(
    win,
    location,
    Sentry,
    posthog,
    {},
  );
  (win.sentryOnLoad as () => void)();
  (win.__kabsiStartAnalytics as () => void)();
  return {
    sentry: sentryOptions,
    beforeSend: sentryOptions.beforeSend as (e: Record<string, unknown>) => Record<string, unknown>,
    beforeSendPosthog: posthogOptions.before_send as (
      e: Record<string, unknown>,
    ) => Record<string, unknown>,
    posthog: posthogOptions,
  };
}

describe("Sec 1: Sentry beforeSend in the boot script", () => {
  const { sentry, beforeSend } = bootHooks();

  it("sends no personal data and records no replay", () => {
    expect(sentry.sendDefaultPii).toBe(false);
    expect(sentry.replaysSessionSampleRate).toBe(0);
    expect(sentry.replaysOnErrorSampleRate).toBe(0);
  });

  it("scrubs tokens from the page address, the query, breadcrumbs, the transaction and the message", () => {
    const event = beforeSend({
      user: { id: "u1", email: "owner@example.com", ip_address: "1.2.3.4" },
      transaction: "/h/holidaytoken",
      request: {
        url: "https://kabsi.co/a/actiontoken?x=1",
        query_string: "t=abc",
        headers: { Referer: "https://kabsi.co/u/phototoken", "X-Forwarded-For": "1.2.3.4" },
        cookies: { a: "b" },
      },
      message: "Could not open /activate/CODE12 for sam@example.com",
      exception: {
        values: [{ value: "GET /functions/v1/api/action?t=tok777 failed, call +15550100101" }],
      },
      breadcrumbs: [
        { category: "navigation", data: { from: "/review/ABC123", to: "/start/resume/RES999" } },
        {
          category: "fetch",
          data: { url: "https://x.supabase.co/functions/v1/email/unsubscribe?t=unsubtok" },
        },
        {
          category: "console",
          message: "draft for owner@example.com",
          data: { arguments: ["The waiter was rude"] },
        },
      ],
      extra: { comment: "The waiter was rude", note: "ring 96170123456", where: "/scan/KAB-1234" },
    });
    const text = JSON.stringify(event);
    for (const secret of [
      "actiontoken",
      "holidaytoken",
      "phototoken",
      "CODE12",
      "tok777",
      "ABC123",
      "RES999",
      "unsubtok",
      "KAB-1234",
      "owner@example.com",
      "sam@example.com",
      "15550100101",
      "96170123456",
      "The waiter was rude",
      "1.2.3.4",
      "t=abc",
    ]) {
      expect(text, secret).not.toContain(secret);
    }
    expect((event.user as { id: string }).id).toBe("u1");
  });
});

describe("Sec 1: PostHog before_send in the boot script", () => {
  const { posthog, beforeSendPosthog } = bootHooks();

  it("captures no clicks or input values, and masks inputs in a replay", () => {
    expect(posthog.autocapture).toBe(false);
    expect((posthog.session_recording as { maskAllInputs: boolean }).maskAllInputs).toBe(true);
    expect(posthog.disable_session_recording).toBe(true);
  });

  it("scrubs tokens from every URL property and from person properties, and keeps ids intact", () => {
    const e = beforeSendPosthog({
      event: "$pageview",
      properties: {
        $current_url: "https://kabsi.co/a/actiontoken",
        $pathname: "/h/holidaytoken",
        $referrer: "https://kabsi.co/unsubscribe?t=unsubtok",
        $prev_pageview_pathname: "/u/phototoken",
        $session_entry_url: "https://kabsi.co/start?code=K7P2QX",
        distinct_id: "3f1d2c4b-5a6e-4f70-8a9b-012345678901",
        token: "phc_public",
        comment: "The waiter was rude",
        note: "ring 96170123456",
      },
      $set: { email: "owner@example.com", $current_url: "https://kabsi.co/review/ABC123" },
      $set_once: {
        $initial_current_url: "https://kabsi.co/activate/CODE12",
        $initial_pathname: "/scan/KAB-1234",
      },
    });
    const text = JSON.stringify(e);
    for (const secret of [
      "actiontoken",
      "holidaytoken",
      "unsubtok",
      "phototoken",
      "K7P2QX",
      "The waiter was rude",
      "96170123456",
      "owner@example.com",
      "ABC123",
      "CODE12",
      "KAB-1234",
    ]) {
      expect(text, secret).not.toContain(secret);
    }
    const props = e.properties as Record<string, string>;
    expect(props.distinct_id).toBe("3f1d2c4b-5a6e-4f70-8a9b-012345678901");
    expect(props.token).toBe("phc_public");
    expect(props.$current_url).toBe("https://kabsi.co/a/:token");
  });
});

describe("Sec 1: the Edge Functions' rule (log-scrub.ts)", () => {
  it("drops sensitive keys and scrubs emails, phones and query tokens in every other field", () => {
    const out = scrubFields({
      ok: false,
      token: "abc",
      comment: "The waiter was rude",
      to: "+96170123456",
      access_token: "ya29.x",
      key: "authcode",
      err: "fetch https://x.co/api/action?t=tok777&go=1 for owner@example.com, 96170123456",
      nested: { reviewer_name: "Sam", note: "call +1 555 010 0101" },
      count: 1234567890123,
    }) as Record<string, unknown>;
    const text = JSON.stringify(out);
    for (const secret of [
      "abc",
      "The waiter was rude",
      "96170123456",
      "ya29",
      "tok777",
      "owner@example.com",
      "Sam",
      "555 010",
    ]) {
      expect(text, secret).not.toContain(secret);
    }
    expect(out.key).toBe("authcode");
    expect(out.count).toBe(1234567890123);
  });

  it("scrubText keeps dates, ids and short numbers readable", () => {
    const keep =
      "Job 42 failed at 2026-10-25T10:00:00Z for 3f1d2c4b-5a6e-4f70-8a9b-0c1d2e3f4a5b, status 503";
    expect(scrubText(keep)).toBe(keep);
  });
});

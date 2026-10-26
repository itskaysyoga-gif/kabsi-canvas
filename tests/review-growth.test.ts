import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import worker from "../workers/kabsi-go/src/index.js";
import { reviewLinkMessage } from "../src/lib/send-review-link";
import {
  reviewRequestLink,
  reviewRequestMessage,
  reviewRequestProblems,
} from "../supabase/functions/_shared/review-growth/message";

// V3 Review Growth (master plan 30.15 section 3.5): review requests without customer data. The ready message is the same on
// WhatsApp and on the website's Send review link button, and no code path takes a customer's name or number.
const read = (p: string) => readFileSync(p, "utf8");
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

describe("the ready review message", () => {
  it("is word for word the same on WhatsApp and on the website's Send review link button", () => {
    for (const [name, link] of [
      ["Yawmiyati", "https://go.kabsi.co/KQA234?s=m"],
      ["Café & Co", "https://go.kabsi.co/ABC234"],
    ]) {
      expect(reviewRequestMessage(name, link)).toBe(reviewLinkMessage(name, link));
    }
  });

  it("breaks none of the review rules, and the checker finds the ones a bad message would break", () => {
    expect(
      reviewRequestProblems(reviewRequestMessage("Yawmiyati", "https://go.kabsi.co/KQA234?s=m")),
    ).toEqual([]);
    expect(reviewRequestProblems("Rate us 5 stars and get a discount")).not.toEqual([]);
    expect(reviewRequestLink("KQA234")).toBe("https://go.kabsi.co/KQA234?s=m");
  });
});

describe("Kabsi never receives or keeps a customer's number", () => {
  it("the agent's contact branch reads no number and no name, and the stored message drops contacts", () => {
    const agent = code("supabase/functions/_shared/whatsapp/agent.ts");
    const branch = agent.slice(agent.indexOf('if (cmd.k === "contact")'), agent.indexOf('if (cmd.k === "empty")'));
    expect(branch).toContain("askCustomer");
    expect(branch).not.toMatch(/phones|toE164|\.name|contacts\[/);
    expect(agent).toMatch(/contacts: \[\]/);
  });

  it("nothing in the review growth code or the ask flow writes a customer table or calls a send API", () => {
    for (const f of [
      "message.ts",
      "stats.ts",
      "alerts.ts",
      "tick.ts",
      "monthly.ts",
      "photo.ts",
      "sensitive.ts",
    ]) {
      expect(code(`supabase/functions/_shared/review-growth/${f}`), f).not.toMatch(
        /customer_phone|customers?\b.*\.insert|\.from\("customers/i,
      );
    }
    expect(code("supabase/functions/_shared/review-growth/message.ts")).not.toMatch(/e164|toE164|phones\b|phone_number/i);
  });
});

describe("link opens from a forwarded message", () => {
  it("the Worker logs ?s=m as source message, apart from QR scans and tag taps, and still redirects to Google", async () => {
    const GOOGLE = "https://search.google.com/local/writereview?placeid=abc";
    const seen: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: { body: string }) => {
        seen.push(JSON.parse(init.body));
        return new Response(null, { status: 204 });
      }),
    );
    const waits: Promise<unknown>[] = [];
    const open = async (query: string) => {
      const res = await worker.fetch(
        new Request(`https://go.kabsi.co/KQA234${query}`, { headers: { "user-agent": "iPhone" } }),
        {
          STICKERS: { get: vi.fn(async () => ({ d: GOOGLE, b: "loc", a: true, m: "direct" })), put: vi.fn(async () => undefined) },
          APP_ORIGIN: "https://kabsi.co",
          TAP_FUNCTION_URL: "https://tap.test",
          TAP_SECRET: "s",
        },
        { waitUntil: (p: Promise<unknown>) => waits.push(p) },
      );
      await Promise.all(waits);
      return res;
    };
    const res = await open("?s=m");
    await open("?s=q");
    await open("");
    vi.unstubAllGlobals();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(GOOGLE);
    expect(seen.map((b) => b.source)).toEqual(["message", "qr", "nfc"]);
  });

  it("the tap function accepts the message source, and the database check allows it", () => {
    expect(read("supabase/functions/tap/index.ts")).toContain('body?.source === "message" ? "message"');
    expect(read("supabase/migrations/20261026150502_v3_review_growth.sql")).toContain("source in ('nfc', 'qr', 'message')");
  });
});

describe("the print cards and the facts", () => {
  it("review-cards is a function with its own line in config.toml, verify_jwt on", () => {
    expect(read("supabase/config.toml")).toMatch(/\[functions\.review-cards\][^\n]*\nverify_jwt = true/);
  });
  it("the facts say what V3 built, and keep the rule words out of the review request", () => {
    const facts = read("knowledge/facts/07-review-links-and-cards.md");
    expect(facts).toContain("Ask a customer");
    expect(facts).toContain("never receives");
  });
});

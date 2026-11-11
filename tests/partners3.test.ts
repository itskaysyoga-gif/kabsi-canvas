import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PARTNER_KIND_OPTIONS, partnerLink } from "../src/lib/partner";
import {
  CAN_SAY,
  DO_NOT_SAY,
  KIT,
  KIT_NOTICE,
  KIT_POSTS,
  PAID_LABEL,
  postText,
} from "../src/lib/partner-kit";
import { disclosure, INSERT, insertPdf, insertShapes, shortLink } from "../src/lib/partner-insert";
import { A6, type Shape } from "../src/lib/qr-card";
import { PLAN_PRICES } from "../src/lib/site";
import {
  PARTNER_PAYING_LINE,
  partnerFirstPaymentEmail,
  partnerJoinedEmail,
  partnerPayoutEmail,
  partnerTrialEmail,
} from "../supabase/functions/_shared/email/partner-copy";
import { type Events, planNotices } from "../supabase/functions/_shared/partner-plan";
import { BANG, DASHES, NEVER_CLAIMS, NEVER_NAMES } from "./helpers/house-rules";

// Partners 3 (master plan 30.50 items 5 to 7; docs/COPY.md section 83): the final partners page, the kit in the partner
// home (posts, the A6 insert, the do not say list) and the four partner emails.
const read = (f: string) => readFileSync(f, "utf8");
const ARABIC = /[؀-ۿ]/;
/** Claims no partner post may make (K-53, K-144): a rank, the 3-pack, a review count, a star figure, a Google partnership. */
const RANKING = /\brank|top 3|3-pack|top results|\b\d[\d,]* (reviews|stars|calls|customers)\b|google partner|approved by google|partner of google/i;
const LINK = partnerLink("P-AB23CD");

describe("the kit: ready posts", () => {
  it("has three posts for each of the six kinds, in the join form's kinds", () => {
    expect(Object.keys(KIT_POSTS).sort()).toEqual(PARTNER_KIND_OPTIONS.map(([k]) => k).sort());
    for (const [k, posts] of Object.entries(KIT_POSTS)) expect(posts.length, k).toBe(3);
  });
  it("starts every post with the paid partnership label and ends with the partner's link", () => {
    for (const posts of Object.values(KIT_POSTS))
      for (const body of posts) {
        const t = postText(body, LINK);
        expect(t.startsWith(`${PAID_LABEL}\n\n`)).toBe(true);
        expect(t.endsWith(`\n\n${LINK}`)).toBe(true);
      }
  });
  it("uses only allowed claims: no ranking, no count, no statistic, no Google partnership", () => {
    for (const [k, posts] of Object.entries(KIT_POSTS))
      for (const body of posts) {
        expect(body, k).not.toMatch(RANKING);
        expect(body, k).not.toMatch(NEVER_CLAIMS);
        expect(body, k).not.toMatch(NEVER_NAMES);
        expect(body, k).not.toMatch(DASHES);
        expect(body, k).not.toMatch(BANG);
        expect(body, k).not.toMatch(ARABIC);
        expect(body, k).not.toMatch(/\bpercent\b|%/); // earnings are never quoted in a post
        // The only number a post states is the trial, 30 days.
        expect([...body.matchAll(/\d+/g)].map((m) => m[0]).every((n) => n === "30"), body).toBe(true);
        // Nothing promised for a review, and no reward.
        expect(body).not.toMatch(/\b(discount|cashback|reward|prize|gift)\b/i);
      }
  });
  it("keeps nothing goes live without a yes wherever a post says Kabsi puts something on Google", () => {
    for (const posts of Object.values(KIT_POSTS))
      for (const body of posts)
        if (/\bon Google\b/.test(body) && /\b(nothing|only|before|until|without)\b/i.test(body))
          expect(body).toMatch(/\b(yes|approve)/i);
  });
});

describe("the kit: say and do not say", () => {
  it("lists what a partner must never say, each line starting with Never", () => {
    expect(DO_NOT_SAY.length).toBeGreaterThanOrEqual(10);
    for (const l of DO_NOT_SAY) {
      expect(l.startsWith("Never ")).toBe(true);
      expect(l).not.toMatch(DASHES);
      expect(l).not.toMatch(BANG);
    }
    const all = DO_NOT_SAY.join(" ");
    for (const must of [/works with Google/, /ranked higher/, /review count/, /removed/, /happy customers/, /by itself/, /suspension/, /logo/, /bulk or unsolicited/, /earns/])
      expect(all).toMatch(must);
  });
  it("lists only claims Kabsi allows (K-53) and none of the banned ones", () => {
    for (const l of CAN_SAY) {
      expect(l).not.toMatch(RANKING);
      expect(l).not.toMatch(NEVER_CLAIMS);
      expect(l).not.toMatch(DASHES);
    }
    expect(CAN_SAY).toContain("Respond to reviews faster.");
    expect(CAN_SAY).toContain("Keep your Google information accurate.");
    expect(KIT_NOTICE).toBe("Kabsi is independent and not affiliated with Google.");
  });
});

describe("the kit: the A6 insert", () => {
  const texts = (s: Shape[]) => s.flatMap((x) => (x.kind === "text" ? [x] : []));
  const shapes = insertShapes("Sara Khan", LINK);
  it("says the card line, 30 days free, the partner's link and the disclosure, and keeps inside the page", () => {
    const all = texts(shapes).map((t) => t.text);
    expect(all).toContain("The card gets the reviews.");
    expect(all).toContain("Kabsi answers them.");
    expect(all).toContain(INSERT.big);
    expect(INSERT.big).toBe("30 days free");
    expect(all.join(" ")).toContain(shortLink(LINK));
    expect(all).toContain("Paid partnership. Sara Khan is a Kabsi Partner.");
    expect(all).toContain(INSERT.notAffiliated);
    for (const t of texts(shapes)) {
      expect(t.x - t.width / 2, t.text).toBeGreaterThanOrEqual(8);
      expect(t.x + t.width / 2, t.text).toBeLessThanOrEqual(A6.w - 8);
      expect(t.y, t.text).toBeLessThanOrEqual(A6.h - 8);
    }
    for (const s of shapes) {
      if (s.kind === "rect") {
        expect(s.x + s.w).toBeLessThanOrEqual(A6.w + 0.01);
        expect(s.y + s.h).toBeLessThanOrEqual(A6.h + 0.01);
      } else if (s.kind === "circle") {
        expect(s.cy + s.r).toBeLessThanOrEqual(A6.h);
      }
    }
    expect(shapes.filter((s) => s.kind === "circle").length).toBeGreaterThan(100); // the QR code
  });
  it("makes no claim and shows no Google logo; Google appears only as plain words", () => {
    const all = texts(shapes).map((t) => t.text).join(" ");
    expect(all).not.toMatch(RANKING);
    expect(all).not.toMatch(DASHES);
    expect(all).not.toMatch(BANG);
    for (const m of all.matchAll(/Google/g)) {
      const around = all.slice(Math.max(0, m.index! - 30), m.index! + 20);
      expect(around).toMatch(/Google review|affiliated with Google/);
    }
    expect(read("src/lib/partner-insert.ts")).not.toMatch(/google-g|brand\/google|logo\.svg/i);
  });
  it("prints a name only in letters the card can hold, and falls back to a Kabsi Partner", () => {
    expect(disclosure("Sara Khan")).toBe("Paid partnership. Sara Khan is a Kabsi Partner.");
    expect(disclosure("سارة")).toBe("Paid partnership. Shared by a Kabsi Partner.");
    expect(disclosure("")).toBe("Paid partnership. Shared by a Kabsi Partner.");
    expect(disclosure("A".repeat(60))).toContain(`${"A".repeat(24)} is a`); // a long name is cut at 24 letters, so the line fits
  });
  it("is a one page A6 PDF with Latin-1 text", () => {
    const bytes = insertPdf(shapes);
    const head = new TextDecoder("latin1").decode(bytes.slice(0, 8));
    expect(head.startsWith("%PDF-1.4")).toBe(true);
    const pdf = new TextDecoder("latin1").decode(bytes);
    expect(pdf).toContain(`/MediaBox [0 0 ${A6.w} ${A6.h}]`);
    expect(pdf).toContain("(30 days free)");
  });
});

describe("the four partner emails", () => {
  const APP = "https://kabsi.co";
  const mails = {
    joined: partnerJoinedEmail({ name: "Sara Khan", code: "P-AB23CD" }, APP),
    started: partnerTrialEmail({ trade: "Hair salon", area: "Dubai Marina" }, APP),
    payment: partnerFirstPaymentEmail({ cents: 1475 }, APP),
    payout: partnerPayoutEmail(
      { cents: 5400, method: "paypal", last4: "1234", month: "2026-12", sentAt: "2026-12-05T10:00:00Z", lines: [{ earned_at: "2026-11-02T09:00:00Z", trade: "Cafe", area: "Leeds", commission_cents: 5400 }] },
      APP,
    ),
  };
  it("each has one button, a preview line and a plain-text part", () => {
    for (const [k, m] of Object.entries(mails)) {
      expect(m.button?.label, k).toBeTruthy();
      expect(m.button?.url.startsWith(`${APP}/partner`), k).toBe(true);
      expect(m.preheader.length, k).toBeGreaterThan(0);
      expect(m.text.length, k).toBeGreaterThan(40);
      expect(m.text, k).not.toMatch(/<[a-z][^>]*>/i);
    }
  });
  it("keeps the house rules: no dashes, no exclamation marks, no Arabic, no banned claim", () => {
    for (const [k, m] of Object.entries(mails)) {
      const all = `${m.subject}\n${m.preheader}\n${m.title}\n${m.text}`;
      expect(all, k).not.toMatch(DASHES);
      expect(all, k).not.toMatch(BANG);
      expect(all, k).not.toMatch(ARABIC);
      expect(all, k).not.toMatch(RANKING);
      expect(all, k).not.toMatch(NEVER_CLAIMS);
      expect(all, k).not.toMatch(NEVER_NAMES);
    }
  });
  it("says what each one is for", () => {
    expect(mails.joined.text).toContain(partnerLink("P-AB23CD"));
    expect(mails.joined.button?.url).toBe(`${APP}/partner#kit`);
    expect(mails.joined.text).toContain("A6 insert");
    expect(mails.joined.text).toContain(PARTNER_PAYING_LINE);
    expect(mails.started.text).toContain("Hair salon, Dubai Marina");
    expect(mails.started.text).toContain("never the business's name");
    expect(mails.started.text).toContain("A trial earns nothing");
    expect(mails.payment.subject).toContain("$14.75");
    expect(mails.payment.text).toContain("30 day hold");
    expect(mails.payout.subject).toBe("Your Kabsi payout of $54.00 was sent");
    expect(mails.payout.text).toContain("PayPal ending in 1234");
    expect(mails.payout.text).toContain("Cafe, Leeds: $54.00");
  });
  it("shows a refund line as minus", () => {
    const m = partnerPayoutEmail({ cents: 2500, method: "usdc", last4: "ab12", month: "2026-12", sentAt: "2026-12-05T10:00:00Z", lines: [{ trade: null, area: null, commission_cents: -975 }] }, APP);
    expect(m.text).toContain("A business: refund, minus $9.75");
    expect(m.text).toContain("USDC ending in ab12");
  });
});

describe("which emails the events call for", () => {
  const P = { email: "sara@example.test", user_id: "u1", status: "approved", payout_last4: "1234" };
  const none: Events = { trials: [], payments: [], payouts: [] };
  it("sends the first trial once per partner, however many started", () => {
    const n = planNotices({ ...none, trials: [
      { partner_id: "p1", partner: P, trade: "Cafe", area: "Leeds", started_at: "2026-12-02T10:00:00Z" },
      { partner_id: "p1", partner: P, trade: "Hair salon", area: "Bristol", started_at: "2026-12-01T10:00:00Z" },
      { partner_id: "p2", partner: { ...P, email: "b@example.test" }, trade: null, area: null, started_at: "2026-12-01T10:00:00Z" },
    ] }, "https://kabsi.co");
    expect(n.map((x) => x.key)).toEqual(["partner_referral_started:p1", "partner_referral_started:p2"]);
    expect(n[0]!.content.text).toContain("Hair salon, Bristol"); // the earliest
    expect(n[0]!.to).toEqual({ email: "sara@example.test", userId: "u1" });
  });
  it("sends the first payment only when the partner had no earlier commission, and not to a paused partner", () => {
    const base = { partner_id: "p1", partner: P, cents: 1475, earned_at: "2026-11-02T09:00:00Z", hold_until: "2026-12-02T09:00:00Z", hadEarlier: false };
    expect(planNotices({ ...none, payments: [base] }, "https://kabsi.co").map((x) => x.key)).toEqual(["partner_first_payment:p1"]);
    expect(planNotices({ ...none, payments: [{ ...base, hadEarlier: true }] }, "https://kabsi.co")).toEqual([]);
    expect(planNotices({ ...none, payments: [{ ...base, partner: { ...P, status: "paused" } }] }, "https://kabsi.co")).toEqual([]);
    expect(planNotices({ ...none, trials: [{ partner_id: "p1", partner: { ...P, status: "left" }, trade: null, area: null, started_at: "2026-12-01T10:00:00Z" }] }, "https://kabsi.co")).toEqual([]);
  });
  it("sends one email per payout sent, keyed by the payout", () => {
    const n = planNotices({ ...none, payouts: [
      { id: "o1", partner: P, cents: 5400, method: "paypal", month: "2026-12", sent_at: "2026-12-05T10:00:00Z", lines: [] },
      { id: "o2", partner: P, cents: 3000, method: "paypal", month: "2027-01", sent_at: "2027-01-05T10:00:00Z", lines: [] },
    ] }, "https://kabsi.co");
    expect(n.map((x) => x.key)).toEqual(["partner_payout_sent:o1", "partner_payout_sent:o2"]);
    expect(n[0]!.content.text).toContain("PayPal ending in 1234");
  });
});

describe("the partners page", () => {
  const page = read("src/components/kabsi/d2-partners.tsx");
  it("opens with the card line, then three steps, six kinds, the example, five rules, questions and the count", () => {
    const order = ['id="p-steps"', 'id="p-suits"', 'id="p-money"', 'id="p-rules"', 'id="p-faq"', 'id="p-join"'].map((s) => page.indexOf(s));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(read("src/components/kabsi/hero-lines.ts")).toContain("The card gets the reviews. Kabsi answers them.");
    expect(page.match(/title: "(Join in two minutes|Share your link or put it on your cards|Get paid every month)"/g)?.length).toBe(3);
    expect(page).toContain("usePartnerPlaces()");
    expect(page).toContain("places left.");
    expect(page).toContain("SectionPhoto");
  });
  it("has six kinds of partner and five rules", async () => {
    const m = await import("../src/components/kabsi/d2-partners");
    expect(m.PARTNER_RULES.length).toBe(5);
    expect(page.match(/^\s+\[\s*\n\s+(Nfc|Globe|Video|Briefcase|Store|Users),/gm)?.length).toBe(6);
    for (const r of m.PARTNER_RULES) {
      expect(r).not.toMatch(DASHES);
      expect(r).not.toMatch(BANG);
    }
    expect(m.PARTNER_RULES.join(" ")).toMatch(/paid partnership/);
    expect(m.PARTNER_RULES.join(" ")).toMatch(/happy customers/);
  });
  it("has one primary button, Join in two minutes, to /partners/join", () => {
    expect(page.match(/<ButtonLink to="\/partners\/join">/g)?.length).toBe(1); // the one JoinButton, used in the hero and the foot
    expect(page).toContain("Join in two minutes");
    expect(page).not.toContain("Join Kabsi Partners");
    expect(page.match(/<JoinButton/g)?.length).toBe(2);
    expect(read("src/lib/partner.ts")).toContain('joinLink: "Join in two minutes"');
  });
  it("labels the earnings example and works it out on the list price", () => {
    expect(page).toContain("On the list price");
    expect(page).toContain("<ExampleBadge />");
    expect(page).toContain("PLAN_PRICES.essentialsMonthly");
    expect(page).toContain("PLAN_PRICES.proMonthly");
    expect((PLAN_PRICES.essentialsMonthly * 0.25).toFixed(2)).toBe("7.25");
    expect((PLAN_PRICES.proMonthly * 0.25).toFixed(2)).toBe("14.75");
    expect(page).toContain("It is not a promise of what you will earn.");
  });
  it("says links start paying on launch day until card payments open", () => {
    expect(page).toContain('export const PAYING_LINE = "Partner links start paying on launch day.";');
    expect(page).toContain("under={CARDS_OPEN ? null : PAYING_LINE}");
    expect(page).toContain("const CARDS_OPEN = false;");
  });
  it("is in docs/COPY.md, facts 08 and the partner home carries the kit", () => {
    const copy = read("docs/COPY.md");
    for (const line of [PARTNER_PAYING_LINE.replace(", when card payments open", ""), KIT.title, KIT.insertDownload, "Join in two minutes", PAID_LABEL, INSERT.big])
      expect(copy, line).toContain(line);
    expect(read("knowledge/facts/08-partners.md")).toContain("Partners 3");
    expect(read("src/components/partners/partner-home.tsx")).toContain("<PartnerKit");
  });
});

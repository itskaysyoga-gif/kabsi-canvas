// Sync 2a (R-142, master plan 30.46): lane R's answers to Sync 1. Each part adds its guards here.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCOUNT_STAYS_LINE, HELP_LINES, PAY_TODAY_LINE, WORKING_HOURS } from "@/lib/site";
import { PLANS } from "@/components/kabsi/plans";

const read = (p: string) => readFileSync(p, "utf8");
const facts = readdirSync("knowledge/facts")
  .filter((f) => /^\d\d-.*\.md$/.test(f))
  .map((f) => ({ f, text: read(`knowledge/facts/${f}`) }));

describe("Sync 2a part 1", () => {
  it("item 1: no fact says early access, test mode, 20 businesses, hand posting or Google Protection off", () => {
    for (const { f, text } of facts) {
      expect(text, f).not.toMatch(/early[- ]access/i);
      expect(text, f).not.toMatch(/\bTest mode\b/);
      expect(text, f).not.toMatch(/limited to 20 businesses/i);
      expect(text, f).not.toMatch(/Google Protection (is|stays) off/i);
    }
    for (const g of ["how-to-set-holiday-hours-on-google", "someone-changed-my-hours-on-google"]) {
      expect(read(`src/content/guides/${g}.tsx`)).not.toMatch(/early access/i);
    }
  });

  it("item 2: the tattoo job and card say house rules, and the no-shows guide keeps one Kabsi line", () => {
    const tattoo = read("src/content/industries/tattoo-studio.ts");
    expect(tattoo).toContain('title: "House rules in your description, kept right"');
    expect(tattoo).toContain('card: "House rules right, healed work as posts."');
    expect(tattoo).not.toMatch(/booking rules/i);
    const guide = read(
      "src/content/guides/reply-to-reviews-about-no-shows-and-cancellation-fees.tsx",
    );
    expect(guide).toContain("Kabsi works only with your Google profile.");
    expect(guide).not.toContain("booking system");
  });

  it("item 5: no owner line says API for ChatGPT, Perplexity or Google, and the Pro line is the approved one", () => {
    for (const p of [
      "src/components/kabsi/d8-about.tsx",
      "src/components/kabsi/d9-data.ts",
      "src/components/kabsi/faq-data.ts",
    ]) {
      expect(read(p), p).not.toMatch(/(ChatGPT|Perplexity|OpenAI|Google)[^.]*\bAPI\b/);
    }
    expect(read("src/components/kabsi/d8-about.tsx")).toContain(
      "Kabsi connects to your Google Business Profile with your permission.",
    );
    expect(read("src/components/kabsi/d9-data.ts")).toContain(
      "Answers we get from ChatGPT and Perplexity directly, which can differ from what their apps show.",
    );
    expect(PLANS.find((p) => p.id === "pro")?.line).toBe(
      "For a busier business: a post every week and a team that approves.",
    );
    expect(read("src/components/kabsi/plans.ts")).not.toMatch(/menu and offers/);
  });

  it("item 7: the hand-off times in say.ts are the help lines and the working hours of site.ts", () => {
    const say = read("supabase/functions/_shared/whatsapp/say.ts");
    expect(HELP_LINES.essentials).toContain("the same working day");
    expect(HELP_LINES.pro).toContain("within 4 working hours");
    expect(say).toContain('essentials: "the same working day"');
    expect(say).toContain('pro: "within 4 working hours"');
    expect(say).toContain('other: "within one working day"');
    expect(say).toContain(`HANDOFF_HOURS = "${WORKING_HOURS}"`);
    const nora = read("supabase/functions/_shared/whatsapp/nora.ts");
    expect(say + nora).not.toContain("business day");
  });

  it("item 7: the scan and partner code replies carry no promise", () => {
    const say = read("supabase/functions/_shared/whatsapp/say.ts");
    expect(say).toContain(
      "You can check your business free at ${scanResultUrl(null)} and send me the code from the page.",
    );
    expect(say).toContain('partnerCodeNoted: "Thanks, your partner code is noted."');
    expect(say).not.toMatch(/as soon as maps are switched on|your free Pro trial is 30 days/);
  });
});

describe("Sync 2a part 2", () => {
  const sql = (f: string) => read(`supabase/migrations/${f}`);
  it("item 3: nothing schedules the renewal reminders, and no code or email for them is left", () => {
    // The newest migration that defines private.produce_jobs() does not offer the job.
    const files = readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const defining = files.filter((f) =>
      /create (or replace )?function private\.produce_jobs\(\)/i.test(sql(f)),
    );
    const newest = defining[defining.length - 1]!;
    // Fix 5 replaced it once more (one offer added, partner_notices); the renewal line is still gone.
    expect(newest).toMatch(/sync2a_retire_renewals|fix5_partner_notices_step/);
    expect(sql(newest).replace(/^--.*$/gm, "")).not.toMatch(/renewal_reminders/);
    expect(read("supabase/functions/api/jobs.ts")).not.toMatch(/renewal_reminders|renewalsJob/);
    const cron = read("supabase/functions/api/cron.ts");
    expect(cron).not.toMatch(
      /renewalsJob|renewal_reminder_candidates|renewalReminder|dueRenewalEmail/,
    );
    expect(read("supabase/functions/_shared/email/copy.ts")).not.toMatch(/renewalReminder/);
    expect(read("supabase/functions/_shared/plans.ts")).not.toMatch(/dueRenewalEmail/);
    expect(read("supabase/functions/_shared/email/catalog.ts")).not.toMatch(/renew_r[15]/);
  });

  it("item 3: billing words are the two lines, kept equal to site.ts, and no 30 day deletion is promised", () => {
    const words = read("supabase/functions/_shared/billing-words.ts");
    expect(words).toContain(`PAY_TODAY_LINE = "${PAY_TODAY_LINE}"`);
    expect(words).toContain(`ACCOUNT_STAYS_LINE = "${ACCOUNT_STAYS_LINE}"`);
    expect(ACCOUNT_STAYS_LINE).toBe(
      "Your account and its history stay. Ask us any time to delete them.",
    );
    for (const f of [
      "supabase/functions/_shared/billing.ts",
      "supabase/functions/_shared/billing-lines.ts",
      "supabase/functions/_shared/email/account-copy.ts",
      "src/routes/_authenticated/app/plan.tsx",
    ]) {
      const text = read(f);
      expect(text, f).not.toMatch(
        /DATA_DAYS|dataDays|dataUntil|data_kept_until|kept for \$\{|then deleted/,
      );
    }
    const billing = read("supabase/functions/_shared/billing-lines.ts");
    expect(billing.match(/ACCOUNT_STAYS_LINE/g)?.length).toBeGreaterThanOrEqual(2);
    expect(billing.match(/PAY_TODAY_LINE/g)?.length).toBeGreaterThanOrEqual(2);
    expect(read("supabase/functions/_shared/whatsapp/say.ts")).toContain("billingNoPlan");
    expect(read("supabase/functions/_shared/whatsapp/say.ts")).toMatch(
      /billingNoPlan:[^\n]*\$\{PAY_TODAY_LINE\}/,
    );
    expect(read("supabase/functions/_shared/whatsapp/agent.ts")).toMatch(
      /Your plan has ended, so nothing can be published\. \$\{PAY_TODAY_LINE\}/,
    );
    for (const { f, text } of facts)
      expect(text, f).not.toMatch(
        /your data is kept|data is kept for 30 days|then deleted\. Reply plan/i,
      );
  });

  it("item 3: the Creem line on Pricing and About is future until Creem is live", () => {
    const line = "Card payments will be processed by Creem, our merchant of record.";
    expect(read("src/components/kabsi/d8-about.tsx")).toContain(line);
    expect(read("src/components/kabsi/faq-data.ts")).toContain(line);
  });

  it("item 6: the work update v1 template is gone from the code; the v2 name is the one name", () => {
    const t = read("supabase/functions/_shared/whatsapp/templates.ts");
    expect(t).not.toMatch(/name: "kabsi_work_update",/);
    expect(t).toContain('name: "kabsi_work_update_v2"');
    expect(read("docs/COPY.md")).toMatch(
      /Visibility Map is a K-02 product name, so the approved template `kabsi_map_ready`/,
    );
    expect(t).toContain('name: "kabsi_map_ready"');
  });

  it("item 8: Nora's rules allow Arabic script in the chat only and carry the booking line; facts hold it too", () => {
    const rules = read("supabase/functions/_shared/nora-rules.ts");
    const line =
      "Kabsi looks after your Google Business Profile. It is not a booking system and does not keep your customers' bookings or requests.";
    expect(rules).toMatch(
      /Arabic script is fine in a chat reply when the visitor writes Arabic\. It stays in the chat: nothing Arabic is published/,
    );
    expect(rules).toContain(line);
    expect(read("knowledge/facts/04-product.md")).toContain(line);
    const f01 = read("knowledge/facts/01-decisions-coming-and-changing.md");
    expect(f01).not.toContain("None of this is built");
    expect(f01).not.toContain("**[COMING] The new product");
    expect(f01).toContain("prepares the work for your yes");
    expect(f01).not.toContain("measures, does the work");
  });
});

describe("Sync 2a part 3", () => {
  it("EML-12: the email catalog shows the billing and Founding 25 emails", () => {
    const catalog = read("supabase/functions/_shared/email/catalog.ts");
    for (const k of [
      "billing_paused",
      "billing_ended",
      "billing_payment_reminder",
      "founding_day",
    ]) {
      expect(catalog, k).toContain(k);
    }
    for (const k of [
      "billing_paused",
      "billing_ended",
      "billing_payment_reminder",
      "founding_day60",
      "founding_day85",
      "founding_day90",
    ]) {
      expect(readFileSync(`docs/email-previews/${k}.txt`, "utf8"), k).toMatch(/^Subject: /);
    }
  });

  it("EML-07 and EML-08: the invite footer does not say the invitee asked, and the holiday email names the Hours link once", () => {
    expect(read("supabase/functions/_shared/team.ts")).toContain(
      "Someone at ${i.business} invited you to Kabsi.",
    );
    const text = read("docs/email-previews/holiday_hours.txt");
    expect(text.match(/under Hours/g)?.length).toBe(1);
    expect(text.match(/\/app\/hours/g)?.length).toBe(1);
    expect(read("docs/email-previews/team_invite.txt")).not.toContain("You asked for this email");
  });

  it("PUB-09: /faq is sourced from faq-data.ts and the old unused FAQ array is gone", () => {
    expect(read("src/lib/faq.ts")).not.toMatch(/export const FAQ\b/);
    expect(read("src/content/sitemap-pages.json")).not.toContain('"src/lib/faq.ts"');
  });

  it("KB-39: the beauty salon card says as posts, in the page and in llms.txt", () => {
    expect(read("src/content/industries/beauty-salon.ts")).toContain(
      'card: "Makeup, facials and waxing as posts."',
    );
    expect(read("knowledge/facts/llms.txt")).toContain("makeup, facials and waxing as posts.");
    expect(read("knowledge/facts/llms.txt")).not.toContain("posted for you");
  });
});

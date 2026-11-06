// outbound-prepare's logic (Harvey 4A part B, master plan 30.39 items 5 and 7): the next day's candidates up to the next
// day's cap, each checked, each filled from the approved templates with no AI call. Every outside call is a dependency,
// so the tests run it with fakes. Logs carry counts only.
import { fixtureRows } from "./fixture.ts";
import { readPage } from "./page.ts";
import { ordered, parseCsv, rowRefusal, toCandidate } from "./register.ts";
import { dailyCap, domainOf, emailOne, emailOnPage, followUp, KIND_WORDS, localNine, localParts, nextWeekday, pickDetail, TIME_ZONES } from "./rules.ts";

export type Settings = {
  sending_open: boolean; test_mode: boolean; open_countries: string[]; ramp_week1: number; ramp_week2: number; ramp_after: number;
  monthly_cap: number; started_on: string | null; stopped_reason: string | null;
};

export type NewDraft = {
  prospect: {
    harvey_company_id: string; country: string; industry: string; city: string; business_name: string; email: string;
    email_domain: string; time_zone: string; source_page: string; source_date: string; company_number: string | null;
    company_status: string | null; company_status_date: string | null; detail_kind: string; detail_used: string; test: boolean;
  };
  first: { to_address: string; subject: string; body: string; send_after: string };
  follow: { to_address: string; subject: string; body: string };
};

export type PrepareDeps = {
  settings(): Promise<Settings>;
  refreshSuppression(): Promise<void>;
  register(): Promise<string>;
  page(url: string): Promise<{ html: string } | { refused: string }>;
  /** Not suppressed, not a Kabsi customer, applicant or partner by name, never written to (address, domain or company). */
  eligible(c: { email: string; domain: string; name: string; country: string; company_id: string }): Promise<boolean>;
  /** Firsts and follow-ups already waiting (draft or approved) for that local date. */
  queuedFor(date: string): Promise<number>;
  sentThisMonth(): Promise<number>;
  insert(d: NewDraft): Promise<void>;
  testRecipients: string[];
  now: Date;
};

export type PrepareResult = { state: string; drafted: number; looked_at: number; refused: Record<string, number> };

const MAX_LOOKS = 20;

export async function prepare(deps: PrepareDeps, opts: { today?: boolean } = {}): Promise<PrepareResult> {
  const s = await deps.settings();
  const refused: Record<string, number> = {};
  const no = (why: string) => void (refused[why] = (refused[why] ?? 0) + 1);
  if (s.stopped_reason) return { state: "stopped", drafted: 0, looked_at: 0, refused };
  if (!s.sending_open && !s.test_mode) return { state: "locked", drafted: 0, looked_at: 0, refused };
  const test = !s.sending_open;
  if (test && deps.testRecipients.length === 0) return { state: "no_test_recipients", drafted: 0, looked_at: 0, refused };
  await deps.refreshSuppression();

  const today = localParts(deps.now, "Europe/London").date;
  const day = test && opts.today ? today : nextWeekday(today);
  const room = Math.min(
    dailyCap(s, day) - (await deps.queuedFor(day)),
    s.monthly_cap - (await deps.sentThisMonth()) - (await deps.queuedFor(day)),
  );
  if (room <= 0) return { state: "full", drafted: 0, looked_at: 0, refused };

  const rows = test
    ? fixtureRows(today.replace(/-/g, ""))
    : ordered(parseCsv(await deps.register()));
  const html = new Map(test ? fixtureRows(today.replace(/-/g, "")).map((r) => [r.company_id, r.html] as const) : []);
  const countries = test ? ["GB"] : s.open_countries;

  let drafted = 0;
  let looked = 0;
  for (const r of rows) {
    if (drafted >= room || looked >= MAX_LOOKS) break;
    // A UK row is refused here unless Harvey's register shows its company Active on a file at most 40 days old.
    const why = rowRefusal(r, countries, today);
    if (why) { no(why); continue; }
    const c = toCandidate(r);
    const domain = domainOf(c.email);
    if (!(await deps.eligible({ email: c.email, domain, name: c.business_name, country: c.country, company_id: c.company_id }))) {
      no("suppressed_or_known");
      continue;
    }
    looked++;
    const read = test ? { html: html.get(c.company_id) ?? "" } : await deps.page(c.email_page_url);
    if ("refused" in read) { no(`page_${read.refused}`); continue; }
    if (!emailOnPage(read.html, c.email)) { no("email_not_on_page"); continue; }
    const detail = pickDetail(read.html, deps.now);
    if (!detail) { no("no_detail"); continue; }
    const tz = TIME_ZONES[c.country] ?? "Europe/London";
    const to = test ? deps.testRecipients[drafted % deps.testRecipients.length] : c.email;
    const one = emailOne({ business: c.business_name, kind: KIND_WORDS[c.industry], city: c.city, detail: detail.sentence });
    const two = followUp({ business: c.business_name });
    await deps.insert({
      prospect: {
        harvey_company_id: c.company_id, country: c.country, industry: c.industry, city: c.city, business_name: c.business_name,
        email: c.email, email_domain: domain, time_zone: tz, source_page: c.email_page_url, source_date: today,
        company_number: c.company_number || null, company_status: test ? "test" : c.country === "GB" ? c.company_status : null,
        company_status_date: !test && c.country === "GB" ? c.company_status_date : null, detail_kind: detail.kind,
        detail_used: detail.sentence, test,
      },
      first: { to_address: to, ...one, send_after: localNine(day, tz).toISOString() },
      follow: { to_address: to, ...two },
    });
    drafted++;
  }
  return { state: test ? "test" : "open", drafted, looked_at: looked, refused };
}

export { readPage };

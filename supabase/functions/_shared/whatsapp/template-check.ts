// Kapso 1: the daily check that Kabsi's WhatsApp number and templates are right. Read only: it reads the number and the
// templates through Kapso's API with the existing Kapso secret and compares them with what the code sends
// (templates.ts SENDABLE_TEMPLATES). It never creates, edits or deletes a template, never changes the webhook and never
// sends a message. Anything wrong raises one staff alert a day (the ops event kind below is an urgent one in
// staff-alerts.ts), naming the item and its state only: no phone number, no secret, no message text.
// Pure apart from its deps, so the tests drive it with recorded Kapso answers.
import { SENDABLE_TEMPLATES, type SendableTemplate } from "./templates.ts";

export type NumberReading = {
  numberStatus: string | null;
  nameStatus: string | null;
  quality: string | null;
  tier: string | null;
  /** Kapso's own check that the webhook answers (checks.webhook_verified.passed); null when Kapso did not say. */
  webhookVerified: boolean | null;
};
export type TemplateFound = { name: string; status: string; category: string | null; language: string | null; params: number };

export type TemplateState = "ok" | "missing" | "not_approved" | "wrong_category" | "wrong_language" | "wrong_params";
export type TemplateResult = {
  name: string;
  state: TemplateState;
  /** True when the sender would send this name now (sendName: a replacement only once it reads APPROVED and UTILITY). */
  in_use: boolean;
  status: string | null;
  category: string | null;
  params_found: number | null;
  params_expected: number;
};
export type Finding = { item: string; problem: string };

/** The daily alert is one ops event kind, urgent in staff-alerts.ts, so it goes to the staff phone on WhatsApp (R-64). */
export const CHECK_KIND = "whatsapp_check";

/** The number's reading from the Kapso health read (kapso-admin.ts readHealth): ids and states only. */
export function numberFromHealth(h: { quality: string | null; tier: string | null; detail: Record<string, unknown> }): NumberReading {
  const checks = (h.detail.checks && typeof h.detail.checks === "object" ? h.detail.checks : {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    numberStatus: text(h.detail.number_status),
    nameStatus: text(h.detail.name_status),
    quality: h.quality,
    tier: h.tier,
    webhookVerified: typeof checks.webhook_verified === "boolean" ? checks.webhook_verified : null,
  };
}

const up = (v: string | null | undefined) => (v ?? "").trim().toUpperCase();

/** TIER_250 to 250, TIER_1K to 1000, TIER_100K to 100000, TIER_UNLIMITED to Infinity; null when it is not a tier. */
export function tierValue(tier: string | null | undefined): number | null {
  const t = up(tier);
  if (t === "TIER_UNLIMITED" || t === "UNLIMITED") return Infinity;
  const m = /^(?:TIER_)?(\d+)(K|M)?$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * (m[2] === "K" ? 1_000 : m[2] === "M" ? 1_000_000 : 1);
}

/** The highest tier in a list of readings (the hourly health rows), or null when none can be read. */
export function bestTier(tiers: (string | null)[]): string | null {
  let best: { tier: string; v: number } | null = null;
  for (const t of tiers) {
    const v = tierValue(t);
    if (t && v !== null && (!best || v > best.v)) best = { tier: up(t), v };
  }
  return best?.tier ?? null;
}

/** One listed template against what Meta has for it. A name can exist in several languages: the one the code sends is used. */
export function checkTemplate(listed: SendableTemplate, found: TemplateFound[], inUse: boolean): TemplateResult {
  const rows = found.filter((t) => t.name === listed.name);
  const row = rows.find((t) => up(t.language) === up(listed.language)) ?? null;
  const base = { name: listed.name, in_use: inUse, params_expected: listed.params.length };
  if (!rows.length) return { ...base, state: "missing", status: null, category: null, params_found: null };
  if (!row) return { ...base, state: "wrong_language", status: rows[0].status || null, category: rows[0].category, params_found: rows[0].params };
  const seen = { status: row.status || null, category: row.category, params_found: row.params };
  if (up(row.status) !== "APPROVED") return { ...base, ...seen, state: "not_approved" };
  if (up(row.category) !== up(listed.category)) return { ...base, ...seen, state: "wrong_category" };
  if (row.params !== listed.params.length) return { ...base, ...seen, state: "wrong_params" };
  return { ...base, ...seen, state: "ok" };
}

const PROBLEM: Record<Exclude<TemplateState, "ok">, (r: TemplateResult) => string> = {
  missing: () => "is missing",
  not_approved: (r) => `is ${(r.status ?? "unknown").toLowerCase()}, not approved`,
  wrong_category: (r) => `is ${(r.category ?? "unknown").toLowerCase()}, not utility`,
  wrong_language: () => "is not in the language the code sends",
  wrong_params: (r) => `has ${r.params_found} parameters, the code fills ${r.params_expected}`,
};

/** Every listed template against what Meta has. */
export function compareTemplates(found: TemplateFound[]): { templates: TemplateResult[]; findings: Finding[] } {
  const byName = (n: string) => SENDABLE_TEMPLATES.find((t) => t.name === n)!;
  // The sender's own test (templates.ts sendName and statusMap): the replacement is sent once it reads APPROVED and UTILITY. A wrong
  // language or parameter count on it does not stop the sender, so it is in use, and checkTemplate then raises that mismatch.
  const ready = (n: string) => {
    const s = checkTemplate(byName(n), found, true);
    return s.state !== "missing" && up(s.status) === "APPROVED" && up(s.category) === "UTILITY";
  };
  const templates = SENDABLE_TEMPLATES.map((t) => {
    // A first name with a replacement is only the fallback while the replacement is not ready (templates.ts sendName: APPROVED and
    // UTILITY); a replacement is in use only once it is. A template not in use is reported but never raises an alert.
    const inUse = t.replacedBy ? !ready(t.replacedBy) : t.replaces ? ready(t.name) : true;
    return checkTemplate(t, found, inUse);
  });
  const findings = templates.filter((r) => r.in_use && r.state !== "ok")
    .map((r) => ({ item: r.name, problem: PROBLEM[r.state as Exclude<TemplateState, "ok">](r) }));
  return { templates, findings };
}

/** The number against what it should be: quality, the messaging limit against the highest seen before (`best`), the webhook. */
export function compareNumber(number: NumberReading, best: string | null): Finding[] {
  const findings: Finding[] = [];
  const q = up(number.quality);
  if (q === "YELLOW" || q === "RED") findings.push({ item: "number quality", problem: `is ${q}` });
  const now = tierValue(number.tier);
  const was = tierValue(best);
  if (now !== null && was !== null && now < was) findings.push({ item: "messaging limit", problem: `is ${up(number.tier)}, it was ${up(best)}` });
  if (number.webhookVerified === false) findings.push({ item: "webhook", problem: "is not verified" });
  return findings;
}

export type Alert = { kind: string; channel: "alerts"; title: string; body: string; dedupe: string };

/** The alert for a day's findings: names and states only. One dedupe key a day, so the ops event table keeps one. */
export function alertFor(findings: Finding[], day: string): Alert | null {
  if (!findings.length) return null;
  const line = (f: Finding) => `${f.item} ${f.problem}`;
  const shown = findings.slice(0, 3).map((f) => f.item).join(", ");
  const more = findings.length > 3 ? ` and ${findings.length - 3} more` : "";
  return {
    kind: CHECK_KIND,
    channel: "alerts",
    title: `WhatsApp check found ${findings.length === 1 ? "1 item" : `${findings.length} items`}: ${shown}${more}`,
    body: findings.map(line).join(". "),
    dedupe: `${CHECK_KIND}:${day}`,
  };
}

export type CheckDeps = {
  readNumber(): Promise<NumberReading>;
  readTemplates(): Promise<TemplateFound[]>;
  /** The highest messaging limit among the stored hourly readings, or null. */
  bestTier(): Promise<string | null>;
  emit(a: Alert): Promise<void>;
  now(): Date;
};

export type CheckResult = {
  ok: boolean;
  day: string;
  number: { status: string | null; display_name_status: string | null; quality: string | null; messaging_limit: string | null; webhook_verified: boolean | null } | null;
  templates: { name: string; state: TemplateState; in_use: boolean; status: string | null; category: string | null }[];
  findings: Finding[];
  alert_raised: boolean;
};

/** The whole check. A read that fails is itself a finding (a check that cannot read must not pass), with no error text. */
export async function runCheck(d: CheckDeps): Promise<CheckResult> {
  const day = d.now().toISOString().slice(0, 10);
  const unread: Finding[] = [];
  const number = await d.readNumber().catch(() => (unread.push({ item: "number reading", problem: "could not be read from Kapso" }), null));
  const found = await d.readTemplates().catch(() => (unread.push({ item: "template list", problem: "could not be read from Kapso" }), null));
  const best = await d.bestTier().catch(() => null);
  const t = found ? compareTemplates(found) : { templates: [], findings: [] };
  const all = [...unread, ...t.findings, ...(number ? compareNumber(number, best) : [])];
  const alert = alertFor(all, day);
  if (alert) await d.emit(alert);
  return {
    ok: all.length === 0,
    day,
    number: number && { status: number.numberStatus, display_name_status: number.nameStatus, quality: number.quality, messaging_limit: number.tier, webhook_verified: number.webhookVerified },
    templates: t.templates.map((r) => ({ name: r.name, state: r.state, in_use: r.in_use, status: r.status, category: r.category })),
    findings: all,
    alert_raised: !!alert,
  };
}

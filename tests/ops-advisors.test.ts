import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module without types
import { flatten, keyFor, planSql } from "../scripts/ops/advisors.mjs";
// @ts-expect-error plain JavaScript module without types
import { buildSql } from "../scripts/ops/record-event.mjs";

const grouped = {
  lints: [
    {
      name: "rls_enabled_no_policy",
      title: "RLS Enabled No Policy",
      level: "INFO",
      remediation: "https://x",
      findings: [{ detail: "d", metadata: { name: "jobs", schema: "public" } }],
    },
    {
      name: "authenticated_security_definer_function_executable",
      title: "Signed-In Users Can Execute SECURITY DEFINER Function",
      level: "WARN",
      remediation: "https://fix",
      findings: [
        { detail: "Function a", metadata: { name: "a", schema: "public", arguments: "p text" } },
        { detail: "it's function b", metadata: { name: "b", schema: "public", arguments: "" } },
      ],
    },
    {
      name: "auth_leaked_password_protection",
      title: "Leaked Password Protection Disabled",
      level: "WARN",
      findings: [{ detail: "off", metadata: { type: "auth", entity: "Auth" } }],
    },
  ],
};
const flat = {
  lints: [
    {
      name: "rls_disabled_in_public",
      title: "RLS Disabled",
      level: "ERROR",
      detail: "Table public.t has no RLS",
      metadata: { name: "t", schema: "public" },
      cache_key: "rls_disabled_in_public_public_t",
    },
  ],
};

describe("ops advisors check", () => {
  it("reads both the grouped and the flat answer", () => {
    expect(flatten(grouped)).toHaveLength(4);
    expect(flatten(flat)[0].cacheKey).toBe("rls_disabled_in_public_public_t");
    expect(flatten({})).toEqual([]);
  });

  it("gives the same finding the same key and different objects different keys", () => {
    const [, a, b] = flatten(grouped);
    expect(keyFor(a)).toBe(keyFor({ ...a }));
    expect(keyFor(a)).not.toBe(keyFor(b));
  });

  it("records the first run as a quiet baseline with one summary", () => {
    const p = planSql(flatten(grouped), new Set());
    expect(p.baseline).toBe(true);
    expect(p.alerts).toHaveLength(3); // INFO is ignored
    expect(p.sql).toContain("advisor_baseline");
    expect(p.sql.match(/now\(\)\)/g)).toHaveLength(3); // the three findings are marked as sent
  });

  it("posts only findings it has not seen, and escapes quotes", () => {
    const all = flatten(grouped);
    const known = new Set([keyFor(all[1]), keyFor(all[3])]);
    const p = planSql(all, known);
    expect(p.baseline).toBe(false);
    expect(p.fresh).toHaveLength(1);
    expect(p.sql).toContain("it''s function b");
    expect(p.sql).toContain(", null)");
    expect(planSql(all, new Set(all.map(keyFor))).sql).toBe("");
  });
});

describe("ops record-event", () => {
  it("builds one idempotent insert with escaped text and a refused channel", () => {
    const sql = buildSql({
      kind: "backup_done",
      channel: "daily",
      title: "It's done",
      body: "",
      field: ["Set=2026"],
      "dedupe-key": "k1",
    });
    expect(sql).toContain("'It''s done'");
    expect(sql).toContain("on conflict (dedupe_key) do nothing");
  });
});

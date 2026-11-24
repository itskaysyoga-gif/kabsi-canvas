// FIX-0: which database key the Edge Functions use, and the public heartbeat. Fake values only; no real key is ever read.
import { describe, expect, it } from "vitest";
import { serviceKey, usableServiceKey } from "../supabase/functions/_shared/service-key.ts";
import {
  HEARTBEAT_MINUTES,
  heartbeatResponse,
} from "../supabase/functions/_shared/heartbeat-health.ts";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload: Record<string, unknown>) =>
  `${b64({ alg: "HS256" })}.${b64(payload)}.sig-sig-sig-sig`;
const NOW = 1_800_000_000;
const SECRET = "sb_secret_FAKEFAKEFAKEFAKEFAKE0001";
const LEGACY = jwt({ role: "service_role", exp: NOW + 1000 });
const env = (m: Record<string, string>) => (n: string) => m[n];

describe("usableServiceKey", () => {
  it("accepts a secret key and an unexpired service_role JWT", () => {
    expect(usableServiceKey(SECRET, NOW)).toBe(true);
    expect(usableServiceKey(LEGACY, NOW)).toBe(true);
  });
  it("refuses empty, short, anon, expired and malformed values", () => {
    for (const v of [
      undefined,
      "",
      "  ",
      "sb_secret_",
      "sb_publishable_FAKEFAKEFAKEFAKEFAKE",
      "nonsense",
      jwt({ role: "anon", exp: NOW + 1000 }),
      jwt({ role: "service_role", exp: NOW - 1 }),
      "a.b.c",
    ]) {
      expect(usableServiceKey(v, NOW)).toBe(false);
    }
  });
});

describe("serviceKey", () => {
  it("prefers KABSI_SECRET_KEY", () => {
    expect(
      serviceKey(env({ KABSI_SECRET_KEY: SECRET, SUPABASE_SERVICE_ROLE_KEY: LEGACY }), NOW),
    ).toBe(SECRET);
  });
  it("falls back to SUPABASE_SERVICE_ROLE_KEY when the first is missing or not usable", () => {
    expect(serviceKey(env({ SUPABASE_SERVICE_ROLE_KEY: LEGACY }), NOW)).toBe(LEGACY);
    expect(
      serviceKey(env({ KABSI_SECRET_KEY: "pasted wrong", SUPABASE_SERVICE_ROLE_KEY: LEGACY }), NOW),
    ).toBe(LEGACY);
  });
  it("throws naming both variables and never a value", () => {
    let message = "";
    try {
      serviceKey(
        env({ KABSI_SECRET_KEY: "bad-value-123", SUPABASE_SERVICE_ROLE_KEY: "worse-value-456" }),
        NOW,
      );
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("KABSI_SECRET_KEY");
    expect(message).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(message).not.toContain("bad-value");
    expect(message).not.toContain("worse-value");
  });
});

describe("heartbeatResponse", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  it("is 200 with a line inside the window and 503 outside it", () => {
    expect(heartbeatResponse("2026-11-24T11:50:00Z", now).status).toBe(200);
    expect(heartbeatResponse("2026-11-24T11:44:00Z", now).status).toBe(503);
    expect(HEARTBEAT_MINUTES).toBe(15);
  });
  it("is 503 when there is no line or the time is unreadable", () => {
    expect(heartbeatResponse(null, now).status).toBe(503);
    expect(heartbeatResponse("not a date", now).status).toBe(503);
  });
});

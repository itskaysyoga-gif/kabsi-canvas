// App 4 part B (master plan 30.31 item 2): how long a sign-in lasts, each rule with a fake clock. The browser's storage is
// stood in for by a small Map, so the functions that read and write localStorage run as they do in the browser.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  awayVerdict,
  clearSeen,
  isStaffPath,
  lastSeen,
  OWNER_IDLE_MS,
  STAFF_IDLE_MS,
  touch,
  WRITE_EVERY_MS,
} from "../src/lib/idle";
import {
  AWAY_OWNER_LINE,
  AWAY_STAFF_LINE,
  peekSignedOutReason,
  setSignedOutReason,
  SIGNED_OUT_LINE,
  signedOutLine,
  takeSignedOutReason,
} from "../src/lib/signed-out";

function storage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

const T0 = Date.UTC(2026, 10, 5, 12, 0, 0);
const DAY = 86_400_000;
const HOUR = 3_600_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  vi.stubGlobal("window", {
    localStorage: storage(),
    sessionStorage: storage(),
    dispatchEvent: () => true,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the rule (awayVerdict)", () => {
  const owner = { staff: false, pathname: "/app" };
  it("no visit recorded on this device signs nobody out", () => {
    expect(awayVerdict(null, T0, owner)).toBeNull();
  });
  it("an owner stays signed in up to 30 days after the last visit", () => {
    expect(awayVerdict(T0 - 29 * DAY, T0, owner)).toBeNull();
    expect(awayVerdict(T0 - OWNER_IDLE_MS, T0, owner)).toBeNull();
  });
  it("an owner is signed out past 30 days", () => {
    expect(awayVerdict(T0 - OWNER_IDLE_MS - 1, T0, owner)).toBe("away-owner");
    expect(awayVerdict(T0 - 31 * DAY, T0, owner)).toBe("away-owner");
  });
  it("staff pages sign staff out after 12 hours", () => {
    const staffPage = { staff: true, pathname: "/staff" };
    expect(awayVerdict(T0 - 11 * HOUR, T0, staffPage)).toBeNull();
    expect(awayVerdict(T0 - STAFF_IDLE_MS - 1, T0, staffPage)).toBe("away-staff");
  });
  it("staff on an owner's page keep the 30 days", () => {
    expect(awayVerdict(T0 - 13 * HOUR, T0, { staff: true, pathname: "/app" })).toBeNull();
    expect(awayVerdict(T0 - 31 * DAY, T0, { staff: true, pathname: "/app" })).toBe("away-owner");
  });
  it("a non-staff session on /staff keeps the 30 days (the page itself is not found)", () => {
    expect(awayVerdict(T0 - 13 * HOUR, T0, { staff: false, pathname: "/staff" })).toBeNull();
  });
  it("a stamp in the future (the clock moved back) signs nobody out", () => {
    expect(awayVerdict(T0 + DAY, T0, owner)).toBeNull();
  });
  it("staff paths are /staff and below only", () => {
    expect(isStaffPath("/staff")).toBe(true);
    expect(isStaffPath("/staff/x")).toBe(true);
    expect(isStaffPath("/staffing")).toBe(false);
    expect(isStaffPath("/app")).toBe(false);
  });
});

describe("the last visit (touch)", () => {
  it("every visit starts the 30 days again", () => {
    touch();
    vi.setSystemTime(T0 + 29 * DAY);
    expect(awayVerdict(lastSeen(), Date.now(), { staff: false, pathname: "/app" })).toBeNull();
    touch();
    vi.setSystemTime(T0 + 58 * DAY);
    expect(awayVerdict(lastSeen(), Date.now(), { staff: false, pathname: "/app" })).toBeNull();
    vi.setSystemTime(T0 + 29 * DAY + OWNER_IDLE_MS + 1);
    expect(awayVerdict(lastSeen(), Date.now(), { staff: false, pathname: "/app" })).toBe(
      "away-owner",
    );
  });
  it("writes at most once a minute", () => {
    expect(touch()).toBe(true);
    vi.setSystemTime(T0 + WRITE_EVERY_MS - 1);
    expect(touch()).toBe(false);
    expect(lastSeen()).toBe(T0);
    vi.setSystemTime(T0 + WRITE_EVERY_MS);
    expect(touch()).toBe(true);
    expect(lastSeen()).toBe(T0 + WRITE_EVERY_MS);
  });
  it("replaces a stamp from the future", () => {
    vi.setSystemTime(T0 + DAY);
    touch();
    vi.setSystemTime(T0);
    expect(touch()).toBe(true);
    expect(lastSeen()).toBe(T0);
  });
  it("a sign-out forgets the last visit", () => {
    touch();
    clearSeen();
    expect(lastSeen()).toBeNull();
  });
  it("blocked storage never throws and signs nobody out", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
    });
    expect(touch()).toBe(false);
    expect(lastSeen()).toBeNull();
    expect(() => clearSeen()).not.toThrow();
  });
});

describe("the line that says why", () => {
  it("30 days and 12 hours have their own lines, and Log out its own", () => {
    expect(signedOutLine("away-owner")).toBe(AWAY_OWNER_LINE);
    expect(AWAY_OWNER_LINE).toBe("You were signed out after 30 days away. Log in again.");
    expect(signedOutLine("away-staff")).toBe(AWAY_STAFF_LINE);
    expect(AWAY_STAFF_LINE).toBe("You were signed out after 12 hours away. Log in again.");
    expect(signedOutLine("you")).toBe(SIGNED_OUT_LINE);
    expect(signedOutLine(null)).toBeNull();
  });
  it("is shown once, and only by the page it belongs to", () => {
    setSignedOutReason("away-owner");
    expect(takeSignedOutReason(["you"])).toBeNull();
    expect(peekSignedOutReason()).toBe("away-owner");
    expect(takeSignedOutReason(["away-owner", "away-staff"])).toBe("away-owner");
    expect(takeSignedOutReason()).toBeNull();
  });
});

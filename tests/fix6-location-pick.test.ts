import { describe, expect, it } from "vitest";
import { MRU_MAX, pickLocation, pushRecent, sortLocations } from "@/lib/location-pick";

const L = (id: string, created_at: string, is_demo?: boolean) => ({ id, created_at, is_demo });
const real1 = L("real1", "2026-10-01");
const real2 = L("real2", "2026-11-01");
const demoNew = L("demo", "2026-11-20", true);
const list = [demoNew, real1, real2];

describe("FIX-6 which business the app opens on", () => {
  it("opens the newest real business when nothing was used yet, never the newer demo one", () => {
    expect(pickLocation(list, { mru: [] })?.id).toBe("real2");
  });
  it("opens the most recently used real business", () => {
    expect(pickLocation(list, { mru: ["real1", "real2"] })?.id).toBe("real1");
  });
  it("skips a demo business that was used most recently", () => {
    expect(pickLocation(list, { mru: ["demo", "real1"] })?.id).toBe("real1");
  });
  it("keeps a business the tab picked on purpose, demo or not, while it stays the user's", () => {
    expect(pickLocation(list, { mru: ["real1"], tab: "demo" })?.id).toBe("demo");
    expect(pickLocation(list, { mru: ["real1"], tab: "gone" })?.id).toBe("real1");
  });
  it("opens a demo business only when it is all the user has", () => {
    expect(pickLocation([demoNew], { mru: [] })?.id).toBe("demo");
    expect(pickLocation([], { mru: [] })).toBeNull();
  });
  it("ignores a remembered id that is no longer the user's", () => {
    expect(pickLocation(list, { mru: ["someone-elses", "real1"] })?.id).toBe("real1");
  });
});

describe("FIX-6 the switcher order", () => {
  it("puts demo businesses last, real ones by recent use then newest", () => {
    expect(sortLocations(list, []).map((l) => l.id)).toEqual(["real2", "real1", "demo"]);
    expect(sortLocations(list, ["real1"]).map((l) => l.id)).toEqual(["real1", "real2", "demo"]);
    expect(sortLocations(list, ["demo", "real1"]).map((l) => l.id)).toEqual([
      "real1",
      "real2",
      "demo",
    ]);
  });
  it("does not change the list it is given", () => {
    const before = list.map((l) => l.id);
    sortLocations(list, ["real1"]);
    expect(list.map((l) => l.id)).toEqual(before);
  });
});

describe("FIX-6 the recent list kept per user", () => {
  it("moves a pick to the front, once, and stops at the cap", () => {
    expect(pushRecent(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
    const many = Array.from({ length: 20 }, (_, i) => `x${i}`);
    expect(pushRecent(many, "new")).toHaveLength(MRU_MAX);
    expect(pushRecent(many, "new")[0]).toBe("new");
  });
});

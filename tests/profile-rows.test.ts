import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpenChange } from "../src/components/profile/open-change";
import { changeWords } from "../src/components/profile/change-card";
import {
  NOT_CONFIRMED,
  needsOk,
  profileRows,
  readRows,
  protectionLine,
  WATCHED,
  type Change,
  type Fact,
} from "../src/lib/profile-rows";
import type { Access } from "../src/lib/team";

// P0.3-11: the Google Profile screen (K-18, K-19). Every watched field has a row with the right status; an open change shows
// its card with the two decisions; a detail the owner has not confirmed says so. The Yawmiyati facts are the mock's.
const v = (display: string) => ({ display });
const unconfirmed = (key: string, display: string): Fact => ({
  key,
  value: v(display),
  status: "needs_confirmation",
});
const yawmiyati: Fact[] = [
  unconfirmed("name", "Yawmiyati"),
  unconfirmed("address", "Mirna Chalouhi Hwy, Lebanon"),
  unconfirmed("main_category", "Restaurant"),
  unconfirmed("phone", "+961 1 000 000"),
  unconfirmed("regular_hours", "7AM TO 11 PM"),
];
const phoneChange: Change = {
  id: "c1",
  field: "phone",
  previous_value: v("+961 1 000 000"),
  previous_fact_id: null,
  google_value: v("+961 1 999 999"),
  source: "scheduled_check",
  status: "detected",
  explanation: null,
  recommend: null,
  recommend_reason: null,
  support_requested_at: null,
  detected_at: "2026-10-20T04:00:00Z",
};
const row = (rows: ReturnType<typeof profileRows>, key: string) => rows.find((r) => r.key === key)!;

describe("the rows", () => {
  it("lists every K-19 field, in order", () => {
    expect(profileRows([], []).map((r) => r.label)).toEqual([
      "Business name",
      "Main category",
      "Phone",
      "Website",
      "Address",
      "Service area",
      "Opening hours",
      "Special hours",
      "Description",
      "Open status",
      "Attributes",
      "Verification",
    ]);
    expect(WATCHED).toHaveLength(12);
  });

  it("says Not yet confirmed by you for Yawmiyati's unconfirmed details", () => {
    const rows = profileRows(yawmiyati, []);
    for (const k of ["name", "address", "main_category", "phone", "regular_hours"]) {
      expect(row(rows, k).approved, k).toBe(NOT_CONFIRMED);
      expect(row(rows, k).status, k).toBe("Needs your OK");
      expect(row(rows, k).google, k).not.toBeNull();
    }
    expect(row(rows, "name").google).toBe("Yawmiyati");
  });

  it("marks the fields Kabsi has not read yet", () => {
    const rows = profileRows(yawmiyati, []);
    for (const k of [
      "website",
      "service_area",
      "special_hours",
      "description",
      "open_status",
      "attributes",
      "verification",
    ]) {
      expect(row(rows, k).status, k).toBe("Not read yet");
      expect(row(rows, k).google, k).toBeNull();
    }
  });

  it("shows a confirmed detail as matching", () => {
    const rows = profileRows([{ key: "phone", value: v("+1 555 0100"), status: "verified" }], []);
    expect(row(rows, "phone")).toMatchObject({
      status: "Matches what you approved",
      tone: "green",
      google: "+1 555 0100",
      approved: "+1 555 0100",
    });
  });

  it("shows an open change as differing, with both values, and keeps the card for it", () => {
    const rows = profileRows(yawmiyati, [phoneChange]);
    const r = row(rows, "phone");
    expect(r.status).toBe("Differs on Google");
    expect(r.google).toBe("+961 1 999 999");
    expect(r.approved).toBe(NOT_CONFIRMED);
    expect(r.change?.id).toBe("c1");
    const confirmed = profileRows(yawmiyati, [{ ...phoneChange, previous_fact_id: "f1" }]);
    expect(row(confirmed, "phone").approved).toBe("+961 1 000 000");
  });

  it("follows a put-back and a refusal", () => {
    const facts: Fact[] = [{ key: "phone", value: v("+1 555 0100"), status: "verified" }];
    expect(row(profileRows(facts, [{ ...phoneChange, status: "rejected" }]), "phone").status).toBe(
      "Your information is on its way to Google",
    );
    expect(row(profileRows(facts, [{ ...phoneChange, status: "failed" }]), "phone").tone).toBe(
      "red",
    );
    expect(row(profileRows(facts, [{ ...phoneChange, status: "accepted" }]), "phone").status).toBe(
      "Matches what you approved",
    );
  });

  it("marks a detail Missing only when Kabsi read it and Google shows nothing", () => {
    const facts: Fact[] = [
      { key: "description", value: v(""), status: "verified" },
      { key: "phone", value: v("+1 555 0100"), status: "verified" },
    ];
    const rows = profileRows(facts, []);
    expect(row(rows, "description").missing).toBe(true);
    expect(row(rows, "phone").missing).toBe(false);
    // not read yet is not Missing
    expect(row(rows, "website").missing).toBe(false);
    expect(row(rows, "website").status).toBe("Not read yet");
  });

  it("names each changed detail in the owner's words, never with a person", () => {
    expect(changeWords("phone", "Rose Lane Salon")).toEqual({
      noun: "phone number",
      headline: "Google shows a new phone number for Rose Lane Salon.",
      putBack: "Put my phone number back",
      keep: "The new phone number is right",
    });
    expect(changeWords("regular_hours").headline).toBe("Google shows new opening hours.");
    expect(changeWords("regular_hours").keep).toBe("The new opening hours are right");
    expect(changeWords("phone").putBack).not.toMatch(/Put mine back/);
  });

  it("writes the Protection status line", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    expect(protectionLine({ running: true, checkedAt: "2026-10-20T09:14:00Z", now })).toMatch(
      /^Google Protection: on, last check \d\d:\d\d$/,
    );
    expect(protectionLine({ running: false, checkedAt: null, now })).toContain("paused");
    expect(protectionLine({ running: true, checkedAt: null, now })).toContain("first check");
  });
});

describe("the open change card", () => {
  const owner = {
    role: "owner",
    approve: { profile_change: true },
    approve_high_risk: true,
  } as unknown as Access;
  const manager = {
    role: "manager",
    approve: { profile_change: false },
    approve_high_risk: false,
  } as unknown as Access;
  const html = (change: Change, access: Access | undefined) =>
    renderToStaticMarkup(
      createElement(OpenChange, { change, access, lead: true, onDone: () => {} }),
    );

  it("shows the two decisions and the two values, stacked on a phone", () => {
    const out = html({ ...phoneChange, previous_fact_id: "f1" }, owner);
    expect(out).toContain("Put my phone number back");
    expect(out).toContain("The new phone number is right");
    expect(out).toContain("You approved");
    expect(out).toContain("Google shows now");
    expect(out).toContain("grid gap-3 sm:grid-cols-2");
  });

  it("offers only the new value is right, and says why, for a detail the owner has not confirmed", () => {
    const out = html(phoneChange, owner);
    expect(out).toContain("Not yet confirmed by you");
    expect(out).toContain("will not put the old value back");
    expect(out).toContain("The new phone number is right");
    expect(out).not.toContain("Put my phone number back");
  });

  it("warns before a name, address, category or open status decision", () => {
    const out = html({ ...phoneChange, field: "name", previous_fact_id: "f1" }, owner);
    expect(out).toContain("verify your business again");
    expect(html({ ...phoneChange, previous_fact_id: "f1" }, owner)).not.toContain(
      "verify your business again",
    );
  });

  it("hides the decisions from a manager the owner has not allowed", () => {
    const out = html({ ...phoneChange, previous_fact_id: "f1" }, manager);
    expect(out).toContain("The owner decides this one.");
    expect(out).toContain("hidden");
  });
});

// APP-3 (R-169): rows not read yet are hidden; Description and Attributes come from the coach's Google read; "Confirm all".
describe("APP-3: what the Details panel shows", () => {
  const facts = [
    { id: "f1", key: "name", value: { display: "Yawmiyati" }, status: "needs_confirmation" },
    { id: "f2", key: "phone", value: { display: "01 484 486" }, status: "needs_confirmation" },
    { id: "f3", key: "website", value: { display: "" }, status: "verified" },
  ];
  it("hides the rows Kabsi has not read, keeps Missing", () => {
    const rows = readRows(profileRows(facts, []));
    expect(rows.map((r) => r.key)).toEqual(["name", "phone", "website"]);
    expect(rows.find((r) => r.key === "website")?.missing).toBe(true);
  });
  it("fills Description and Attributes from the coach read", () => {
    const rows = readRows(profileRows(facts, [], { description_length: 0, attributes: 3 }));
    const desc = rows.find((r) => r.key === "description")!;
    const attrs = rows.find((r) => r.key === "attributes")!;
    expect(desc).toMatchObject({ missing: true, google: null });
    expect(attrs).toMatchObject({ missing: false, google: "3 details set", tone: "green" });
  });
  it("lists the rows that wait for the owner's OK", () => {
    expect(needsOk(profileRows(facts, [])).map((r) => r.key)).toEqual(["name", "phone"]);
  });
});

import { describe, expect, it } from "vitest";
import { addressMatches, matchInvitation, norm } from "../supabase/functions/_shared/invitations";

// Same cases as the Deno tests next to the module; this copy runs with the app's test suite.
const younes = { name: "Cafe Younes", address: "Hamra Street 12, Beirut, Lebanon" };
const plain = { name: "Cafe", address: "Main Street 5, Beirut, Lebanon" };
const inv = (o: Record<string, unknown> = {}) => ({
  addressLines: ["Hamra Street 12"],
  locality: "Beirut",
  ...o,
});

describe("invitation matching (D270, D293)", () => {
  it("norm ignores case, accents and punctuation", () => {
    expect(norm("  Café  Younes! ")).toBe("cafe younes");
    expect(norm("Éclair & Co.")).toBe("eclair co");
  });

  it("accepts an exact name with a street match", () => {
    expect(matchInvitation("Cafe Younes", inv(), [younes, plain]).ok).toBe(true);
  });

  it("does not confuse look-alike names", () => {
    expect(matchInvitation("Cafe", inv({ addressLines: ["Main Street 5"] }), [younes]).ok).toBe(
      false,
    );
    expect(matchInvitation("Cafe Younes", inv(), [plain]).ok).toBe(false);
    const a = matchInvitation("Cafe", inv({ addressLines: ["Main Street 5"] }), [younes, plain]);
    expect(a.ok && a.business.name).toBe("Cafe");
    const b = matchInvitation("Cafe Younes", inv(), [younes, plain]);
    expect(b.ok && b.business.name).toBe("Cafe Younes");
  });

  it("refuses the same name in another city", () => {
    expect(
      matchInvitation("Cafe Younes", { addressLines: ["Rue 9"], locality: "Tripoli" }, [younes]).ok,
    ).toBe(false);
  });

  it("accepts a city match when the street differs", () => {
    expect(
      matchInvitation("Cafe Younes", { addressLines: ["Other Road"], locality: "Beirut" }, [younes])
        .ok,
    ).toBe(true);
  });

  it("matches whole words only", () => {
    expect(addressMatches("1 Main St, Jerome, USA", { locality: "Rome" })).toBe(false);
    expect(addressMatches("1 Main St, Rome, Italy", { locality: "Rome" })).toBe(true);
  });

  it("never accepts when two consented businesses match", () => {
    const twin = { name: "Cafe Younes", address: "Hamra Street 40, Beirut, Lebanon" };
    const r = matchInvitation("Cafe Younes", { locality: "Beirut" }, [younes, twin]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/ambiguous/);
  });

  it("refuses a missing address or an empty name", () => {
    expect(matchInvitation("Cafe Younes", null, [younes]).ok).toBe(false);
    expect(matchInvitation("Cafe Younes", inv(), [{ name: "Cafe Younes", address: null }]).ok).toBe(
      false,
    );
    expect(matchInvitation("  ", inv(), [younes]).ok).toBe(false);
  });
});

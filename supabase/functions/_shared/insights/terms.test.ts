// P0.5-05 (K-138, K-26): search terms. A count under Google's threshold is "fewer than N", never a number.
import { assertEquals } from "jsr:@std/assert@1";
import { normaliseTerms, termCountText } from "./terms.ts";

Deno.test("a threshold becomes fewer than 15, a value stays a number", () => {
  const rows = normaliseTerms([
    { searchKeyword: "sourdough", insightsValue: { threshold: "15" } },
    { searchKeyword: "bakery near me", insightsValue: { value: "120" } },
  ]);
  assertEquals(rows, [
    { term: "bakery near me", count: 120, fewer_than: null },
    { term: "sourdough", count: null, fewer_than: 15 },
  ]);
  assertEquals(rows.map(termCountText), ["120", "fewer than 15"]);
});

Deno.test("a below-threshold row never carries a number", () => {
  const [row] = normaliseTerms([{ searchKeyword: "rye", insightsValue: { threshold: "15" } }]);
  assertEquals(row.count, null);
});

Deno.test("empty, repeated and unreadable rows are dropped; the top ten are kept", () => {
  const many = Array.from({ length: 14 }, (_, i) => ({ searchKeyword: `term ${i}`, insightsValue: { value: String(100 - i) } }));
  const rows = normaliseTerms([
    { searchKeyword: "  ", insightsValue: { value: "9" } },
    { searchKeyword: "Bread", insightsValue: { threshold: "15" } },
    { searchKeyword: "bread", insightsValue: { value: "40" } },
    { searchKeyword: "odd", insightsValue: {} },
    ...many,
  ]);
  assertEquals(rows.length, 10);
  assertEquals(rows[0].term, "term 0");
  assertEquals(normaliseTerms([{ searchKeyword: "Bread", insightsValue: { threshold: "15" } }, { searchKeyword: "bread", insightsValue: { value: "40" } }]), [
    { term: "bread", count: 40, fewer_than: null },
  ]);
});

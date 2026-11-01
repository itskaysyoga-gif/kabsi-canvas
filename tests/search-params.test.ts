// Lean 1 (speed): the readers of src/lib/search-params.ts replace zod in the public routes' validateSearch (zod was 23 KB
// compressed in every page's first load). Each one must give exactly what the zod schema it replaced gave, for any value
// the address can carry (the router hands over strings, numbers, booleans, arrays, objects or nothing).
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { flag, intBetween, matching, oneOf, readStartSearch, text } from "../src/lib/search-params";

const SAMPLES: unknown[] = [
  undefined,
  null,
  "",
  " ",
  "a",
  "ab",
  " ab ",
  "  a  ",
  "x".repeat(59),
  "x".repeat(60),
  "x".repeat(61),
  "y ".repeat(61),
  "x".repeat(120),
  "x".repeat(121),
  "hair-salon",
  "Hair-Salon",
  "a-b",
  "a".repeat(40),
  "a".repeat(41),
  "3",
  "0",
  "1",
  "5",
  "6",
  " 3 ",
  "3.5",
  "-1",
  "1e1",
  "abc",
  "disabled",
  "normal",
  "closed",
  "custom",
  "setup",
  "partner",
  "other",
  "false",
  "true",
  0,
  1,
  3,
  5,
  6,
  2.5,
  -1,
  NaN,
  Infinity,
  true,
  false,
  [],
  ["a"],
  {},
  { a: 1 },
  "/app/plan",
  "https://evil.test",
  "ABCDEF",
  "23456A",
  "O00000",
];
const same = (a: unknown, b: unknown) => expect(a).toStrictEqual(b);
const zodOf = <T extends z.ZodType>(schema: T, v: unknown): unknown =>
  z.object({ k: schema }).parse({ k: v }).k;

describe("the search readers equal the zod schemas they replaced", () => {
  it("text(): z.string().optional().catch(undefined)", () => {
    for (const v of SAMPLES) same(text(v), zodOf(z.string().optional().catch(undefined), v));
  });
  it("text() trimmed, 2 to 120: z.string().trim().min(2).max(120)", () => {
    for (const v of SAMPLES)
      same(
        text(v, { trim: true, min: 2, max: 120 }),
        zodOf(z.string().trim().min(2).max(120).optional().catch(undefined), v),
      );
  });
  it("text() trimmed, 2 to 60", () => {
    for (const v of SAMPLES)
      same(
        text(v, { trim: true, min: 2, max: 60 }),
        zodOf(z.string().trim().min(2).max(60).optional().catch(undefined), v),
      );
  });
  it("matching(): z.string().regex(...)", () => {
    const re = /^[a-z0-9-]{2,40}$/;
    for (const v of SAMPLES)
      same(matching(v, re), zodOf(z.string().regex(re).optional().catch(undefined), v));
  });
  it("oneOf(): z.enum([...])", () => {
    for (const v of SAMPLES) {
      same(
        oneOf(v, ["disabled"] as const),
        zodOf(z.enum(["disabled"]).optional().catch(undefined), v),
      );
      same(
        oneOf(v, ["normal", "closed", "custom"] as const),
        zodOf(z.enum(["normal", "closed", "custom"]).optional().catch(undefined), v),
      );
      same(
        oneOf(v, ["setup", "partner", "other"] as const),
        zodOf(z.enum(["setup", "partner", "other"]).optional().catch(undefined), v),
      );
    }
  });
  it("intBetween(): z.coerce.number().int().min(1).max(5)", () => {
    for (const v of SAMPLES)
      same(
        intBetween(v, 1, 5),
        zodOf(z.coerce.number().int().min(1).max(5).optional().catch(undefined), v),
      );
  });
  it("flag(): z.coerce.boolean()", () => {
    for (const v of SAMPLES)
      same(flag(v), zodOf(z.coerce.boolean().optional().catch(undefined), v));
  });
});

// Polish 1 (1 Nov 2026): the /start reader replaces the zod schema of src/routes/_authenticated/start.tsx.
describe("the /start reader equals the zod schema it replaced", () => {
  const schema = z.object({
    code: z
      .string()
      .regex(/^[2-9A-HJKMNP-Za-hjkmnp-z]{6}$/)
      .optional()
      .catch(undefined),
    new: z.coerce.boolean().optional().catch(undefined),
    preview: z.enum(["wa", "wa-notyet", "wa-done", "rest"]).optional().catch(undefined),
  });
  const VALUES: unknown[] = [
    ...SAMPLES,
    "ABCDEF",
    "abcdef",
    "A2B3C4",
    "A2B3C",
    "A2B3C45",
    "A2B3C0",
    "A2B3CI",
    "A2B3CO",
    "AAAAAA\n",
    "wa",
    "rest",
    "wa-notyet",
    "wa-done",
    "WA",
    "true",
    "false",
    "0",
    "1",
    0,
    1,
    true,
    false,
    [],
    ["wa"],
    {},
    NaN,
  ];
  it("gives the same result for every combination of values", () => {
    const SMALL = [
      undefined,
      null,
      "",
      "ABCDEF",
      "A2B3CI",
      "wa",
      "rest",
      "false",
      "0",
      0,
      true,
      false,
      [],
      {},
    ];
    for (const code of SMALL)
      for (const nw of SMALL)
        for (const preview of SMALL) {
          const input = { code, new: nw, preview };
          expect(readStartSearch(input), JSON.stringify(input)).toEqual(schema.parse(input));
        }
  });
  it("gives the same result when keys are missing", () => {
    expect(readStartSearch({})).toEqual(schema.parse({}));
    for (const v of VALUES) {
      expect(readStartSearch({ code: v })).toEqual(schema.parse({ code: v }));
      expect(readStartSearch({ new: v })).toEqual(schema.parse({ new: v }));
      expect(readStartSearch({ preview: v })).toEqual(schema.parse({ preview: v }));
    }
  });
});

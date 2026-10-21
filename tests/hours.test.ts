import { describe, expect, it } from "vitest";
import * as client from "../src/lib/hours";
import * as server from "../supabase/functions/_shared/hours";

// P0.5-03 (K-21): the Hours screen checks a week the way the server does, and fills itself from what Business
// Knowledge holds. The two files must agree, so the owner never sees a week accepted that the server then refuses.
const wk = (days: Partial<Record<client.DayKey, client.HoursPeriod[]>>): client.Week => ({
  ...client.emptyWeek(),
  ...days,
});
const SAMPLES: client.Week[] = [
  client.emptyWeek(),
  wk({ MONDAY: [{ open: "09:00", close: "17:00" }], TUESDAY: [{ open: "09:00", close: "17:00" }] }),
  wk({
    FRIDAY: [{ open: "18:00", close: "00:00" }],
    SATURDAY: [{ open: "18:00", close: "02:00" }],
  }),
  wk({
    MONDAY: [
      { open: "09:00", close: "13:00" },
      { open: "12:00", close: "17:00" },
    ],
  }),
  wk({ MONDAY: [{ open: "01:00", close: "05:00" }], SUNDAY: [{ open: "20:00", close: "03:00" }] }),
  wk({ MONDAY: [{ open: "09:00", close: "09:00" }] }),
  wk({ MONDAY: [{ open: "9:00", close: "17:00" }] }),
  wk({
    MONDAY: [
      { open: "06:00", close: "07:00" },
      { open: "08:00", close: "09:00" },
      { open: "10:00", close: "11:00" },
      { open: "12:00", close: "13:00" },
    ],
  }),
  wk({
    MONDAY: [
      { open: "08:30", close: "12:00" },
      { open: "14:00", close: "00:00" },
    ],
    SATURDAY: [{ open: "10:00", close: "16:00" }],
    SUNDAY: [],
  }),
];

describe("the editor and the server agree", () => {
  it("accept and refuse the same weeks, with the same words", () => {
    for (const w of SAMPLES)
      expect(client.validateWeek(w), JSON.stringify(w)).toBe(server.validateWeek(w));
  });

  it("say a week back in the same plain words", () => {
    for (const w of SAMPLES) expect(client.weekSummary(w)).toEqual(server.weekSummary(w));
  });

  it("read Google's shape the same way", () => {
    for (const w of SAMPLES.filter((s) => server.validateWeek(s) === null)) {
      const raw = server.weekToRaw(w);
      expect(client.rawToWeek(raw)).toEqual(server.rawToWeek(raw));
      expect(client.rawToWeek(raw)).toEqual(w);
    }
  });
});

describe("filling the editor from what Business Knowledge holds", () => {
  it("prefers Google's own shape", () => {
    const w = wk({ MONDAY: [{ open: "09:00", close: "17:30" }] });
    const raw = server.weekToRaw(w);
    expect(client.weekFromFact({ display: server.regularHoursDisplay(raw), raw })).toEqual(w);
  });

  it("reads the display lines Google Protection has stored", () => {
    const sun = client.weekFromDisplay("Mon to Sun 09:00 to 22:00")!;
    expect(sun.WEDNESDAY).toEqual([{ open: "09:00", close: "22:00" }]);
    expect(sun.SUNDAY).toEqual([{ open: "09:00", close: "22:00" }]);
    const mixed = client.weekFromDisplay("Mon to Sat 09:00 to 22:00, Sun 09:00 to 18:00")!;
    expect(mixed.SATURDAY).toEqual([{ open: "09:00", close: "22:00" }]);
    expect(mixed.SUNDAY).toEqual([{ open: "09:00", close: "18:00" }]);
    const periods = client.weekFromDisplay("Mon 09:00 to 12:00, Mon 14:00 to 24:00")!;
    expect(periods.MONDAY).toEqual([
      { open: "09:00", close: "12:00" },
      { open: "14:00", close: "00:00" },
    ]);
  });

  it("does not guess at anything else", () => {
    expect(client.weekFromDisplay("Open daily, ask us")).toBeNull();
    expect(client.weekFromDisplay("")).toBeNull();
    expect(client.weekFromDisplay("Sun to Mon 09:00 to 17:00")).toBeNull();
    expect(client.weekFromFact(null)).toBeNull();
  });

  it("knows when nothing changed", () => {
    const a = wk({
      MONDAY: [
        { open: "14:00", close: "18:00" },
        { open: "09:00", close: "12:00" },
      ],
    });
    const b = wk({
      MONDAY: [
        { open: "09:00", close: "12:00" },
        { open: "14:00", close: "18:00" },
      ],
    });
    expect(client.sameWeek(a, b)).toBe(true);
    expect(client.sameWeek(a, client.emptyWeek())).toBe(false);
  });
});

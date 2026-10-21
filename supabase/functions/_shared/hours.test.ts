// P0.5-03 (K-21): the weekly model, Google's shape and the one-line display Google Protection compares.
import { assertEquals } from "jsr:@std/assert@1";
import { emptyWeek, parseWeek, rawToWeek, regularHoursDisplay, sameWeek, validateWeek, weekSummary, weekToRaw, type Week } from "./hours.ts";

const weekdays = (open: string, close: string): Week => {
  const w = emptyWeek();
  for (const d of ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const) w[d] = [{ open, close }];
  return w;
};

Deno.test("the display is the line Google Protection has always compared", () => {
  const raw = weekToRaw(weekdays("09:00", "17:30"));
  assertEquals(regularHoursDisplay(raw), "Mon 09:00 to 17:30, Tue 09:00 to 17:30, Wed 09:00 to 17:30, Thu 09:00 to 17:30, Fri 09:00 to 17:30");
  assertEquals(raw.periods![0], { openDay: "MONDAY", openTime: { hours: 9 }, closeDay: "MONDAY", closeTime: { hours: 17, minutes: 30 } });
  // A read of Google's own response, with the zero minutes it leaves out, gives the same line.
  assertEquals(regularHoursDisplay({ periods: [{ openDay: "SUNDAY", openTime: { hours: 9 }, closeDay: "SUNDAY", closeTime: { hours: 18 } }] }), "Sun 09:00 to 18:00");
  assertEquals(regularHoursDisplay(null), "");
});

Deno.test("closing at midnight is Google's 24:00, and after midnight closes the next day", () => {
  const w = emptyWeek();
  w.FRIDAY = [{ open: "18:00", close: "00:00" }];
  w.SATURDAY = [{ open: "18:00", close: "02:00" }];
  w.SUNDAY = [{ open: "18:00", close: "01:30" }];
  assertEquals(validateWeek(w), null);
  const [fri, sat, sun] = weekToRaw(w).periods!;
  assertEquals(fri, { openDay: "FRIDAY", openTime: { hours: 18 }, closeDay: "FRIDAY", closeTime: { hours: 24 } });
  assertEquals(sat, { openDay: "SATURDAY", openTime: { hours: 18 }, closeDay: "SUNDAY", closeTime: { hours: 2 } });
  assertEquals(sun, { openDay: "SUNDAY", openTime: { hours: 18 }, closeDay: "MONDAY", closeTime: { hours: 1, minutes: 30 } });
  assertEquals(regularHoursDisplay(weekToRaw(w)), "Fri 18:00 to 24:00, Sat 18:00 to 02:00, Sun 18:00 to 01:30");
});

Deno.test("a week survives the trip to Google's shape and back", () => {
  const w = weekdays("08:30", "12:00");
  w.MONDAY = [{ open: "08:30", close: "12:00" }, { open: "14:00", close: "00:00" }];
  w.SATURDAY = [{ open: "10:00", close: "16:00" }];
  assertEquals(rawToWeek(weekToRaw(w)), w);
  assertEquals(sameWeek(rawToWeek(weekToRaw(w)), w), true);
});

Deno.test("what the owner can send is checked", () => {
  assertEquals(validateWeek(emptyWeek())?.startsWith("Choose at least one open day"), true);
  assertEquals(validateWeek(weekdays("09:00", "09:00")), "A period needs different opening and closing times.");
  assertEquals(validateWeek(weekdays("9:00", "17:00")), "Add an opening and a closing time for each period.");
  const overlap = emptyWeek();
  overlap.MONDAY = [{ open: "09:00", close: "13:00" }, { open: "12:00", close: "17:00" }];
  assertEquals(validateWeek(overlap), "Two periods overlap. Check the times.");
  const spill = emptyWeek();
  spill.MONDAY = [{ open: "01:00", close: "05:00" }];
  spill.SUNDAY = [{ open: "20:00", close: "03:00" }]; // runs into Monday 03:00, inside Monday's period
  assertEquals(validateWeek(spill), "Two periods overlap. Check the times.");
  const four = emptyWeek();
  four.MONDAY = [{ open: "06:00", close: "07:00" }, { open: "08:00", close: "09:00" }, { open: "10:00", close: "11:00" }, { open: "12:00", close: "13:00" }];
  assertEquals(validateWeek(four), "At most 3 opening periods a day.");
});

Deno.test("a week from the app is read strictly", () => {
  assertEquals(parseWeek("x"), null);
  assertEquals(parseWeek({ MONDAY: "9 to 5" }), null);
  assertEquals(parseWeek({ MONDAY: [{ open: 9, close: "17:00" }] }), null);
  assertEquals(parseWeek({ MONDAY: [{ open: "09:00", close: "17:00" }], FUNDAY: [{ open: "1", close: "2" }] })!.MONDAY, [{ open: "09:00", close: "17:00" }]);
});

Deno.test("the confirmation lines group days that are the same", () => {
  const w = weekdays("09:00", "17:00");
  w.SATURDAY = [{ open: "10:00", close: "00:00" }];
  assertEquals(weekSummary(w), ["Mon to Fri: 09:00 to 17:00", "Sat: 10:00 to midnight", "Sun: Closed"]);
});

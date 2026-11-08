// RB-C2: every normalizer. Arabic script is written as escapes, never typed.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { garageV1, salonV1 } from "../packs/index.ts";
import { foldKey, readable, toLatinDigits, wordsOnly } from "./digits.ts";
import { normalizeWhen } from "./dates.ts";
import { NORMALIZER_VERSIONS, normalizeMessage } from "./index.ts";
import { normalizePhone, PHONE_VERSION } from "./phone.ts";
import { normalizeVocabulary } from "./vocabulary.ts";

// The Arabic-Indic digits 0501234567 and the Eastern Arabic-Indic ones.
const ARABIC_INDIC = "٠٥٠١٢٣٤٥٦٧";
const EASTERN = "۰۵۰۱۲۳۴۵۶۷";
const FULL_WIDTH = "０５０１２３４５６７";

// Sunday 8 Nov 2026, 14:00 in Dubai.
const NOW = new Date("2026-11-08T10:00:00Z");
const DUBAI = "Asia/Dubai";
const when = (t: string, tz = DUBAI, now = NOW) => normalizeWhen(t, { now, timeZone: tz });

Deno.test("every normalizer has a version, and every result carries it", () => {
  for (const [name, v] of Object.entries(NORMALIZER_VERSIONS)) assert(Number.isInteger(v) && v >= 1, `${name} version`);
  const m = normalizeMessage("Sarah highlights tomorrow 10, 0501234567", { country: "AE", timeZone: DUBAI, now: NOW, pack: salonV1 });
  assertEquals(m.phone.version, NORMALIZER_VERSIONS.phone);
  assertEquals(m.when.version, NORMALIZER_VERSIONS.dates);
  assertEquals(m.services.version, NORMALIZER_VERSIONS.vocabulary);
  assertEquals(normalizePhone("nothing here", "AE").version, NORMALIZER_VERSIONS.phone);
  assertEquals(when("nothing here").version, NORMALIZER_VERSIONS.dates);
  assertEquals(normalizeVocabulary("nothing here", salonV1).version, NORMALIZER_VERSIONS.vocabulary);
});

// ---- digits ---------------------------------------------------------------------------------------------------

Deno.test("digits: Arabic-Indic, Eastern Arabic-Indic and full-width digits become Latin, one character for one", () => {
  for (const s of [ARABIC_INDIC, EASTERN, FULL_WIDTH]) {
    assertEquals(toLatinDigits(s), "0501234567");
    assertEquals(toLatinDigits(s).length, s.length);
  }
  assertEquals(toLatinDigits("Ali 3ali"), "Ali 3ali");
});

Deno.test("digits: readable() and wordsOnly() keep the length, so a position in one is a position in the original", () => {
  const s = `Ali's Corolla ${ARABIC_INDIC}, bukra-10`;
  assertEquals(readable(s).length, s.length);
  assertEquals(wordsOnly(s).length, s.length);
  assertEquals(readable("ABC"), "abc");
  assertEquals(wordsOnly("blow-dry, 3pm"), "blow dry  3pm");
});

Deno.test("digits: foldKey ignores case, accents, spacing and digit forms, and never changes what is shown", () => {
  assertEquals(foldKey("  Zoë   KHOURY "), "zoe khoury");
  assertEquals(foldKey(`Room ${ARABIC_INDIC}`), "room 0501234567");
  assertEquals(foldKey("أحمد"), foldKey("احمد"));
});

// ---- phone ----------------------------------------------------------------------------------------------------

Deno.test("phone: a local number is read with the location's country", () => {
  const r = normalizePhone("Sarah highlights, 0501234567, Thursday", "AE");
  assertEquals(r.status, "ok");
  if (r.status === "ok") {
    assertEquals(r.value, "+971501234567");
    assertEquals(r.raw, "0501234567");
    assertEquals("Sarah highlights, 0501234567, Thursday".slice(r.start, r.end), r.raw);
  }
});

Deno.test("phone: the same digits mean different numbers in different countries, and no country means unknown for a local number", () => {
  const lb = normalizePhone("Ali 03 123 456", "LB");
  assert(lb.status === "ok" && lb.value === "+9613123456");
  assertEquals(normalizePhone("Ali 03 123 456", null).status, "unknown");
  assertEquals(normalizePhone("Ali 0501234567", null).status, "unknown");
});

Deno.test("phone: an international number needs no country", () => {
  const r = normalizePhone("call +971 50 123 4567 please", null);
  assert(r.status === "ok" && r.value === "+971501234567");
  const r2 = normalizePhone("call 00971501234567", null);
  assert(r2.status === "ok" && r2.value === "+971501234567");
});

Deno.test("phone: Arabic-Indic, Eastern Arabic-Indic and full-width digits are read, and the evidence points into the original", () => {
  for (const digits of [ARABIC_INDIC, EASTERN, FULL_WIDTH]) {
    const text = `Layla ${digits} tomorrow`;
    const r = normalizePhone(text, "AE");
    assert(r.status === "ok" && r.value === "+971501234567");
    if (r.status === "ok") assertEquals(text.slice(r.start, r.end), digits);
  }
});

Deno.test("phone: a digit inside written-out Arabic is not a phone (3ali, 7assan, 3am, el7)", () => {
  for (const t of ["3ali, korolla, el frem 3am ysar3o", "7assan 7ammoud", "ma3 3ali w 7assan", "el7 ya3ni", "m3alem 5"]) {
    const r = normalizePhone(t, "AE");
    assertEquals(r.status, "unknown", t);
  }
});

Deno.test("phone: a digit against letters stays out even when a real number is in the same message", () => {
  const r = normalizePhone("3ali 0501234567 7assan", "AE");
  assert(r.status === "ok" && r.value === "+971501234567" && r.raw === "0501234567");
});

Deno.test("phone: a year, a time, a job number or a partial registration is not a phone", () => {
  for (const t of ["Corolla 2016 B123", "tomorrow 10", "job 42", "ends 456", "2016", "10:30", "AB12 CDE"]) {
    assertEquals(normalizePhone(t, "AE").status, "unknown", t);
  }
});

Deno.test("phone: a run that does not pass as a whole still yields a number made of whole groups", () => {
  const r = normalizePhone("Corolla 2016 050 123 4567", "AE");
  assert(r.status === "ok" && r.value === "+971501234567" && r.raw === "050 123 4567");
});

Deno.test("phone: a number that fails the check is unknown, never repaired", () => {
  assertEquals(normalizePhone("call 0501234", "AE").status, "unknown");
  assertEquals(normalizePhone("call 05012345678901", "AE").status, "unknown");
  assertEquals(normalizePhone("call 1111111111", "AE").status, "unknown");
});

Deno.test("phone: two different numbers are ambiguous with both listed, and the same number twice is one", () => {
  const two = normalizePhone("0501234567 or 0551234567", "AE");
  assertEquals(two.status, "ambiguous");
  if (two.status === "ambiguous") assertEquals(two.candidates.map((c) => c.value).sort(), ["+971501234567", "+971551234567"]);
  const same = normalizePhone("0501234567 and again +971501234567", "AE");
  assert(same.status === "ok" && same.value === "+971501234567");
});

Deno.test("phone: a message at the 8,000 character limit costs a bounded amount and never a wrong number", () => {
  const long: Record<string, string> = {
    singleDigits: "1 ".repeat(4000),
    oneRun: "0".repeat(8000),
    dashed: "1-".repeat(4000),
    plusSigns: "+".repeat(8000),
    repeatedNumber: "0501234567 ".repeat(700),
    brokenRuns: "tomorrow 10 03 123 456 ".repeat(340),
  };
  for (const [name, text] of Object.entries(long)) {
    const t = performance.now();
    const r = normalizePhone(text, "AE");
    assert(performance.now() - t < 2000, `${name} took too long`);
    assert(r.status === "unknown" || (name === "repeatedNumber" && r.status === "ok"), `${name}: ${r.status}`);
  }
  assertEquals(normalizePhone("1 ".repeat(4000), "AE"), { status: "unknown", reason: "too_many_candidates", version: PHONE_VERSION });
});

// ---- dates ----------------------------------------------------------------------------------------------------

Deno.test("dates and vocabulary: a message at the 8,000 character limit is read in a bounded time", () => {
  for (const text of ["next ".repeat(1600), "in the ".repeat(1100), "1/".repeat(4000), "oil ".repeat(2000), " ".repeat(8000), "tomorrow ".repeat(900)]) {
    const t = performance.now();
    when(text);
    normalizeVocabulary(text, garageV1);
    assert(performance.now() - t < 2000);
  }
});

Deno.test("dates: tomorrow with an hour is that day at that hour in the location's zone", () => {
  for (const t of ["tomorrow 10", "bukra l 10", "bukra 10", "tomorrow at 10", "tomorrow 10am", "tomorrow 10:00"]) {
    const r = when(t);
    assert(r.status === "ok", t);
    if (r.status === "ok") {
      assertEquals([r.date, r.time], ["2026-11-09", "10:00"], t);
      assertEquals(r.startsAt, "2026-11-09T06:00:00.000Z", t); // 10:00 in Dubai is 06:00 UTC
    }
  }
});

Deno.test("dates: the day is the location's day, not the server's", () => {
  // 23:30 UTC on Sunday is already Monday 03:30 in Dubai, so tomorrow there is Tuesday.
  const late = new Date("2026-11-08T23:30:00Z");
  const r = when("tomorrow 10", DUBAI, late);
  assert(r.status === "ok" && r.date === "2026-11-10");
  const l = when("tomorrow 10", "America/Los_Angeles", late);
  assert(l.status === "ok" && l.date === "2026-11-09" && l.startsAt === "2026-11-09T18:00:00.000Z");
});

Deno.test("dates: today, the day after tomorrow, and written-out Arabic day words", () => {
  const t = when("today 15:30");
  assert(t.status === "ok" && t.date === "2026-11-08" && t.time === "15:30");
  const a = when("ba3d bukra 11");
  assert(a.status === "ok" && a.date === "2026-11-10" && a.time === "11:00");
  const l = when("lyom 4pm");
  assert(l.status === "ok" && l.date === "2026-11-08" && l.time === "16:00");
});

Deno.test("dates: a weekday is the next one; today's own name could be today or a week on, so it is ambiguous", () => {
  const th = when("Thursday 3pm");
  assert(th.status === "ok" && th.date === "2026-11-12" && th.time === "15:00");
  const sun = when("Sunday 4pm"); // NOW is a Sunday
  assertEquals(sun.status, "ambiguous");
  if (sun.status === "ambiguous") assertEquals(sun.candidates.map((c) => c.date), ["2026-11-08", "2026-11-15"]);
  const next = when("next thursday 3pm");
  assertEquals(next.status, "ambiguous");
});

Deno.test("dates: a bare hour from 1 to 7 is ambiguous, 8 to 12 and 13 to 23 are read as written, and am or pm settles it", () => {
  const six = when("Monday 6");
  assertEquals(six.status, "ambiguous");
  if (six.status === "ambiguous") assertEquals(six.candidates.map((c) => c.time), ["06:00", "18:00"]);
  const three = when("Thursday 3");
  assertEquals(three.status, "ambiguous");
  const ten = when("Thursday 10");
  assert(ten.status === "ok" && ten.time === "10:00");
  const fifteen = when("Thursday 15:30");
  assert(fifteen.status === "ok" && fifteen.time === "15:30");
  const pm = when("Monday 6pm");
  assert(pm.status === "ok" && pm.time === "18:00");
  const am = when("Monday 6 am");
  assert(am.status === "ok" && am.time === "06:00");
  const noon = when("Monday 12pm");
  assert(noon.status === "ok" && noon.time === "12:00");
  const midnight = when("Monday 12am");
  assert(midnight.status === "ok" && midnight.time === "00:00");
});

Deno.test("dates: a day part with no hour stays a window and gets no time", () => {
  for (const [t, part] of [["Thursday afternoon", "afternoon"], ["tomorrow morning", "morning"], ["Friday evening", "evening"], ["bukra ba3d el dohr", "afternoon"]] as const) {
    const r = when(t);
    assert(r.status === "ok", t);
    if (r.status === "ok") {
      assertEquals(r.time, null, t);
      assertEquals(r.startsAt, null, t);
      assertEquals(r.dayPart, part, t);
      assert(r.date !== null, t);
    }
  }
});

Deno.test("dates: a written date, with or without a year, and a slash date that could be read two ways", () => {
  const a = when("10 Nov 5pm");
  assert(a.status === "ok" && a.date === "2026-11-10" && a.time === "17:00");
  const b = when("November 10th");
  assert(b.status === "ok" && b.date === "2026-11-10" && b.time === null && b.startsAt === null);
  const c = when("2 Jan"); // already passed this year, so it is next year's
  assert(c.status === "ok" && c.date === "2027-01-02");
  const d = when("5 march 2027");
  assert(d.status === "ok" && d.date === "2027-03-05");
  const e = when("20/11");
  assert(e.status === "ok" && e.date === "2026-11-20");
  const f = when("10/11");
  assertEquals(f.status, "ambiguous");
});

Deno.test("dates: a date that does not exist, an hour that does not exist and a bad zone are unknown", () => {
  assertEquals(when("31 Feb").status, "unknown");
  const hour = when("Thursday 25");
  assertEquals(hour.status, "unknown");
  assertEquals(when("tomorrow 10", "Not/AZone").status, "unknown");
  assertEquals(normalizeWhen("tomorrow 10", { now: new Date("nope"), timeZone: DUBAI }).status, "unknown");
});

Deno.test("dates: a wall time that a clock change skips does not exist", () => {
  // The UK clocks went forward at 01:00 on 28 Mar 2027: 01:30 that morning never happened.
  const now = new Date("2027-03-20T12:00:00Z");
  assertEquals(normalizeWhen("28 Mar 1:30am", { now, timeZone: "Europe/London" }).status, "unknown");
  const ok = normalizeWhen("28 Mar 2:30am", { now, timeZone: "Europe/London" });
  assert(ok.status === "ok" && ok.startsAt === "2027-03-28T01:30:00.000Z"); // BST is UTC+1
  const winter = normalizeWhen("20 Mar 10am", { now, timeZone: "Europe/London" });
  assert(winter.status === "ok" && winter.startsAt === "2027-03-20T10:00:00.000Z");
});

Deno.test("dates: a message with no day or hour is unknown, and a phone number is not an hour", () => {
  assertEquals(when("ok thanks").status, "unknown");
  assertEquals(when("Ali Corolla 2016 brakes").status, "unknown");
  const r = when("Ali tomorrow 03 123 456");
  assert(r.status === "ok" && r.time === null && r.startsAt === null);
});

Deno.test("dates: the evidence is the words in the original message", () => {
  const ten = "\u0661\u0660"; // 10 in Arabic-Indic digits
  const text = `Sarah highlights BUKRA L ${ten} please`;
  const r = when(text);
  assert(r.status === "ok");
  if (r.status === "ok") {
    assertEquals(text.slice(r.start, r.end), r.raw);
    assertEquals(r.raw, `BUKRA L ${ten}`);
    assertEquals(r.time, "10:00");
  }
});

// ---- vocabulary -----------------------------------------------------------------------------------------------

Deno.test("vocabulary: spellings from the pack, written-out Arabic included, give its services", () => {
  const r = normalizeVocabulary("3ali, korolla, el frem 3am ysar3o", garageV1);
  assert(r.status === "ok");
  if (r.status === "ok") assertEquals(r.matches.map((m) => m.key), ["brakes"]);
  const mixed = normalizeVocabulary("Ali's Civic, ghayyer zeit w filter, ba3d el dohr", garageV1);
  assert(mixed.status === "ok");
  if (mixed.status === "ok") assertEquals(mixed.matches.map((m) => m.key), ["oil_change"]);
});

Deno.test("vocabulary: whole words only, so a word inside another word or against a digit is not a match", () => {
  assertEquals(normalizeVocabulary("oilfield", garageV1).status, "unknown");
  assertEquals(normalizeVocabulary("3frem", garageV1).status, "unknown");
  assertEquals(normalizeVocabulary("frem3", garageV1).status, "unknown");
  assertEquals(normalizeVocabulary("fremont", garageV1).status, "unknown");
});

Deno.test("vocabulary: punctuation and case never hide a word, and the longest spelling wins", () => {
  const r = normalizeVocabulary("Blow-Dry and a BEARD TRIM, thanks", salonV1);
  assert(r.status === "ok");
  if (r.status === "ok") assertEquals(r.matches.map((m) => m.key), ["blow_dry", "beard"]); // "trim" alone would be a haircut
});

Deno.test("vocabulary: the same service written twice is one, and the evidence is the original words", () => {
  const text = "Brakes, brake pads and BRAKES again";
  const r = normalizeVocabulary(text, garageV1);
  assert(r.status === "ok");
  if (r.status === "ok") {
    assertEquals(r.matches.length, 1);
    const m = r.matches[0]!;
    assertEquals(text.slice(m.start, m.end), m.raw);
  }
});

Deno.test("vocabulary: nothing the pack knows is unknown, and a different pack knows different words", () => {
  assertEquals(normalizeVocabulary("ok thanks", salonV1).status, "unknown");
  assertEquals(normalizeVocabulary("brakes", salonV1).status, "unknown");
  assertEquals(normalizeVocabulary("highlights", garageV1).status, "unknown");
});

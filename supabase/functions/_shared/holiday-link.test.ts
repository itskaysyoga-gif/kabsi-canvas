// P0.5-03 (K-131, K-17, K-70): the holiday link page. The token is the credential for "normal hours"; "closed" and "custom"
// need the signed-in member; a second answer gets the first result; the undo works inside its 10 seconds.
import { assertEquals } from "jsr:@std/assert@1";
import { type AnswerInput, type HolidayLinkDeps, type HolidayView, holidayGet, holidayPost } from "./holiday-link.ts";

const TOKEN = "T".repeat(43);
const VIEW: HolidayView = {
  status: "ok", business: "Yawmiyati", location_id: "loc", demo: false,
  holiday: { name: "Christmas Day", starts_on: "2026-12-25", ends_on: "2026-12-25", kind: "public", estimated: false }, regular_hours: "Mon 09:00 to 17:00",
};

function setup(o: { session?: string | null; view?: HolidayView; fail?: string } = {}) {
  const calls = { used: [] as AnswerInput[], undone: [] as (string | null)[] };
  const deps: HolidayLinkDeps = {
    sessionUser: () => Promise.resolve(o.session === undefined ? null : o.session),
    view: () => Promise.resolve(o.view ?? VIEW),
    use: (_h, input) => {
      calls.used.push(input);
      if (o.fail) return Promise.reject(new Error(o.fail));
      return Promise.resolve({ state: "answered", answer: input.answer, publication_id: input.answer === "normal" ? undefined : "pub-1", publish_after: "2026-12-20T09:00:10Z" });
    },
    undo: (_h, user) => {
      calls.undone.push(user);
      return Promise.resolve();
    },
  };
  return { deps, calls };
}

Deno.test("opening the link shows the holiday and changes nothing", async () => {
  const { deps, calls } = setup({ session: "u1" });
  const r = await holidayGet(TOKEN, deps);
  assertEquals(r.status, 200);
  assertEquals(r.body.holiday, VIEW.holiday);
  assertEquals(r.body.signed_in, true);
  assertEquals(calls.used.length + calls.undone.length, 0);
  assertEquals((await holidayGet("short", deps)).status, 404);
  assertEquals((await holidayGet(TOKEN, setup({ view: { status: "invalid" } }).deps)).status, 404);
});

Deno.test("normal hours needs only the link", async () => {
  const { deps, calls } = setup({ session: null });
  const r = await holidayPost({ t: TOKEN, do: "answer", answer: "normal" }, deps);
  assertEquals(r.status, 200);
  assertEquals(r.body.state, "answered");
  assertEquals(r.body.publication, null);
  assertEquals(calls.used[0]!.session, null);
});

Deno.test("closed and custom pass the session, the times and the moved days on, and nothing else", async () => {
  const { deps, calls } = setup({ session: "u1" });
  const r = await holidayPost({ t: TOKEN, do: "answer", answer: "custom", open: "10:00", close: "16:00", from: "2026-12-25", to: "2026-12-26", extra: "x" }, deps);
  assertEquals(r.body.publication, "pub-1");
  assertEquals(calls.used[0], { answer: "custom", session: "u1", open: "10:00", close: "16:00", from: "2026-12-25", to: "2026-12-26" });
  const bad = await holidayPost({ t: TOKEN, do: "answer", answer: "custom", open: "10", close: "x", from: "tomorrow" }, deps);
  assertEquals(calls.used[1], { answer: "custom", session: "u1", open: undefined, close: undefined, from: undefined, to: undefined });
  assertEquals(bad.status, 200); // the database refuses the missing times; the page never forwards garbage
});

Deno.test("the database's refusals are said in plain words", async () => {
  const cases: [string, number, string][] = [
    ["sign_in_required", 401, "sign_in_required"], ["not_allowed_to_approve", 403, "owner_approves"], ["bad_times", 400, "bad_times"],
    ["bad_dates", 400, "bad_dates"], ["already_saved", 409, "already_saved"], ["link_expired", 410, "expired"], ["holiday_passed", 410, "holiday_passed"],
    ["invalid_link", 404, "invalid"],
  ];
  for (const [needle, status, code] of cases) {
    const r = await holidayPost({ t: TOKEN, do: "answer", answer: "closed" }, setup({ session: "u1", fail: `P0001: ${needle}` }).deps);
    assertEquals([r.status, r.body.error], [status, code], needle);
  }
});

Deno.test("an unexpected failure is thrown for the caller to report", async () => {
  let threw = false;
  try {
    await holidayPost({ t: TOKEN, do: "answer", answer: "closed" }, setup({ session: "u1", fail: "connection reset" }).deps);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("a bad token, verb or answer is refused", async () => {
  const { deps } = setup();
  assertEquals((await holidayPost({ t: "x", do: "answer", answer: "normal" }, deps)).status, 404);
  assertEquals((await holidayPost({ t: TOKEN, do: "delete" }, deps)).status, 400);
  assertEquals((await holidayPost({ t: TOKEN, do: "answer", answer: "open late" }, deps)).status, 400);
});

Deno.test("undo is for the signed-in member and goes to the database once", async () => {
  const { deps, calls } = setup({ session: "u1" });
  const r = await holidayPost({ t: TOKEN, do: "undo" }, deps);
  assertEquals(r.body.state, "undone");
  assertEquals(calls.undone, ["u1"]);
});

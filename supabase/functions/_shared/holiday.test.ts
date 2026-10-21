// P0.5-03 (K-131): the holiday questions are emailed once, with a link of their own, and the words never assume anything.
import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { type HolidayAsk, type HolidayAskDeps, linkExpiry, newToken, sendHolidayAsks, whenWords } from "./holiday.ts";
const sha256Hex = (t: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)).then((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""));

const ASK: HolidayAsk = { id: "p1", name: "Christmas Day", starts_on: "2026-12-25", ends_on: "2026-12-25", kind: "public", estimated: false, business: "Yawmiyati" };

function setup(asks: HolidayAsk[]) {
  const calls = { marked: [] as { id: string; hash: string; expires: Date }[], notified: [] as Parameters<HolidayAskDeps["notify"]>[0][] };
  const deps: HolidayAskDeps = {
    toSend: () => Promise.resolve(asks),
    markSent: (id, hash, expires) => {
      calls.marked.push({ id, hash, expires });
      return Promise.resolve();
    },
    notify: (input) => {
      calls.notified.push(input);
      return Promise.resolve();
    },
    sha256: sha256Hex,
    random: () => new Uint8Array(32).fill(7),
    now: () => new Date("2026-12-20T09:00:00Z"),
    appUrl: "https://kabsi.co",
  };
  return { deps, calls };
}

Deno.test("each open question is emailed once, with its own link", async () => {
  const { deps, calls } = setup([ASK, { ...ASK, id: "p2", name: "Boxing Day (substitute day)", starts_on: "2026-12-28", ends_on: "2026-12-28" }]);
  assertEquals(await sendHolidayAsks("loc-1", deps), 2);
  assertEquals(calls.marked.length, 2);
  assertEquals(calls.notified.length, 2);
  const first = calls.notified[0]!;
  assertEquals(first.kind, "holiday_hours");
  assertEquals(first.to, "owners");
  assertEquals(first.inApp, { title: "Your hours for Christmas Day", link: "/app/hours" });
  assertEquals(first.content.subject, "Yawmiyati: your hours for Christmas Day");
  assertMatch(first.content.button!.url, /^https:\/\/kabsi\.co\/h\/[A-Za-z0-9_-]{43}$/);
  assertEquals(first.content.links!.map((l) => l.label), ["Normal hours", "Closed", "Custom hours"]);
  // The database keeps only the hash of the link; the raw link is in the email.
  const token = first.content.button!.url.split("/h/")[1]!;
  assertEquals(calls.marked[0]!.hash, await sha256Hex(token));
  assert(!JSON.stringify(calls.marked).includes(token));
});

Deno.test("nothing to send sends nothing", async () => {
  const { deps, calls } = setup([]);
  assertEquals(await sendHolidayAsks("loc-1", deps), 0);
  assertEquals(calls.notified.length, 0);
});

Deno.test("the words say what is asked and assume nothing", async () => {
  const { deps, calls } = setup([ASK]);
  await sendHolidayAsks("loc-1", deps);
  const c = calls.notified[0]!.content;
  assertMatch(c.text, /Christmas Day is on Friday 25 December\. Customers check Google for your hours first\./);
  assertMatch(c.text, /Kabsi never assumes holiday hours/);
  assertMatch(c.text, /Nothing changes on Google until you do/);
  for (const part of [c.subject, c.title, c.preheader, c.bodyHtml, c.text]) assert(!/[—–!]/.test(part), part);
});

Deno.test("a date that follows the moon is expected, and Ramadan has no Closed", async () => {
  const eid = setup([{ ...ASK, id: "e", name: "Eid al-Fitr", kind: "islamic", estimated: true, starts_on: "2027-03-09", ends_on: "2027-03-11" }]);
  await sendHolidayAsks("loc-1", eid.deps);
  assertMatch(eid.calls.notified[0]!.content.text, /Eid al-Fitr is expected on 9 March to 11 March\..*follows the moon/s);
  const ram = setup([{ ...ASK, id: "r", name: "Ramadan", kind: "ramadan", estimated: true, starts_on: "2027-02-08", ends_on: "2027-03-08" }]);
  await sendHolidayAsks("loc-1", ram.deps);
  assertEquals(ram.calls.notified[0]!.content.links!.map((l) => l.label), ["Normal hours", "Different hours"]);
});

Deno.test("dates in words, the link's last day and the token", () => {
  assertEquals(whenWords("2026-12-25", "2026-12-25"), "Friday 25 December");
  assertEquals(whenWords("2027-02-06", "2027-02-08"), "6 February to 8 February");
  assertEquals(linkExpiry("2026-12-25", new Date("2026-12-20T09:00:00Z")).toISOString(), "2026-12-27T00:00:00.000Z");
  assertEquals(linkExpiry("2027-03-11", new Date("2026-12-20T09:00:00Z")).toISOString(), "2026-12-27T09:00:00.000Z");
  assertEquals(newToken(new Uint8Array(32).fill(255)).length, 43);
});

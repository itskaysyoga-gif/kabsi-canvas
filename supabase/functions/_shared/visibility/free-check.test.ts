// Scan 2 (master plan 30.29): the free check's AI question names the town and the country, a business the answer names is
// shown only when Google Maps has it near the business, names not in Latin letters are never shown, and a check of the
// same place and search is reused for 7 days without paying again. Fixtures: tests/fixtures/free-check/scan2-5nov.json.
import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import fx from "../../../../tests/fixtures/free-check/scan2-5nov.json" with { type: "json" };
import type { MapsItem, MapsProvider } from "./dataforseo.ts";
import {
  aiLine, aiLines, aiQuestion, type CheckRow, collectCheck, matchLocal, NOT_NEAR, publicView, safeNearby, startCheck, type StartDeps, storeAi,
} from "./free-check.ts";
import { cardLine, type Nearby } from "./nearby.ts";
import { analyze } from "./ai/analyze.ts";
import type { FreeCheck } from "./ai/run.ts";
import { areaOfPlace, countryName, latinName, townOf } from "./area.ts";
import { dataForSeoAi, unknownCity } from "./ai/providers.ts";

const item = (rank: number, title: string, extra: Partial<MapsItem> = {}): MapsItem => ({
  rank, title, cid: `cid-${title}`, place_id: null, category: "Fast food restaurant", categories: [], rating: 4.5, reviews: 10,
  photos: 1, lat: 33.95, lng: 35.8, ...extra,
});

/** A Maps provider from the fixture: the business first at its address, then the address titles; the points' titles. */
function maps(business: string, address: string[], points: string[]) {
  const calls = { live: 0, post: 0, get: 0 };
  const self = item(1, business, { cid: "self", place_id: "ChIJself0000" });
  const p: MapsProvider = {
    live: true,
    liveOne: (t) => {
      calls.live++;
      return Promise.resolve(t.tag === "locate" ? [self] : [self, ...address.map((a, i) => item(i + 2, a))]);
    },
    post: (tasks) => {
      calls.post++;
      return Promise.resolve(Object.fromEntries(tasks.map((t) => [t.tag, `task|${t.tag}`])));
    },
    ready: () => Promise.resolve([]),
    get: (id) => {
      calls.get++;
      const i = Number(id.split(":")[1] ?? 0) * 7 + Number(id.split(":")[2] ?? 0);
      return Promise.resolve({ tag: id.split("|")[1]!, items: [item(1, points[i % points.length]!), self] });
    },
  };
  return { p, calls };
}

/** The AI answer as freeScanCheck returns it, analysed from the fixture's text. */
const answer = (business: string, question: string, text: string): FreeCheck => ({
  provider: "chatgpt", named: false, names: analyze({ text, business, prompt: question }).competitors.map((c) => c.name), sources: [],
  label: "One sample. AI answers change from run to run.", accuracy: null, question, assistant: "ChatGPT", model: "gpt-4.1-mini-2025-04-14",
  asked_at: "2026-11-05T09:00:00.000Z", web_search_forced: true, city_dropped: false,
});

function deps(p: MapsProvider, ai: FreeCheck | null, o: Partial<StartDeps> = {}) {
  const spent: number[] = [];
  const asked: string[] = [];
  const d: StartDeps = {
    provider: p, source: "mock", code: () => "SEVEN234", room: () => Promise.resolve(true),
    spend: (_c, m) => { spent.push(m); return Promise.resolve(); },
    ai: (q) => { asked.push(q.prompt); return Promise.resolve(ai); }, ...o,
  };
  return { d, spent, asked };
}

const asRow = (r: Omit<CheckRow, "id" | "created_at">): CheckRow => ({ ...r, id: "row", created_at: new Date().toISOString() });

async function finished(d: StartDeps, business: string, term: string, city: string | null) {
  const s = await startCheck(d, { name: business, address: null, country: "LB", city, place_id: "ChIJself0000", term });
  assert(s.ok === true);
  const done = await collectCheck({ provider: d.provider, now: () => new Date() }, asRow(s.row));
  return { started: s.row, done: done! };
}

Deno.test("scan2: the question names the town and the country; without a town it is never asked", async () => {
  assertEquals(aiQuestion("fast food restaurant", "Boqaata", "LB"), "best fast food restaurant in Boqaata, Lebanon");
  assertEquals(aiQuestion("media company", "Beirut", "LB"), "best media company in Beirut, Lebanon");
  assertEquals(aiQuestion("bakery", null, "LB"), null);
  assertEquals([countryName("AE"), countryName("GB"), countryName("US")], ["United Arab Emirates", "United Kingdom", "United States"]);
  const { p } = maps(fx.seven.business, fx.seven.address, fx.seven.points);
  const none = deps(p, answer(fx.seven.business, "x", fx.seven.answer));
  const s = await startCheck(none.d, { name: fx.seven.business, address: null, country: "LB", city: null, place_id: null, term: fx.seven.term });
  assertEquals(none.asked, [], "no town: the AI part is left out");
  assertEquals(s.ok === true && s.row.ai, null);
  const town = deps(p, null);
  await startCheck(town.d, { name: fx.seven.business, address: null, country: "LB", city: "Boqaata", place_id: null, term: fx.seven.term });
  assertEquals(town.asked, ["best fast food restaurant in Boqaata, Lebanon"], "3954W376 after Scan 2");
});

Deno.test("scan2: the town from the address, case kept; Places components win when the mask has them", () => {
  assertEquals(townOf("Main Road, Boqaata, Lebanon"), "Boqaata");
  assertEquals(townOf("Boqaata, Mount Lebanon Governorate, Lebanon"), "Boqaata");
  assertEquals(townOf("12 High St, Austin, TX 78701, USA"), "Austin");
  assertEquals(townOf("Downtown Dubai - Dubai - United Arab Emirates"), "Dubai");
  assertEquals(townOf("10 Downing St, London SW1A 2AA, UK"), "London");
  assertEquals(townOf("Main St, Lebanon"), null);
  assertEquals(townOf("بيروت، لبنان"), null, "never a town in another script");
  assertEquals(areaOfPlace({ formattedAddress: "X, Y, Lebanon", addressComponents: [{ longText: "Boqaata", types: ["locality", "political"] }] }), "Boqaata");
  assertEquals(areaOfPlace({ formattedAddress: "Main Road, Boqaata, Lebanon" }), "Boqaata");
});

Deno.test("scan2: SEVEN Burgers (5 Nov): the chains ChatGPT named are not near it on Google Maps, so they are counted, never named", async () => {
  const q = "best fast food restaurant in Boqaata, Lebanon";
  const ai = answer(fx.seven.business, q, fx.seven.answer);
  assertEquals(ai.names, ["McDonald's", "Chick-fil-A", "In-N-Out Burger"]);
  const { p } = maps(fx.seven.business, fx.seven.address, fx.seven.points);
  const { started, done } = await finished(deps(p, ai).d, fx.seven.business, fx.seven.term, "Boqaata");
  assertEquals(started.ai?.pending, ai.names, "held only while the 49 places come in");
  assertEquals(done.ai?.pending, undefined, "gone once matched");
  assertEquals([done.ai?.named_local, done.ai?.named_other], [[], 3]);
  assertEquals(aiLine(done.ai), NOT_NEAR);
  const view = JSON.stringify(publicView(done));
  for (const n of ["McDonald", "Chick-fil-A", "In-N-Out"]) assert(!view.includes(n), `${n} never reaches the page`);
  assert(!/\p{Script=Arabic}/u.test(view), "no Arabic on the page (R-61)");
  const v = publicView(done);
  assertEquals(v.ai?.question_line, "We asked ChatGPT: 'best fast food restaurant in Boqaata, Lebanon'");
  assertEquals(v.ai?.sources_line, "No sources cited.");
  assertEquals(v.ai?.asked_line, "Asked on 5 November 2026 through OpenAI's API, with web search. The ChatGPT app can answer differently, and answers change from run to run.");
  assertEquals(v.fast.competitors.map((c) => c.name), ["West Diner", "Eatout", "Shawarma Albasha"], "at your address, Latin names only");
});

Deno.test("scan2: a chain Google Maps does show near the business is named, in the answer's order", async () => {
  const ai = answer(fx.seven.business, "q", fx.seven.answer);
  const { p } = maps(fx.seven.business, ["West Diner", "McDonald's", "In-N-Out Burger"], fx.seven.points);
  const { done } = await finished(deps(p, ai).d, fx.seven.business, fx.seven.term, "Boqaata");
  assertEquals([done.ai?.named_local, done.ai?.named_other], [["McDonald's", "In-N-Out Burger"], 1]);
  assertEquals(aiLine(done.ai), "ChatGPT did not name you. It named McDonald's and In-N-Out Burger, which Google Maps shows near you.");
  assert(!JSON.stringify(publicView(done)).includes("Chick-fil-A"), "the one not nearby is only counted");
});

Deno.test("scan2: Yawmiyati (5 Nov): only what Google Maps has near Yawmiyati is shown; a match from the 49 places counts too", async () => {
  const q = "best media company in Beirut, Lebanon";
  const ai = answer(fx.yawmiyati.business, q, fx.yawmiyati.answer);
  assertEquals(ai.names, ["Al-Akhbar", "L'Orient-Le Jour", "Mindshare"]);
  const real = maps(fx.yawmiyati.business, fx.yawmiyati.address, fx.yawmiyati.points);
  const { done } = await finished(deps(real.p, ai).d, fx.yawmiyati.business, fx.yawmiyati.term, "Beirut");
  assertEquals(aiLine(done.ai), NOT_NEAR, "none of the three were among the businesses Google Maps showed on 5 Nov");
  // Had Mindshare come up at one of the 49 places, it alone would be named.
  const withMind = maps(fx.yawmiyati.business, fx.yawmiyati.address, ["Mindshare", ...fx.yawmiyati.points]);
  const two = await finished(deps(withMind.p, ai).d, fx.yawmiyati.business, fx.yawmiyati.term, "Beirut");
  assertEquals(two.started.ai?.named_local, [], "not at the address");
  assertEquals([two.done.ai?.named_local, two.done.ai?.named_other], [["Mindshare"], 2]);
  assertEquals(aiLine(two.done.ai), "ChatGPT did not name you. It named Mindshare, which Google Maps shows near you.");
});

Deno.test("scan2: the other lines, and a row from before Scan 2 shows no question and no names", () => {
  const base = answer("X", "q", "");
  assertEquals(aiLine(storeAi({ ...base, named: true }, [], true)), "ChatGPT named you.");
  assertEquals(aiLine(storeAi({ ...base, names: [] }, [], true)), "ChatGPT did not name you.");
  assertEquals(matchLocal(["The Cafe", "Shop"], [{ title: "Cafe", cid: null }]), { named_local: [], named_other: 2 }, "a generic word alone never matches");
  const old = { provider: "chatgpt" as const, named: false, competitors: ["McDonald's"], sources: [], label: "One sample. AI answers change from run to run." };
  assertEquals(aiLine(old), "ChatGPT did not name you.");
  const l = aiLines(old)!;
  assertEquals([l.question, l.asked, l.sources_line], [null, null, null]);
  const local = storeAi({ ...base, names: ["قطر الندى", "West Diner"] }, [{ title: "قطر الندى", cid: null }, { title: "West Diner", cid: null }], true);
  assertEquals(aiLine(local), "ChatGPT did not name you. It named West Diner, which Google Maps shows near you.", "the next business takes the place of a name not in Latin letters");
});

Deno.test("scan2: names not in Latin letters are never shown: a card reads 'another business came first'", () => {
  assertEquals([latinName("قطر الندى"), latinName("Shawarma kareem شاورما كريم"), latinName("Café Ölé"), latinName("McDonald's")], [false, false, true, true]);
  const n: Nearby = {
    cards: [
      { kind: "home", row: 3, col: 3, place: "Near your fast food restaurant", name: null, rank: 2, position: "2nd", first: "West Diner", firstIsYou: false },
      { kind: "away", row: 2, col: 2, place: "Near شارع", name: "شارع", rank: 7, position: "7th", first: "قطر الندى", firstIsYou: false },
      { kind: "away", row: 6, col: 3, place: "About 1 km south of your fast food restaurant", name: null, rank: 4, position: "4th", first: "The Cozy Corner", firstIsYou: false },
    ],
    top3: 40, points: 49, count_line: "In the first 3 at 40 of 49 places Kabsi checked.", keyword: "fast food restaurant", note: "x",
  };
  const safe = safeNearby(n, 1.5, "fast food restaurant")!;
  assertEquals([safe.cards[1].first, safe.cards[1].first_hidden, safe.cards[1].name], [null, true, null]);
  assertMatch(safe.cards[1].place, /^About .* north west of your fast food restaurant$/);
  assertEquals(cardLine(safe.cards[1], n.keyword), `${safe.cards[1].place}, another business came first. You were 7th.`);
  assertEquals(cardLine(n.cards[1], n.keyword), "Near شارع, another business came first. You were 7th.", "the WhatsApp words never print the name");
  assert(!/\p{Script=Arabic}/u.test(JSON.stringify(safe)));
});

Deno.test("scan2: a second start of the same place and search reuses the row: no provider call, nothing spent", async () => {
  const ai = answer(fx.seven.business, "q", fx.seven.answer);
  const live = maps(fx.seven.business, fx.seven.address, fx.seven.points);
  const first = deps(live.p, ai, { source: "live" });
  const s = await startCheck(first.d, { name: fx.seven.business, address: null, country: "LB", city: "Boqaata", place_id: "ChIJself0000", term: fx.seven.term });
  assert(s.ok === true);
  const calls = { ...live.calls }, spent = [...first.spent];
  assert(spent.length > 0, "the first start pays");
  const row = asRow(s.row);
  const again = deps(live.p, ai, { source: "live", reuse: () => Promise.resolve(row) });
  const s2 = await startCheck(again.d, { name: fx.seven.business, address: null, country: "LB", city: "Boqaata", place_id: "ChIJself0000", term: fx.seven.term });
  assertEquals(s2.ok, "reused");
  assertEquals(live.calls, calls, "no Maps call");
  assertEquals([again.spent, again.asked], [[], []], "provider_spend unchanged, no AI call");
});

Deno.test("scan2: ChatGPT is asked with web search forced, from the town; an unknown town is asked once more without it", async () => {
  const ok = { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.03, result: [{ model_name: "gpt-4.1-mini", items: [{ type: "message", sections: [{ text: "**West Diner** is good." }] }] }] }] };
  const bad = { status_code: 20000, tasks: [{ status_code: 40501, status_message: "Invalid Field: 'web_search_city'." }] };
  const sent: Record<string, unknown>[] = [];
  const replies = [bad, ok];
  const p = dataForSeoAi("chatgpt", "l", "p", "gpt-4.1-mini", (_u, i) => {
    sent.push(JSON.parse(String(i?.body))[0]);
    return Promise.resolve(new Response(JSON.stringify(replies.shift())));
  });
  const a = await p.ask("best fast food restaurant in Boqaata, Lebanon", { country: "lb", city: "Boqaata" });
  assertEquals(sent.length, 2);
  assertEquals([sent[0].web_search, sent[0].force_web_search, sent[0].web_search_country_iso_code, sent[0].web_search_city], [true, true, "LB", "Boqaata"]);
  assertEquals(["web_search_city" in sent[1], sent[1].user_prompt, sent[1].force_web_search], [false, sent[0].user_prompt, true]);
  assertEquals([a.webSearchForced, a.cityDropped], [true, true]);
  assertEquals(unknownCity({ status_code: 20000, tasks: [{ status_code: 40210, status_message: "Insufficient funds, city" }] }), false, "a refused balance is not an unknown town");
  const one: Record<string, unknown>[] = [];
  const p2 = dataForSeoAi("chatgpt", "l", "p", "m", (_u, i) => { one.push(JSON.parse(String(i?.body))[0]); return Promise.resolve(new Response(JSON.stringify(ok))); });
  assertEquals((await p2.ask("q", { country: "LB", city: "Boqaata" })).cityDropped, false);
  assertEquals(one.length, 1);
});

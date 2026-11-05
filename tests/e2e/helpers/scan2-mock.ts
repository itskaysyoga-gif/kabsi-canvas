// Scan 2 (master plan 30.29): a finished free check as the server answers it, for the result page's tests and
// screenshots. Nothing paid: Turnstile, profile-snapshot and visibility are stood in for. The names are the real
// titles of the 5 Nov check of SEVEN Burgers & Beyond (3954W376) after Scan 2's rules (no Arabic, by distance).
import type { Page } from "@playwright/test";

const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
export const PLACE = { place_id: "ChIJJ8-7quchHxURgn5sxhONNLI", name: "SEVEN Burgers & Beyond", address: "Main Road, Boqaata, Lebanon" };
const dots = Array.from({ length: 49 }, (_, i) => ({ row: Math.floor(i / 7), col: i % 7, rank: i % 5 === 0 ? 7 : (i % 3) + 1 }));
export const CHECK = {
  code: "SEVEN234", business: PLACE.name, term: "fast food restaurant", created_at: "2026-11-05T09:00:00.000Z",
  check_line: "Free check. No Google access needed.", trial_line: "x",
  fast: { rank: 2, line: "At your address you rank 2 for 'fast food restaurant'.", competitors: [
    { name: "West Diner", rating: 4.8, reviews: 25 }, { name: "Eatout", rating: 4.9, reviews: 19 }, { name: "Shawarma Albasha", rating: 5, reviews: 1 },
  ] },
  ai: {
    provider: "chatgpt", assistant: "ChatGPT", model: "gpt-4.1-mini", question: "best fast food restaurant in Boqaata, Lebanon",
    asked_at: "2026-11-05T09:00:00.000Z", named: false,
    line: "ChatGPT did not name you. The businesses it named are not near you on Google Maps, so this answer does not reflect your area.",
    question_line: "We asked ChatGPT: 'best fast food restaurant in Boqaata, Lebanon'",
    asked_line: "Asked on 5 November 2026 through OpenAI's API, with web search. The ChatGPT app can answer differently, and answers change from run to run.",
    sources: [], sources_line: "No sources cited.", named_other: 3, accuracy: null, label: "One sample. AI answers change from run to run.",
  },
  map: {
    state: "done", top3: 40, points: 49, average: 2.4, rivals: [], dots,
    nearby: { top3: 40, points: 49, count_line: "In the first 3 at 40 of 49 places Kabsi checked.", keyword: "fast food restaurant", note: "Sample Google Maps results, not customer counts.", cards: [
      { kind: "home", row: 3, col: 3, place: "Near your fast food restaurant", name: null, rank: 2, position: "2nd", first: "West Diner", firstIsYou: false },
      { kind: "away", row: 2, col: 2, place: "About 300 m north west of your fast food restaurant", name: null, rank: 7, position: "7th", first: null, firstIsYou: false, first_hidden: true },
      { kind: "away", row: 6, col: 3, place: "About 1 km south of your fast food restaurant", name: null, rank: 4, position: "4th", first: "The Cozy Corner", firstIsYou: false },
    ] },
  },
  whatsapp_text: "Hi Kabsi, my scan code is KAB-SEVEN234",
};
export const SNAPSHOT = {
  ...PLACE, category: "Fast food restaurant", rating: 4.7, review_count: 38, business_status: "OPERATIONAL", open_now: true,
  hours: ["Monday: 11:00 to 23:00"], phone: "+961 70 000 000", website: null, has_photos: true, photo_count: 10, flags: [
    { tone: "warning", fact: "No website is shown on Google.", action: "Add your website on your Google profile. Once you connect, Kabsi checks it every day with your other details." },
  ], checklist: [], cached: false, area: "Boqaata",
};

/** Stands in for every call the free check makes; returns what the page sent to visibility/check and profile-snapshot. */
export async function mockFreeCheck(page: Page) {
  const sent: { check: Record<string, unknown> | null; report: Record<string, unknown>[] } = { check: null, report: [] };
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "window.turnstile={render:function(el,o){setTimeout(function(){o.callback('qa-pass')},50);return 'qa'},reset:function(){},remove:function(){}};" }));
  await page.route("**/functions/v1/profile-snapshot", (route) => {
    const b = route.request().postDataJSON() ?? {};
    if (b.action === "email" || b.action === "whatsapp") sent.report.push(b);
    return route.fulfill(json(b.action === "search" ? { places: [PLACE] } : b.action === "check" ? { snapshot: SNAPSHOT } : { ok: true }));
  });
  await page.route("**/functions/v1/visibility/check", (route) => {
    sent.check = route.request().postDataJSON();
    return route.fulfill(json(CHECK));
  });
  await page.route("**/functions/v1/visibility/check/result", (route) => route.fulfill(json(CHECK)));
  await page.route("**/functions/v1/programs/**", (route) => route.fulfill(json({ left: 0, total: 25 })));
  return sent;
}

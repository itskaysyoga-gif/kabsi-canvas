// P0.5-05 (K-26): the figures, the comparison words and the headline.
import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { insightPeriods } from "./periods.ts";
import { changeWords, headline, summarise, type DailySeries } from "./summary.ts";

const periods = insightPeriods(new Date("2026-10-04T12:00:00Z")); // 1 to 3 October against 1 to 3 September

function series(): DailySeries {
  return {
    CALL_CLICKS: { "2026-10-01": 5, "2026-10-02": 5, "2026-10-03": 5, "2026-09-01": 4, "2026-09-02": 4, "2026-09-03": 4 },
    WEBSITE_CLICKS: { "2026-10-01": 10, "2026-09-01": 5 },
    BUSINESS_DIRECTION_REQUESTS: { "2026-10-02": 20, "2026-09-02": 25 },
    BUSINESS_IMPRESSIONS_MOBILE_SEARCH: { "2026-10-01": 100, "2026-09-01": 50 },
    BUSINESS_IMPRESSIONS_DESKTOP_MAPS: { "2026-10-01": 20, "2026-09-01": 10 },
  };
}

Deno.test("changeWords says how much, never why", () => {
  assertEquals(changeWords(112, 100), "12% more");
  assertEquals(changeWords(80, 100), "20% fewer");
  assertEquals(changeWords(100, 100), "no change");
  assertEquals(changeWords(50, 0), "");
});

Deno.test("interactions are calls, website clicks and directions; views are not interactions", () => {
  const s = summarise(series(), periods);
  assertEquals(s.interactions, { this: 15 + 10 + 20, last: 12 + 5 + 25 });
  const views = s.tiles.find((t) => t.key === "views")!;
  assertEquals([views.this, views.last], [120, 60]);
  assertEquals(views.change, "100% more");
});

Deno.test("bookings and messages appear only where Google returns them", () => {
  assertEquals(summarise(series(), periods).tiles.map((t) => t.key), ["calls", "website_clicks", "directions", "views"]);
  const withBookings = series();
  withBookings.BUSINESS_BOOKINGS = { "2026-10-01": 2 };
  const s = summarise(withBookings, periods);
  assertEquals(s.tiles.map((t) => t.key), ["calls", "website_clicks", "directions", "views", "bookings"]);
  assertEquals(s.interactions.this, 47);
});

Deno.test("the headline reads like K-26 and claims no cause", () => {
  const s = summarise(series(), periods);
  assertEquals(s.headline, "45 customers interacted with your Google profile this month, 7% more than last month.");
  assertMatch(s.headline, /^[^!—–]+$/);
  assertEquals(headline({ this: 217, last: 194 }, periods), "217 customers interacted with your Google profile this month, 12% more than last month.");
  assertEquals(headline({ this: 10, last: 0 }, periods), "10 customers interacted with your Google profile this month.");
  assertEquals(headline({ this: 10, last: 10 }, periods), "10 customers interacted with your Google profile this month, the same as last month.");
  assertEquals(headline({ this: 1, last: 4 }, periods), "1 customer interacted with your Google profile this month, 75% fewer than last month.");
});

Deno.test("on the 1st the headline names the months", () => {
  const p = insightPeriods(new Date("2026-11-01T06:00:00Z"));
  assertEquals(headline({ this: 30, last: 20 }, p), "30 customers interacted with your Google profile in October, 50% more than September.");
});

Deno.test("the daily figures cover the current period only, one row a day", () => {
  const s = summarise(series(), periods);
  assertEquals(s.daily.map((d) => d.date), ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assertEquals(s.daily[0], { date: "2026-10-01", calls: 5, website_clicks: 10, directions: 0, views: 120 });
});

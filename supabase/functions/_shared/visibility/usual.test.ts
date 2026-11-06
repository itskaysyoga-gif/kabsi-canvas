// Copy 3 (master plan 30.30 item 2): where the business usually comes up. The two stored SEVEN Burgers rows of 5 Nov 2026
// (3954W376 in the morning, CFE4RMDN three hours later) give "3rd" and "4th": a move of one position that the count line
// alone ("40 of 49" then "5 of 49") made look like a collapse.
import { assertEquals } from "jsr:@std/assert@1";
import rows from "../../../../tests/fixtures/free-check/seven-burgers-ranks.json" with { type: "json" };
import { checkFact, type CheckRow, publicView, reportParts, safeNearby } from "./free-check.ts";
import { countWithUsual, nearbyText, type Nearby, usualLine, usualRank } from "./nearby.ts";
import { nearbyTree } from "./nearby-image.ts";

Deno.test("usual: the two stored SEVEN Burgers rows read 3rd and 4th", () => {
  assertEquals(rows["3954W376"].ranks.length, 49);
  assertEquals(usualLine(rows["3954W376"].ranks), "Most places put you 3rd.");
  assertEquals(usualLine(rows["CFE4RMDN"].ranks), "Most places put you 4th.");
  assertEquals([usualRank(rows["3954W376"].ranks), usualRank(rows["CFE4RMDN"].ranks)], [3, 4]);
  assertEquals(
    countWithUsual(rows["3954W376"].top3, 49, rows["3954W376"].ranks),
    "In the first 3 at 40 of 49 places Kabsi checked. Most places put you 3rd.",
  );
  assertEquals(
    countWithUsual(rows["CFE4RMDN"].top3, 49, rows["CFE4RMDN"].ranks),
    "In the first 3 at 5 of 49 places Kabsi checked. Most places put you 4th.",
  );
});

Deno.test(
  "usual: only the points in the first 20 count, and fewer than half in the first 20 says so",
  () => {
    // 30 points at 2nd, 19 not in the first 20: the middle of the ones that count is 2nd.
    assertEquals(
      usualLine([...Array(30).fill(2), ...Array(19).fill(null)]),
      "Most places put you 2nd.",
    );
    // 24 of 49 in the first 20 is fewer than half.
    assertEquals(
      usualLine([...Array(24).fill(1), ...Array(25).fill(null)]),
      "Most places did not put you in the first 20.",
    );
    assertEquals(usualLine(Array(49).fill(null)), "Most places did not put you in the first 20.");
    // 25 of 49 is half or more.
    assertEquals(
      usualLine([...Array(25).fill(11), ...Array(24).fill(21)]),
      "Most places put you 11th.",
    );
    assertEquals(usualLine([]), null);
    assertEquals(
      [usualLine([21, 22, 1, 1, 1]), usualLine([12, 12, 12])],
      ["Most places put you 1st.", "Most places put you 12th."],
    );
    // An even count takes the lower middle, a whole position.
    assertEquals(usualRank([2, 3, 4, 5]), 3);
  },
);

const done = (code: "3954W376" | "CFE4RMDN"): CheckRow => {
  const r = rows[code];
  const nearby: Nearby = {
    cards: [
      {
        kind: "home",
        row: 3,
        col: 3,
        place: "Near your fast food restaurant",
        name: null,
        rank: r.ranks[24]!,
        position: "2nd",
        first: "West Diner",
        firstIsYou: false,
      },
    ],
    top3: r.top3,
    points: 49,
    count_line: `In the first 3 at ${r.top3} of 49 places Kabsi checked.`,
    keyword: "fast food restaurant",
    note: "x",
  };
  return {
    id: "x",
    code,
    business: "SEVEN Burgers & Beyond",
    term: "fast food restaurant",
    country: "LB",
    city: "Boqaata",
    self: { title: "SEVEN Burgers & Beyond", cid: "c", place_id: "p" },
    center: { lat: 33.9, lng: 35.8 },
    radius_km: 1.5,
    category: "Fast food restaurant",
    source: "live",
    state: "done",
    fast: { rank: 2, line: "x", competitors: [] },
    ai: null,
    nearby,
    created_at: "2026-11-05T04:39:00Z",
    points: r.ranks.map((rank, i) => ({
      row: Math.floor(i / 7),
      col: i % 7,
      lat: 0,
      lng: 0,
      task: "t",
      rank,
      items: [],
    })),
  };
};

Deno.test(
  "usual: the page, the emailed report, WhatsApp's fact and image say it, from the points of a row stored before",
  () => {
    for (const [code, third] of [
      ["3954W376", "3rd"],
      ["CFE4RMDN", "4th"],
    ] as const) {
      const c = done(code);
      const line = `In the first 3 at ${c.nearby!.top3} of 49 places Kabsi checked. Most places put you ${third}.`;
      // The page (the public view) and the emailed report.
      const v = publicView(c);
      assertEquals(v.map.state === "done" ? v.map.nearby!.count_line : null, line);
      // Launch 1 (30.35 item 4): the report carries the result page's own points line, with the same usual position.
      assertEquals(
        reportParts(c, "https://kabsi.co")!.nearby[1],
        `You appeared in the first three at ${c.nearby!.top3} of 49 points around you. Most places put you ${third}.`,
      );
      // WhatsApp's "The check:" fact (onboarding reads the row with its points) and the image.
      assertEquals(checkFact(c), line);
      const img = JSON.stringify(
        nearbyTree(
          safeNearby(
            c.nearby,
            c.radius_km,
            "fast food restaurant",
            c.points.map((p) => p.rank ?? null),
          )!,
          { business: c.business, date: "5 November 2026", named: false },
        ),
      );
      assertEquals(img.includes(line), true);
      // The owner's own WhatsApp map text carries the line too when it comes from a new check's nearby.
      assertEquals(
        nearbyText({ ...c.nearby!, count_line: line }, "5 November 2026").includes(line),
        true,
      );
    }
    // The stored count line alone (no points read) is still what it was.
    const c = done("3954W376");
    assertEquals(
      checkFact({ fast: c.fast, nearby: c.nearby }),
      "In the first 3 at 40 of 49 places Kabsi checked.",
    );
  },
);

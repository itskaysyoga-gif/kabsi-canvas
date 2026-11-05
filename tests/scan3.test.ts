// Scan 3 (master plan 30.34 item 2, docs/COPY.md 58): the free check result in plain words. Five businesses: a UK barber,
// a UAE salon, SEVEN Burgers & Beyond in Lebanon (check CFE4RMDN's data), a clinic and a profile with missing details.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACCESS_LINES,
  AI_QUESTION,
  AI_SAMPLE,
  CANNOT_PROMISE,
  TRIAL_BUTTON,
  TRIAL_LINES,
  WHY_VARIES,
  aiAskedLines,
  aiVerdict,
  mainFinding,
  modelName,
  nearbyCount,
  nearbyLead,
  ord,
  reportHolds,
  wouldDo,
} from "@/lib/scan-words";

type Flag = { tone: "danger" | "warning" | "neutral"; fact: string; action: string };
const neutral: Flag[] = [
  {
    tone: "neutral",
    fact: "Google does not show the public which reviews have a reply.",
    action:
      "Once you connect, Kabsi counts the reviews with no reply and prepares one for each. You approve every reply.",
  },
];
const photos: Flag = {
  tone: "warning",
  fact: "Google shows no photos for this business.",
  action: "Kabsi asks for photos from your phone and prepares them for you to approve.",
};
const hours: Flag = {
  tone: "danger",
  fact: "No opening hours are shown on Google.",
  action: "Kabsi asks you for your hours and sends them to Google once you say yes.",
};
const phone: Flag = {
  tone: "warning",
  fact: "No phone number is shown on Google.",
  action:
    "Add your phone number on your Google profile. Once you connect, Kabsi checks it every day with your other details.",
};
const fewReviews: Flag = {
  tone: "warning",
  fact: "There are 4 reviews so far.",
  action:
    "Kabsi gives you a review link and QR code that make it easy for every customer to leave one.",
};

const BUSINESSES = {
  // A UK barber with few reviews.
  ukBarber: { flags: [fewReviews, ...neutral], term: "barber shop", rank: 3 },
  // A UAE salon with no photos.
  uaeSalon: { flags: [photos, ...neutral], term: "beauty salon", rank: 7 },
  // SEVEN Burgers & Beyond, Boqaata (CFE4RMDN: 2nd at the address, first three at 5 of 49, most places 4th).
  seven: { flags: [...neutral], term: "fast food restaurant", rank: 2 },
  // A clinic outside the first 20 at its address.
  clinic: { flags: [phone, ...neutral], term: "dental clinic", rank: null },
  // A profile with missing details: no hours (red) and no phone (amber).
  missing: { flags: [phone, hours, ...neutral], term: "cafe", rank: 12 },
};

describe("Scan 3: the main finding, one fact, why, next step", () => {
  it("takes the red flag first, then the amber one, else what Google already shows", () => {
    expect(mainFinding(BUSINESSES.missing.flags).fact).toBe(
      "No opening hours are shown on Google.",
    );
    expect(mainFinding(BUSINESSES.missing.flags).why).toBe(
      "Customers cannot see when you are open.",
    );
    expect(mainFinding(BUSINESSES.uaeSalon.flags).fact).toBe(photos.fact);
    expect(mainFinding(BUSINESSES.ukBarber.flags).why).toBe(
      "People read your reviews before they choose.",
    );
    expect(mainFinding(BUSINESSES.clinic.flags).why).toBe(
      "Customers cannot call you from your profile.",
    );
    expect(mainFinding(BUSINESSES.seven.flags).fact).toBe(
      "Google shows the basics of your profile.",
    );
    for (const b of Object.values(BUSINESSES)) {
      const f = mainFinding(b.flags);
      expect(f.next.length).toBeGreaterThan(10);
    }
  });
  it("says who does what in three short lines, and what Kabsi cannot promise", () => {
    for (const b of Object.values(BUSINESSES)) {
      const l = wouldDo(b.flags);
      expect(l).toHaveLength(3);
      for (const x of l) expect(x.line.split(/\s+/).length, x.line).toBeLessThanOrEqual(20);
    }
    expect(wouldDo(BUSINESSES.uaeSalon.flags)[1]!.line).toBe(
      "You send photos from your phone. Kabsi prepares them and asks for your yes.",
    );
    expect(wouldDo(BUSINESSES.clinic.flags)[1]!.line).toBe(
      "You add your phone number on Google. Kabsi then checks it every day.",
    );
    expect(wouldDo(BUSINESSES.missing.flags)[1]!.who).toBe("You tell, Kabsi sends");
    expect(CANNOT_PROMISE).toBe(
      "Kabsi cannot promise more reviews or a higher place on Google Maps.",
    );
  });
});

describe("Scan 3: the nearby result in plain words", () => {
  it("reads the position from the address, and the count from the 49 points with the usual position", () => {
    expect(nearbyLead("fast food restaurant", 2)).toBe(
      "When someone searches for 'fast food restaurant' near you, you appear 2nd in this Google Maps check.",
    );
    expect(nearbyLead("dental clinic", null)).toBe(
      "When someone searches for 'dental clinic' near you, you are not in the first 20 in this Google Maps check.",
    );
    expect(nearbyLead("barber shop", 21)).toMatch(/not in the first 20/);
    // CFE4RMDN: first three at 5 of 49, most places put it 4th.
    const ranks = [
      ...Array(5).fill(2),
      ...Array(20).fill(4),
      ...Array(10).fill(6),
      ...Array(14).fill(null),
    ];
    expect(nearbyCount(5, 49, ranks)).toBe(
      "You appeared in the first three at 5 of 49 points around you. Most places put you 4th.",
    );
    expect(nearbyCount(0, 49, Array(49).fill(null))).toBe(
      "You appeared in the first three at 0 of 49 points around you. Most places did not put you in the first 20.",
    );
    expect(ord(1)).toBe("1st");
    expect(ord(12)).toBe("12th");
    expect(ord(23)).toBe("23rd");
  });
  it("never reads a count as customers or searches", () => {
    for (const l of [nearbyLead("cafe", 3), nearbyCount(5, 49, [1]), WHY_VARIES])
      expect(l).not.toMatch(/customers|searches a (day|month)|people searched/i);
  });
});

describe("Scan 3: Did ChatGPT name your business?", () => {
  it("answers yes, no with the local names, or an honest inconclusive line", () => {
    expect(AI_QUESTION).toBe("Did ChatGPT name your business?");
    expect(aiVerdict({ named: true, line: "ChatGPT named you." })).toEqual({
      verdict: "yes",
      line: "Yes. ChatGPT named your business.",
    });
    // CFE4RMDN: three local names matched on Google Maps.
    expect(
      aiVerdict({
        named: false,
        line: "ChatGPT did not name you. It named Boneless Bakaata, ROUTE 66 and JZ Grill, which Google Maps shows near you.",
        named_other: 2,
      }),
    ).toEqual({
      verdict: "no",
      line: "No. It named Boneless Bakaata, ROUTE 66 and JZ Grill, which Google Maps shows near you.",
    });
    // Names that cannot be matched to the area: no verdict.
    const v = aiVerdict({
      named: false,
      line: "ChatGPT did not name you. The businesses it named are not near you on Google Maps, so this answer does not reflect your area.",
      named_other: 3,
    });
    expect(v.verdict).toBe("inconclusive");
    expect(v.line).toMatch(/^Not clear from this answer\./);
    expect(
      aiVerdict({ named: false, line: "ChatGPT did not name you.", named_other: 0 }).verdict,
    ).toBe("no");
  });
  it("shows the question, the model and the date under it, and the sample note", () => {
    expect(
      aiAskedLines({
        question: "best fast food restaurant in Boqaata, Lebanon",
        model: "gpt-4.1-mini-2025-04-14",
        asked_at: "2026-11-05T07:35:22Z",
      }),
    ).toEqual([
      "Question: 'best fast food restaurant in Boqaata, Lebanon'",
      "Model: ChatGPT (gpt-4.1-mini)",
      "Asked on 5 November 2026",
    ]);
    expect(modelName(null)).toBeNull();
    expect(AI_SAMPLE).toMatch(/One sample answer/);
  });
});

describe("Scan 3: the trial, access and the report", () => {
  it("has one trial button, two lines on when it starts, and Manager access in three lines", () => {
    expect(TRIAL_BUTTON).toBe("Start your 14-day free trial");
    expect(TRIAL_LINES).toEqual([
      "The 14 days start when Kabsi's access to your Google profile works.",
      "No card. Cancel any time.",
    ]);
    expect(ACCESS_LINES).toHaveLength(3);
    expect(ACCESS_LINES[1]).toBe("You stay the owner of your Google profile.");
    expect(ACCESS_LINES[2]).toBe("Nothing is published without your yes.");
  });
  it("says what the report holds, by the parts present", () => {
    expect(reportHolds({ nearby: true, ai: true })).toBe(
      "You get the summary of what Google shows, the nearby check and the ChatGPT answer, and the link to this result.",
    );
    expect(reportHolds({ nearby: false, ai: false })).toBe(
      "You get the summary of what Google shows, and the link to this result.",
    );
  });
  it("the result page lets the visitor choose Email or WhatsApp, then shows only that field; consent words unchanged", () => {
    const src = readFileSync("src/components/kabsi/scan-live.tsx", "utf8");
    const report = src.slice(
      src.indexOf("function SendReport"),
      src.indexOf("export function SavedFreeCheck"),
    );
    expect(report).toContain('name="report-via"');
    expect(report).toContain("{!byWhatsapp ? (");
    expect(report).toContain("{TIPS_CONSENT_TEXT}");
    expect(report).toContain("{WHATSAPP_CONSENT_TEXT}");
    expect(report).toContain("WHATSAPP_ON && (");
  });
  it("carries no dash, no exclamation mark and no Arabic", () => {
    const src = readFileSync("src/lib/scan-words.ts", "utf8");
    // Every line a reader sees is a string literal; the code around it may use "!".
    const code = src
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l))
      .join("\n");
    const words = (code.match(/"[^"\n]*"|`[^`]*`/g) ?? []).join("\n").replace(/\$\{[^}]*\}/g, "");
    expect(words.length).toBeGreaterThan(1000);
    expect(words).not.toMatch(/[\u2013\u2014!]/);
    expect(src).not.toMatch(/[\u0600-\u06ff]/);
  });
});

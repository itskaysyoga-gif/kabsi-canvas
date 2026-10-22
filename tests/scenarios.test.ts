import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScenarioPicker } from "../src/components/onboarding/scenario-picker";
import { ScenarioScreen } from "../src/components/onboarding/scenario-screen";
import {
  CHECKBACK_EVERY_DAYS as LIFE_CHECKBACK,
  OWNERSHIP_DAYS as LIFE_OWNERSHIP,
} from "../supabase/functions/_shared/lifecycle";
import {
  CHECKBACK_EVERY_DAYS,
  MORE_SITUATIONS,
  OWNERSHIP_DAYS,
  OWNER_SCREENS,
  OWNER_VARIANTS,
  QUESTIONS,
  SCENARIO_IDS,
  SCENARIO_TITLES,
  SCREENS,
  SITUATION_LABELS,
  scenarioMessage,
  screenFor,
  type OwnerVariant,
  type ScenarioId,
} from "../src/lib/scenarios";
import { KABSI_GROUP_ID } from "../src/lib/site";

// P0.4-04 (K-94 to K-98): each situation has one screen with one layout, reachable from the questions or the list.
const esc = (t: string) => t.replace(/'/g, "&#x27;");
const everyScreen = () => [
  ...Object.entries(SCREENS).map(([id, s]) => ({ id, s })),
  ...OWNER_VARIANTS.map((v) => ({ id: `someone_else_owns:${v}`, s: OWNER_SCREENS[v] })),
];
const row = (scenario: ScenarioId, variant: OwnerVariant | null = null) => ({
  scenario,
  variant,
  started_at: "2026-10-20T09:00:00Z",
  done_at: null,
});
const render = (r: ReturnType<typeof row>) =>
  renderToStaticMarkup(
    createElement(ScenarioScreen, {
      locationId: "loc",
      businessName: "Yawmiyati",
      row: r,
      busy: false,
      onPickVariant: () => {},
      onDone: () => {},
      onBack: () => {},
    }),
  );

describe("the situations (P0.4-04)", () => {
  it("has a screen for each of the nine situations in K-94", () => {
    expect(SCENARIO_IDS).toHaveLength(9);
    for (const id of SCENARIO_IDS) {
      expect(SCENARIO_TITLES[id].length).toBeGreaterThan(5);
      expect(
        screenFor(id, id === "someone_else_owns" ? "dont_know" : null).happening.length,
      ).toBeGreaterThan(20);
    }
  });

  it("every situation is reachable: from a question, the list, or the choice of three", () => {
    const fromQuestions = QUESTIONS.flatMap((q) => [q.yes, q.no]).filter(Boolean) as ScenarioId[];
    const reachable = new Set<ScenarioId>([...fromQuestions, ...MORE_SITUATIONS]);
    expect([...SCENARIO_IDS].filter((id) => !reachable.has(id))).toEqual([]);
  });

  it("the three questions are K-94's, word for word, and lead where it says", () => {
    expect(QUESTIONS.map((q) => q.text)).toEqual([
      "Can you sign in to your Business Profile?",
      'Do you see a "Get verified" button?',
      "Do you see a warning that your profile is suspended or limited?",
    ]);
    expect(QUESTIONS[0]).toMatchObject({ yes: null, no: "someone_else_owns" });
    expect(QUESTIONS[1]).toMatchObject({ yes: "needs_verifying", no: null });
    expect(QUESTIONS[2]).toMatchObject({ yes: "suspended", no: null });
  });

  it("one layout: at most four steps, a happening sentence, a line for the trial, and house style", () => {
    for (const { id, s } of everyScreen()) {
      expect(s.steps.length, id).toBeGreaterThan(0);
      expect(s.steps.length, id).toBeLessThanOrEqual(4);
      expect(s.trial.length, id).toBeGreaterThan(10);
      const all = [
        s.happening,
        ...s.steps,
        s.note ?? "",
        s.trial,
        s.home,
        s.google?.label ?? "",
      ].join(" ");
      expect(all, id).not.toMatch(/[—–!]/);
      // no Google jargon (K-94 note) and no promises about the outcome
      expect(all, id).not.toMatch(/voice of merchant|\bAPI\b|\bGBP\b|guarantee|Profile Score/i);
    }
  });

  it("Google's pages are the exact help pages", () => {
    for (const { id, s } of everyScreen()) {
      if (s.google)
        expect(s.google.url, id).toMatch(
          /^https:\/\/(support\.google\.com|business\.google\.com|accounts\.google\.com)\//,
        );
    }
    expect(SCREENS.needs_verifying.google!.url).toBe(
      "https://support.google.com/business/answer/7107242",
    );
    expect(SCREENS.suspended.google!.url).toBe(
      "https://support.google.com/business/answer/4569145",
    );
    expect(OWNER_SCREENS.dont_know.google!.url).toBe(
      "https://support.google.com/business/answer/4566671",
    );
  });

  it("never asks for a verification code, says never to share it, and nobody sends a password", () => {
    const v = SCREENS.needs_verifying;
    expect(v.note).toMatch(/Never share your verification code with anyone, including us/);
    for (const { id, s } of everyScreen()) {
      expect([s.happening, ...s.steps].join(" "), id).not.toMatch(
        /send (us|me) (your|the) (code|password)|your password is/i,
      );
    }
  });

  it("the trial lines follow K-94", () => {
    expect(SCREENS.suspended.trial).toMatch(/No charge while your profile is suspended/);
    expect(SCREENS.needs_verifying.trial).toBe(
      "Your free trial starts when Google is ready, so you don't lose any days.",
    );
    expect(SCREENS.not_eligible.trial).toMatch(/No trial is taken and nothing is charged/);
    expect(SCREENS.not_eligible.noDone).toBe(true);
  });

  it("the reviewing screen says up to 5 business days and that we email; ownership says day 3 and day 7", () => {
    expect(SCREENS.google_reviewing.happening).toMatch(/up to 5 business days/);
    expect(SCREENS.google_reviewing.happening).toMatch(/email you the moment it's done/);
    expect(OWNER_SCREENS.dont_know.steps.join(" ")).toMatch(/3 days/);
    expect(OWNER_SCREENS.dont_know.steps.join(" ")).toMatch(/day 3 and again on day 7/);
  });

  it("the several-locations screen shows the extra-location price before connecting", () => {
    expect(SCREENS.several_locations.steps.join(" ")).toMatch(/\$15 a month or \$150 a year/);
  });

  it("the ready messages ask for a Manager invitation, never a code, and carry the link but not the group ID", () => {
    for (const kind of ["owner", "agency", "it_admin"] as const) {
      const m = scenarioMessage(kind, "Yawmiyati", "https://kabsi.co/manager-steps?b=Yawmiyati");
      expect(m).toContain("Yawmiyati");
      expect(m).toContain("https://kabsi.co/manager-steps");
      expect(m).toMatch(/never asks for a Google password or a verification code/);
      expect(m).not.toContain(KABSI_GROUP_ID);
      expect(m).not.toMatch(/[—–!]/);
    }
    expect(scenarioMessage("agency", "X", "u")).toMatch(/transfer primary ownership/);
    expect(scenarioMessage("it_admin", "X", "u")).toMatch(/Workspace/);
  });

  it("the reminder rules are the same on the screen side and in the lifecycle job", () => {
    expect(CHECKBACK_EVERY_DAYS).toBe(LIFE_CHECKBACK);
    expect([...OWNERSHIP_DAYS]).toEqual([...LIFE_OWNERSHIP]);
  });
});

describe("each screen, walked once (P0.4-04)", () => {
  for (const id of SCENARIO_IDS) {
    it(`${id} renders the one layout`, () => {
      const html = render(row(id, id === "someone_else_owns" ? "agency_has_it" : null));
      expect(html).toContain(esc(SCENARIO_TITLES[id]));
      expect(html).toContain("Back to the steps");
      expect(html).toContain("setup call");
      if (id === "not_eligible") {
        expect(html).not.toContain("I&#x27;ve done it");
        expect(html).toContain("hello@kabsi.co");
      } else {
        expect(html).toMatch(/I&#x27;ve done it|Continue with this location/);
      }
      expect(html).not.toMatch(/[—–]/);
    });
  }

  it("someone else owns it first asks which of three cases", () => {
    const html = render(row("someone_else_owns"));
    for (const v of OWNER_VARIANTS) expect(html).toContain(esc(OWNER_SCREENS[v].title));
    expect(html).not.toContain("I&#x27;ve done it");
  });

  it("each of the three owner cases has its own screen and ready message where it needs one", () => {
    expect(render(row("someone_else_owns", "lost_login"))).toContain("Google account recovery");
    expect(render(row("someone_else_owns", "agency_has_it"))).toContain("Ready message");
    expect(render(row("someone_else_owns", "dont_know"))).toContain("request ownership");
  });

  it("the manager screen carries a ready message for the owner, and the reviewing screen the date it started", () => {
    expect(render(row("manager_not_owner"))).toContain("Ready message");
    expect(render(row("google_reviewing"))).toContain("Review started 20 October 2026");
  });

  it("the picker shows the three questions and the list, with Yes and No on each", () => {
    const html = renderToStaticMarkup(
      createElement(ScenarioPicker, { busy: false, onPick: () => {} }),
    );
    for (const q of QUESTIONS) expect(html).toContain(q.text.replace(/"/g, "&quot;"));
    expect((html.match(/>Yes</g) ?? []).length).toBe(3);
    expect((html.match(/>No</g) ?? []).length).toBe(3);
    for (const id of MORE_SITUATIONS) expect(html).toContain(SITUATION_LABELS[id]);
    for (const label of Object.values(SITUATION_LABELS))
      expect(label).not.toMatch(/[\u2014\u2013!]/);
  });
});

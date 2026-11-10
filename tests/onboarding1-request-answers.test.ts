import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screenOf, STAGE_OF, type OnboardingStatus } from "../src/lib/onboarding-flow";
import {
  APP_NAME_MAX,
  CHOICE_LABEL,
  NO_ANSWERS,
  Q_EARLY,
  Q_TRACKING,
  TRACKING_CHOICES,
  answersFromRow,
  cleanAnswers,
  gate3Line,
  sameAnswers,
  saveRequestAnswers,
  skipRequestAnswers,
  type StaffRequestAnswers,
} from "../src/lib/request-answers";
import { BANG, DASHES } from "./helpers/house-rules";
import { readText } from "./helpers/facts";

// Onboarding 1 (R-145, master plan 30.48): two optional questions at signup, after the business is chosen. Optional and
// skippable, saved and changed, the staff counts and Gate 3's rule; the questions stay out of every public surface and never
// name the request book. The database side (another business cannot read or write the answers) is in
// supabase/tests/onboarding1_request_answers.sql.

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { rpc, from: vi.fn() } }));

const LOC = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("the words (docs/COPY.md section 73)", () => {
  it("are the two questions and the choices lane R wrote", () => {
    expect(Q_TRACKING).toBe("How do you keep track of client requests today?");
    expect(Q_EARLY).toBe("Want early access to new WhatsApp tools for your business?");
    expect(TRACKING_CHOICES.map(([, label]) => label)).toEqual([
      "A booking app",
      "WhatsApp or Instagram chats",
      "A notebook or diary",
      "Memory",
      "Something else",
    ]);
    expect(TRACKING_CHOICES.map(([v]) => v)).toEqual([
      "booking_app",
      "chats",
      "notebook",
      "memory",
      "other",
    ]);
  });
});

describe("optional and skippable", () => {
  it("Skip saves no answer: every parameter is null, so the database only marks the questions done", async () => {
    await skipRequestAnswers(LOC);
    expect(rpc).toHaveBeenCalledWith("save_request_answers", {
      p_location: LOC,
      p_tracking: null,
      p_app: null,
      p_early: null,
    });
  });

  it("one question can be answered and the other left alone, either way round", async () => {
    await saveRequestAnswers(LOC, { tracking: "memory", app: "", early: null });
    await saveRequestAnswers(LOC, { tracking: null, app: "", early: false });
    expect(rpc.mock.calls[0]![1]).toMatchObject({
      p_tracking: "memory",
      p_app: null,
      p_early: null,
    });
    expect(rpc.mock.calls[1]![1]).toMatchObject({ p_tracking: null, p_app: null, p_early: false });
  });

  it("a failed save is an error the screen shows, not a silent skip", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "forbidden" } });
    await expect(saveRequestAnswers(LOC, NO_ANSWERS)).rejects.toThrow("forbidden");
  });
});

describe("saved and changed", () => {
  it("sends the choice, the trimmed app name only with a booking app, and the yes or no", async () => {
    await saveRequestAnswers(LOC, { tracking: "booking_app", app: "  Fresha  ", early: true });
    expect(rpc).toHaveBeenLastCalledWith("save_request_answers", {
      p_location: LOC,
      p_tracking: "booking_app",
      p_app: "Fresha",
      p_early: true,
    });
  });

  it("changing the choice drops the app name; changing it back does not bring it back", async () => {
    expect(cleanAnswers({ tracking: "chats", app: "Fresha", early: false }).p_app).toBeNull();
    expect(cleanAnswers({ tracking: "booking_app", app: "   ", early: null }).p_app).toBeNull();
    await saveRequestAnswers(LOC, { tracking: "chats", app: "Fresha", early: false });
    expect(rpc.mock.calls[0]![1]).toMatchObject({
      p_tracking: "chats",
      p_app: null,
      p_early: false,
    });
  });

  it("the app name is cut at 80 characters, the same limit the database holds", () => {
    expect(APP_NAME_MAX).toBe(80);
    expect(
      cleanAnswers({ tracking: "booking_app", app: "x".repeat(120), early: null }).p_app,
    ).toHaveLength(80);
  });

  it("the cut never splits an emoji, so the request is always valid text", () => {
    const name = `${"x".repeat(79)}😀😀`;
    const sent = cleanAnswers({ tracking: "booking_app", app: name, early: null }).p_app!;
    expect(Array.from(sent)).toHaveLength(80);
    expect(() => encodeURIComponent(sent)).not.toThrow();
  });

  it("reads a saved row back and knows when nothing changed", () => {
    const a = answersFromRow({
      request_tracking: "notebook",
      request_tracking_app: null,
      early_access_whatsapp: true,
    });
    expect(a).toEqual({ tracking: "notebook", app: "", early: true });
    expect(
      answersFromRow({
        request_tracking: "diary",
        request_tracking_app: null,
        early_access_whatsapp: null,
      }).tracking,
    ).toBeNull();
    expect(answersFromRow(null)).toEqual(NO_ANSWERS);
    expect(sameAnswers(a, { ...a })).toBe(true);
    expect(sameAnswers(a, { ...a, early: false })).toBe(false);
    expect(
      sameAnswers(
        { tracking: "chats", app: "x", early: null },
        { tracking: "chats", app: "", early: null },
      ),
    ).toBe(true);
  });
});

describe("where the questions come in the setup", () => {
  const base: OnboardingStatus = {
    location_id: "l",
    business: "Rose Lane Salon",
    time_zone: "Asia/Dubai",
    is_demo: false,
    check: null,
    confirmed: true,
    whatsapp: false,
    setup_ok: false,
    keyword: null,
    consent: false,
    accepted: false,
    checked: false,
    trial_ends_at: null,
    first_task_done: false,
    resume_code: null,
    questions_done: false,
  };
  const at = (s: Partial<OnboardingStatus>) =>
    screenOf({ status: { ...base, ...s }, whatsappOn: true, seen: {} });

  it("right after the business is chosen and confirmed, before Connect WhatsApp", () => {
    expect(at({})).toBe("questions");
    expect(at({ confirmed: false })).toBe("confirm");
    expect(at({ questions_done: true })).toBe("whatsapp");
    expect(STAGE_OF.questions).toBe(STAGE_OF.confirm);
  });

  it("is asked once: Continue and Skip both mark it done, and a status that does not say counts as done", () => {
    expect(at({ questions_done: true })).not.toBe("questions");
    const { questions_done: _gone, ...older } = base;
    expect(screenOf({ status: older, whatsappOn: true, seen: {} })).toBe("whatsapp");
  });

  it("is not asked of a demo business or one already through the four stages", () => {
    expect(at({ is_demo: true })).toBe("whatsapp");
    expect(at({ checked: true, whatsapp: true, consent: true, accepted: true })).toBe("checked");
  });
});

// The words of rendered markup: tags removed until none are left (the headline is split into spans).
function textOf(markup: string): string {
  let text = markup;
  for (let before = ""; before !== text;) {
    before = text;
    text = text.replace(/<[^<>]*>/g, "");
  }
  return text;
}

describe("the screens", () => {
  const html = async (el: () => unknown, data?: [unknown[], unknown]) => {
    const qc = new QueryClient();
    if (data) qc.setQueryData(data[0], data[1]);
    return renderToStaticMarkup(createElement(QueryClientProvider, { client: qc }, el() as never));
  };

  it("onboarding: the title, both questions, the choices, Continue and Skip", async () => {
    const { RequestQuestionsStage } = await import("../src/components/onboarding/request-answers");
    const out = await html(() =>
      createElement(RequestQuestionsStage, { locationId: LOC, onDone: async () => undefined }),
    );
    const text = textOf(out);
    expect(text).toContain("Two quick questions");
    expect(text).toContain(
      "Both are optional. You can skip them, and change your answers any time in About your business.",
    );
    for (const want of [
      Q_TRACKING,
      Q_EARLY,
      "A booking app",
      "WhatsApp or Instagram chats",
      "A notebook or diary",
      "Memory",
      "Something else",
      "Yes",
      "No",
    ]) {
      expect(text).toContain(want);
    }
    expect(out).toContain(">Continue<");
    expect(out).toContain(">Skip<");
    // The app box shows only once "A booking app" is chosen; one yellow button.
    expect(out).not.toContain("Name of the app (optional)");
    expect(out.match(/data-main-cta/g)).toHaveLength(1);
    expect(out).not.toContain("Clear answer");
  });

  it("about your business: the same questions with their saved answers, Clear answer and Save answers", async () => {
    const { RequestAnswersCard } = await import("../src/components/onboarding/request-answers");
    const out = await html(
      () => createElement(RequestAnswersCard, { locationId: LOC }),
      [["request-answers", LOC], { tracking: "booking_app", app: "Fresha", early: true }],
    );
    expect(out).toContain("Two questions from setup");
    expect(out).toContain("Both are optional. Change or clear them any time.");
    expect(out).toContain("Name of the app (optional)");
    expect(out).toContain('value="Fresha"');
    expect(out.match(/Clear answer/g)).toHaveLength(2);
    expect(out).toContain("Save answers");
  });

  it("staff: counts only, the first businesses in order, no contact details", async () => {
    const { RequestAnswersPanel } = await import("../src/components/staff/request-answers-panel");
    const data: StaffRequestAnswers = {
      generated_at: "2026-11-10T00:00:00Z",
      businesses: 12,
      answered_any: 11,
      tracking: { answered: 10, booking_app: 1, chats: 5, notebook: 1, memory: 2, other: 1 },
      early_access: { answered: 10, yes: 6, no: 4 },
      gate3: { first_ten_answered: 10, first_ten_qualifying: 3, verdict: "open" },
      qualifying: [
        {
          position: 1,
          business: "Rose Lane Salon",
          answered_on: "2026-10-21",
          keeps_requests: "chats",
          in_first_ten: true,
        },
        {
          position: 4,
          business: "Kings Barbers",
          answered_on: "2026-10-24",
          keeps_requests: "memory",
          in_first_ten: true,
        },
      ],
    };
    const out = await html(
      () => createElement(RequestAnswersPanel),
      [["staff-request-answers"], data],
    );
    expect(out).toContain("Early answers");
    for (const [, label] of TRACKING_CHOICES) expect(out).toContain(label);
    expect(out).toContain("Rose Lane Salon");
    expect(out.indexOf("Rose Lane Salon")).toBeLessThan(out.indexOf("Kings Barbers"));
    expect(out).toContain(
      "Of the first 10 businesses that answered (10 so far): 3 keep requests in chats, a notebook or memory and said yes.",
    );
    expect(out).toContain("It is open.");
    expect(out).not.toMatch(/@|mailto|\+\d{6,}/);
  });
});

describe("Gate 3's rule (master plan 30.48, tie rule 30.49 item 3)", () => {
  const g = (q: number, a: number, verdict: StaffRequestAnswers["gate3"]["verdict"]) =>
    gate3Line({ first_ten_answered: a, first_ten_qualifying: q, verdict });
  const g20 = (q: number, a: number, verdict: StaffRequestAnswers["gate3"]["verdict"]) =>
    gate3Line({
      first_ten_answered: 10,
      first_ten_qualifying: 2,
      first_twenty_answered: a,
      first_twenty_qualifying: q,
      window: 20,
      verdict,
    });
  it("says the rule once and what it means now", () => {
    expect(g(3, 10, "open")).toContain(
      "3 or more opens the next step. Fewer than 2 keeps it off. Exactly 2 counts the first 20 instead, where 5 or more opens it. It is open.",
    );
    expect(g(1, 10, "off")).toContain("It stays off.");
    expect(g(1, 6, "collecting")).toContain("Still collecting.");
    expect(g(1, 6, "collecting")).toContain("(6 so far)");
  });
  it("exactly 2 of the first 10 counts the first 20, where 5 opens it", () => {
    const wait = g20(3, 14, "extended");
    expect(wait).toContain(
      "Exactly 2 of the first 10 keep requests in chats, a notebook or memory and said yes",
    );
    expect(wait).toContain("the first 20 businesses that answered (14 so far): 3 keep requests");
    expect(wait).toContain(
      "5 or more of the 20 opens the next step. Fewer keeps it off. Still collecting.",
    );
    expect(g20(5, 17, "open")).toContain("It is open.");
    expect(g20(4, 20, "off")).toContain("It stays off.");
    expect(wait).not.toContain("lane R decides");
  });
  it("an older answer without the first 20 fields still reads", () => {
    expect(
      gate3Line({ first_ten_answered: 10, first_ten_qualifying: 2, verdict: "extended" }),
    ).toContain("Still collecting.");
  });
  it("holds no dash or exclamation mark", () => {
    for (const line of [
      g(3, 10, "open"),
      g(1, 10, "off"),
      g(1, 6, "collecting"),
      g20(3, 14, "extended"),
      g20(5, 17, "open"),
      g20(4, 20, "off"),
    ]) {
      expect(line).not.toMatch(/[\u2013\u2014!]/);
    }
  });
  it("labels every choice", () => {
    expect(Object.keys(CHOICE_LABEL)).toEqual([
      "booking_app",
      "chats",
      "notebook",
      "memory",
      "other",
    ]);
  });
});

describe("the migrations (20261110035354 and 20261110041123)", () => {
  const sql = readFileSync(
    "supabase/migrations/20261110035354_onboarding1_request_answers.sql",
    "utf8",
  );
  const fn = (name: string) => {
    const i = sql.indexOf(`function ${name}`);
    return sql.slice(i, sql.indexOf("$$;", sql.indexOf("$$", i + 40)) + 3);
  };
  it("is additive: no drop, no delete, no backfill of the existing rows", () => {
    expect(sql).not.toMatch(/\bdrop\s+(table|column|function|policy)\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    expect(sql).not.toMatch(/\bupdate\s+public\.locations\s+set\b[^;]*;\s*\n--\s*backfill/i);
  });
  it("keeps the answers to the location's own access: no new policy, no browser write, no anon", () => {
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/grant\s+(insert|update|all)[^;]*on\s+public\.locations/i);
    expect(sql).toMatch(
      /revoke all on function public\.save_request_answers\(uuid, text, text, boolean\) from public, anon;/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.save_request_answers\(uuid, text, text, boolean\) to authenticated;/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.staff_request_answers\(\) from public, anon;/,
    );
    expect(fn("public.save_request_answers")).toMatch(
      /has_location_role\(p_location, array\['owner', 'manager'\]\)/,
    );
    expect(fn("public.staff_request_answers")).toMatch(
      /if not public\.is_staff\(\) then raise exception 'forbidden'/,
    );
  });
  it("sends nothing because of an answer: the save function only updates the location and audits", () => {
    const save = fn("public.save_request_answers");
    expect(save).not.toMatch(/insert\s+into/i);
    expect(save).not.toMatch(/\bjobs\b|\bemails\b|notifications|whatsapp_|pg_net|http_post/i);
  });
  it("the follow-up migration keeps the choices out of the change log", () => {
    const next = readFileSync(
      "supabase/migrations/20261110041123_onboarding1_audit_booleans.sql",
      "utf8",
    );
    const body = next.slice(next.indexOf("perform private.audit"), next.indexOf("return v_out"));
    expect(body).toContain("answered_tracking");
    expect(body).not.toMatch(/'request_tracking'|'early_access_whatsapp'/);
    expect(next).not.toMatch(/\bdrop\s+(table|column|function)\b/i);
  });
  it("the staff function returns counts, business names and dates, and no email or phone", () => {
    const staff = fn("public.staff_request_answers");
    expect(staff).not.toMatch(/email|phone|resume_code|request_tracking_app|to_address/i);
    expect(staff).toMatch(
      /not l\.is_demo and not o\.is_demo and not coalesce\(o\.billing_test, false\)/,
    );
  });
});

describe("nothing public, nothing sent", () => {
  const files = (dir: string, re: RegExp): string[] =>
    !existsSync(dir)
      ? []
      : readdirSync(dir).flatMap((n) => {
          const p = join(dir, n);
          return statSync(p).isDirectory() ? files(p, re) : re.test(n) ? [p] : [];
        });
  // The words of the questions, in any form a page could repeat them.
  const QUESTION =
    /How do you keep track of client requests today|Want early access to new WhatsApp tools|Two quick questions|Two questions from setup/;
  const ALLOWED = new Set([
    "src/lib/request-answers.ts",
    "src/components/onboarding/request-answers.tsx",
    "src/components/staff/request-answers-panel.tsx",
  ]);

  it("appear in no public page, guide, industry page, email, WhatsApp builder, Nora file or ad", () => {
    const scanned = [
      ...files("src/routes", /\.tsx?$/).filter(
        (f) => !f.includes("_authenticated") && f !== "src/routes/privacy.tsx",
      ),
      ...files("src/components", /\.tsx?$/).filter(
        (f) => !ALLOWED.has(f) && !/onboarding\/|app\/|staff\/|home\//.test(f),
      ),
      ...files("src/content", /\.(ts|tsx|txt|json)$/),
      ...files("emails", /\.html$/),
      ...files("supabase/functions", /\.ts$/).filter((f) => !/\.test\.ts$/.test(f)),
      ...files("public", /\.(txt|html|xml)$/),
    ];
    const hits = scanned.filter((f) => QUESTION.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });

  it("never name the request book, and carry no dash, exclamation mark or Arabic", () => {
    for (const f of [
      ...ALLOWED,
      "supabase/migrations/20261110035354_onboarding1_request_answers.sql",
    ]) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(new RegExp("[\\u0600-\\u06FF]"));
      // Code comments may name the plan and use a hyphen; the lines a reader sees may not name the request book, use a dash or a bang.
      const lines = text.split("\n").filter((l) => !/^\s*(\/\/|--|\*|\/\*)/.test(l));
      expect(lines.join("\n"), f).not.toMatch(/request book/i);
      for (const l of lines) {
        expect(l, `${f}: ${l.trim()}`).not.toMatch(DASHES);
        expect(l, `${f}: ${l.trim()}`).not.toMatch(BANG);
      }
    }
    const section = readText("docs/COPY.md").split("## 73. Onboarding 1")[1] ?? "";
    expect(section.length).toBeGreaterThan(500);
    expect(section.replace(/\n\n##\s[\s\S]*$/, "")).not.toMatch(DASHES);
    expect(section).not.toMatch(BANG);
  });

  it("send nothing: the screens and the library import no email, WhatsApp or notification code", () => {
    for (const f of ALLOWED) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(
        /whatsapp-owner|callFunction|send-email|notify|sendBeacon/,
      );
    }
  });
});

describe("privacy: what Kabsi keeps about a business", () => {
  const privacy = readFileSync("src/routes/privacy.tsx", "utf8").replace(/\s+/g, " ");
  it("the privacy page lists the two answers and says nothing is sent because of them", () => {
    expect(privacy).toContain(
      "Two optional answers from setup: how you keep track of client requests today",
    );
    expect(privacy).toContain("whether you want to try new WhatsApp tools first");
    expect(privacy).toContain(
      "change or clear them in About your business. Kabsi sends nothing because of an answer.",
    );
  });
  it("facts 11, the built facts and the llms files say the same", () => {
    for (const f of [
      "knowledge/facts/11-privacy-security-and-data.md",
      "knowledge/kabsi-facts.md",
      "public/llms-full.txt",
    ]) {
      const text = readText(f);
      expect(text, f).toContain("two optional answers from onboarding");
      expect(text, f).toContain("Your two optional onboarding answers");
    }
  });
});

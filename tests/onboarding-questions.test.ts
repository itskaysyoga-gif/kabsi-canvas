import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  QUESTIONS_FIVE,
  SKIP_DEFAULTS,
  TONE_EXAMPLES,
  answerProblem,
  factsToSave,
  nothingAnswered,
} from "../src/lib/questions";
import type { Location } from "../src/lib/onboarding";

// P0.4-05 (K-45, K-141): the five questions. Answers land as facts the owner gave; skipping saves nothing and the defaults hold.
const loc: Location = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Yawmiyati Bakery",
  address: null,
  country: "LB",
  status: "access_pending",
  onboarding_step: "knowledge",
  consent_at: "2026-10-22T10:00:00Z",
  access_granted_at: null,
  created_at: "2026-10-22T10:00:00Z",
};

describe("the five questions (P0.4-05)", () => {
  it("are the five of K-45 in order: sign-off, tone, a contact for unhappy customers, what customers love, what never to say", () => {
    expect(QUESTIONS_FIVE.map((q) => q.id)).toEqual([
      "signature",
      "tone",
      "contact",
      "love",
      "never",
    ]);
    expect(QUESTIONS_FIVE.map((q) => q.field)).toEqual([
      "signature",
      "tone",
      "contact_phone",
      "mention",
      "avoid",
    ]);
    for (const q of QUESTIONS_FIVE) {
      expect(`${q.label} ${q.hint ?? ""} ${q.placeholder ?? ""}`).not.toMatch(/[—–!]/);
    }
  });

  it("the tone has three tappable examples", () => {
    expect(TONE_EXAMPLES.map((t) => t.value)).toEqual(["warm", "formal", "short"]);
    for (const t of TONE_EXAMPLES) {
      expect(t.example.length).toBeGreaterThan(10);
      expect(`${t.label} ${t.example}`).not.toMatch(/[—–!]/);
    }
  });

  it("skipping saves nothing: no fact is written for an empty or blank answer", () => {
    expect(factsToSave({})).toEqual([]);
    expect(factsToSave({ signature: "  ", love: "" })).toEqual([]);
    expect(nothingAnswered({})).toBe(true);
    expect(SKIP_DEFAULTS.join(" ")).toMatch(/business name/);
    expect(SKIP_DEFAULTS.join(" ")).toMatch(/warm/);
  });

  it("each answer becomes one fact in its field, trimmed, in the order of the questions", () => {
    expect(
      factsToSave({
        never: " Never promise same-day delivery ",
        signature: "Luca, Trattoria Verde",
        tone: "formal",
        contact: "+1 555 010 0100",
        love: "Fresh bread every morning",
      }),
    ).toEqual([
      { id: "signature", field: "signature", value: "Luca, Trattoria Verde" },
      { id: "tone", field: "tone", value: "formal" },
      { id: "contact", field: "contact_phone", value: "+1 555 010 0100" },
      { id: "love", field: "mention", value: "Fresh bread every morning" },
      { id: "never", field: "avoid", value: "Never promise same-day delivery" },
    ]);
    expect(nothingAnswered({ tone: "warm" })).toBe(false);
  });

  it("a phone number that is not a phone number, and a too long answer, are not saved", () => {
    const contact = QUESTIONS_FIVE.find((q) => q.id === "contact")!;
    expect(answerProblem(contact, "call me maybe")).toMatch(/phone number/);
    expect(answerProblem(contact, "+1 (555) 010-0100")).toBeNull();
    expect(answerProblem(contact, "")).toBeNull();
    const sign = QUESTIONS_FIVE.find((q) => q.id === "signature")!;
    expect(answerProblem(sign, "x".repeat(81))).toMatch(/80 characters/);
    expect(factsToSave({ contact: "call me maybe", signature: "Luca" })).toEqual([
      { id: "signature", field: "signature", value: "Luca" },
    ]);
  });
});

async function renderStep(opts: { number?: string; granted?: boolean }) {
  vi.resetModules();
  if (opts.number) {
    vi.doMock("../supabase/functions/_shared/whatsapp-setting.ts", () => ({
      WHATSAPP_NUMBER: opts.number,
      WHATSAPP_DIGITS: opts.number!.replace(/\D/g, ""),
      WHATSAPP_ON: true,
    }));
  } else {
    vi.doUnmock("../supabase/functions/_shared/whatsapp-setting.ts");
  }
  const { QuestionsStep } = await import("../src/components/onboarding/questions-step");
  const qc = new QueryClient();
  qc.setQueryData(["knowledge", loc.id], { facts: [], questions: [] });
  qc.setQueryData(["whatsapp-status"], { state: "none" });
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(QuestionsStep, {
        location: opts.granted ? { ...loc, access_granted_at: "2026-10-22T11:00:00Z" } : loc,
        onChanged: async () => {},
      }),
    ),
  );
}

describe("the step (P0.4-05)", () => {
  it("shows the five questions, Skip for now and the defaults, and WhatsApp as coming soon while there is no number", async () => {
    const html = await renderStep({});
    for (const q of QUESTIONS_FIVE) expect(html).toContain(q.label.replace(/'/g, "&#x27;"));
    expect(html).toContain("Skip for now");
    expect(html).toContain("Get your reviews on WhatsApp");
    expect(html).toContain("WhatsApp: coming soon");
    expect(html).not.toContain("Connect WhatsApp");
    expect(html).not.toContain("wa.me");
    expect(html).toContain("While you wait for access");
    expect((html.match(/bg-kb-yellow/g) ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("the same step offers Connect WhatsApp when the number setting is filled in, with no other change", async () => {
    const html = await renderStep({ number: "+12015550100" });
    expect(html).toContain("Connect WhatsApp");
    expect(html).not.toContain("coming soon");
    expect(html).toContain("Skip for now");
    for (const q of QUESTIONS_FIVE) expect(html).toContain(q.label.replace(/'/g, "&#x27;"));
  });

  it("says Kabsi has access once it has", async () => {
    const html = await renderStep({ granted: true });
    expect(html).toContain("Kabsi has access");
    expect(html).not.toContain("While you wait for access");
  });
});

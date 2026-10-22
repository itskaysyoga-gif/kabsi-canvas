// Onboarding step 6, from day 11 (K-141, K-126): the Home card that says the trial is nearly over and that the plan is the
// owner's to choose. Card payments are not open yet (facts 4.2), so the card says that in the facts file's words and offers
// no button that cannot work; it links to the Plan page, which always works. Entitlements are read only through
// public.entitlements (loadEntitlements). No prices here: Essentials and Pro are marked coming in the facts file.
import type { Entitlements } from "@/lib/entitlements";
import { CARD_PAYMENTS_COMING } from "@/lib/plans";

export const CHOICE_FROM_DAY = 11;

export type PlanChoice = {
  tone: "info" | "attention";
  title: string;
  body: string;
  /** The Plan page link. Never a checkout: there is none until card payments open. */
  cta: { to: "/app/plan"; label: string };
};

const dayWord = (n: number) => (n === 1 ? "1 day" : `${n} days`);

/** Whole days from now to a date, never below 0. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - now.getTime()) / 86_400_000));
}

/** The card for an owner, or null when there is nothing to choose yet (before day 11, a paid plan, a concierge business). */
export function planChoice(
  e: Pick<Entitlements, "state" | "trial"> | null,
  now: Date = new Date(),
): PlanChoice | null {
  if (!e) return null;
  const cta = { to: "/app/plan", label: "See your plan" } as const;
  if (e.state === "trial" && e.trial && e.trial.day >= CHOICE_FROM_DAY) {
    const left = daysUntil(e.trial.ends_at, now);
    return {
      tone: "info",
      title: left === 0 ? "Your Pro trial ends today" : `Your Pro trial ends in ${dayWord(left)}`,
      body: `You choose Essentials or Pro, monthly or yearly, on the Plan page. ${CARD_PAYMENTS_COMING} Your review link and QR code stay free either way.`,
      cta,
    };
  }
  if (e.state === "grace" && e.trial) {
    const left = daysUntil(e.trial.grace_ends_at, now);
    return {
      tone: "attention",
      title: "Your trial has ended",
      body: `Kabsi keeps watching your profile and preparing replies for ${dayWord(left)} more, but publishes nothing until you choose a plan. Whatever is waiting stays waiting. ${CARD_PAYMENTS_COMING}`,
      cta,
    };
  }
  if (e.state === "ended") {
    return {
      tone: "attention",
      title: "Your plan has ended",
      body: `Drafts, Google Protection and the Weekly Care Report are paused. ${CARD_PAYMENTS_COMING} Your review link and QR code keep working.`,
      cta,
    };
  }
  return null;
}

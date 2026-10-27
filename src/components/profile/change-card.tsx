import type { ReactNode } from "react";
import { StatusPill } from "@/components/kabsi/ui";
import { rowLabel as label, type Change } from "@/lib/profile-rows";

// The body of the card for one change Google Protection found (K-19), in Design 3's words ("Changes others made"): what
// Google shows now next to what you approved, who changed it as far as Kabsi knows, and that Kabsi changed nothing. The
// buttons and the confirm dialog are the caller's (OpenChange on the Kabsi website). Never names a person: Google only
// says that it changed the detail itself or accepted a suggestion.
// K-19, K-64, K-116.2, K-117: these need the owner, signed in, and carry the warning.
export const HIGH_RISK = ["name", "address", "main_category", "open_status", "map_pin"];
export const VERIFY_WARNING =
  "Changing this can make Google ask you to verify your business again.";
const WHO: Record<string, string> = {
  google_update: "Google changed this itself, or accepted a suggestion from the public.",
  scheduled_check: "We don't know who changed it.",
  notification: "Google told Kabsi about this change.",
};

// The detail in the owner's words, for "Put my phone number back" and "The new phone number is right".
const NOUN: Record<string, { noun: string; many?: boolean }> = {
  name: { noun: "business name" },
  phone: { noun: "phone number" },
  website: { noun: "website" },
  address: { noun: "address" },
  map_pin: { noun: "map pin" },
  main_category: { noun: "main category" },
  categories: { noun: "categories", many: true },
  regular_hours: { noun: "opening hours", many: true },
  special_hours: { noun: "special hours", many: true },
  open_status: { noun: "open status" },
  description: { noun: "description" },
  service_area: { noun: "service area" },
  attributes: { noun: "attributes", many: true },
};

/** The words for one changed field: the headline, the put-back button and the keep button. */
export function changeWords(field: string, business?: string | null) {
  const w = NOUN[field] ?? { noun: label(field).toLowerCase() };
  const what = w.many ? `new ${w.noun}` : `a new ${w.noun}`;
  return {
    noun: w.noun,
    headline: `Google shows ${what}${business ? ` for ${business}` : ""}.`,
    putBack: `Put my ${w.noun} back`,
    keep: `The new ${w.noun} ${w.many ? "are" : "is"} right`,
  };
}

export function changeFlags(change: Change) {
  return {
    confirmed: !!change.previous_fact_id,
    risky: HIGH_RISK.includes(change.field),
    googleRight: change.recommend === "accept",
  };
}

export function ChangeCardView({
  change,
  when,
  business,
  children,
}: {
  change: Change;
  /** The time Kabsi saw the change, already formatted by the caller. */
  when: string;
  /** The business's name, for the headline. */
  business?: string | null | undefined;
  /** Under the card's words: any error, the "owner decides" note and the buttons. */
  children?: ReactNode;
}) {
  const { confirmed, risky, googleRight } = changeFlags(change);
  const before = change.previous_value?.display || "(empty)";
  const now = change.google_value?.display || "(empty)";
  const words = changeWords(change.field, business);
  return (
    <article className="rounded-inner border border-warn/40 bg-warn-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill tone="warn">Needs you</StatusPill>
        <p className="text-small text-text-2">{when}</p>
      </div>
      <h3 className="mt-3 text-body font-bold text-text-1">{words.headline}</h3>
      {change.explanation ? (
        <p className="mt-1 text-small text-text-2">{change.explanation}</p>
      ) : null}
      <p className="mt-1 text-small text-text-2">
        {WHO[change.source] ?? WHO["scheduled_check"]} Kabsi changed nothing.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-inner bg-surface-1 p-3">
          <p className="text-label font-bold text-text-2">
            {confirmed ? "You approved" : "Not yet confirmed by you"}
          </p>
          <p dir="auto" className="mt-1 break-words text-body text-text-1">
            {before}
          </p>
        </div>
        <div className="rounded-inner bg-surface-1 p-3">
          <p className="text-label font-bold text-text-2">Google shows now</p>
          <p dir="auto" className="mt-1 break-words text-body font-semibold text-text-1">
            {now}
          </p>
        </div>
      </div>
      {googleRight && change.recommend_reason ? (
        <p className="mt-3 rounded-inner bg-surface-1 p-3 text-small text-text-1">
          <span className="font-bold">Kabsi recommends “{words.keep}”.</span>{" "}
          {change.recommend_reason}
        </p>
      ) : null}
      {risky ? <p className="mt-3 text-small text-text-2">{VERIFY_WARNING}</p> : null}
      {!confirmed ? (
        <p className="mt-3 text-small text-text-2">
          You have not confirmed this detail yet, so Kabsi will not put the old value back.
        </p>
      ) : null}
      {children}
    </article>
  );
}

import type { ReactNode } from "react";
import { rowLabel as label, type Change } from "@/lib/profile-rows";

// The body of the card for one change Google Protection found (K-19): what you approved next to what Google shows now,
// and why. The buttons and the confirm dialog are the caller's (OpenChange in the app). It lives in its own small file so
// the public website can show the real card, with an Example change, without loading the app's code.
// K-19, K-64, K-116.2, K-117: these need the owner, signed in, and carry the warning.
export const HIGH_RISK = ["name", "address", "main_category", "open_status", "map_pin"];
export const VERIFY_WARNING =
  "Changing this can make Google ask you to verify your business again.";
const WHO: Record<string, string> = {
  google_update: "Google changed this itself, or accepted a suggestion from the public.",
  scheduled_check: "We don't know who changed it.",
  notification: "Google told Kabsi about this change.",
};

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
  children,
}: {
  change: Change;
  /** The time Kabsi saw the change, already formatted by the caller. */
  when: string;
  /** Under the card's words: any error, the "owner decides" note and the buttons. */
  children?: ReactNode;
}) {
  const { confirmed, risky, googleRight } = changeFlags(change);
  const before = change.previous_value?.display || "(empty)";
  const now = change.google_value?.display || "(empty)";
  return (
    <article className="rounded-large border-2 border-kb-black bg-kb-white p-6">
      <p className="font-bold">{label(change.field)} changed on Google</p>
      <p className="mt-1 text-sm text-kb-stone">{when}</p>
      {change.explanation ? <p className="mt-3 leading-7">{change.explanation}</p> : null}
      <p className="mt-1 text-sm text-kb-stone">{WHO[change.source] ?? WHO["scheduled_check"]}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold uppercase text-kb-stone">
            {confirmed ? "You approved" : "Not yet confirmed by you"}
          </p>
          <p dir="auto" className="mt-1">
            {before}
          </p>
        </div>
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold uppercase text-kb-stone">Google shows now</p>
          <p dir="auto" className="mt-1">
            {now}
          </p>
        </div>
      </div>
      {googleRight && change.recommend_reason ? (
        <p className="mt-4 rounded-card bg-kb-sand p-3 text-sm">
          <span className="font-bold">Kabsi recommends “Google is right”.</span>{" "}
          {change.recommend_reason}
        </p>
      ) : null}
      {risky ? <p className="mt-3 text-sm text-kb-stone">{VERIFY_WARNING}</p> : null}
      {!confirmed ? (
        <p className="mt-3 text-sm text-kb-stone">
          You have not confirmed this detail yet, so Kabsi will not put the old value back.
        </p>
      ) : null}
      {children}
    </article>
  );
}

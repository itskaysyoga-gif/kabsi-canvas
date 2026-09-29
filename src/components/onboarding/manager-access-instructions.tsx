import type { ReactNode } from "react";
import { KABSI_GROUP_ID } from "@/lib/site";

const phoneSteps: ReactNode[] = [
  <>
    Open <strong>Google Maps</strong>, tap your profile picture, then{" "}
    <strong>Your business profiles</strong>.
  </>,
  <>
    Choose the business, then <strong>⋮</strong> or <strong>Profile settings</strong>, then{" "}
    <strong>People and access</strong>.
  </>,
  <>
    Tap <strong>Add</strong>, paste the Kabsi group ID <strong>{KABSI_GROUP_ID}</strong> (copy it
    below), choose <strong>Manager</strong>, then <strong>Invite</strong>.
  </>,
];

const computerSteps: ReactNode[] = [
  "Search for your business name on Google while signed in to the account that manages it.",
  <>
    Open the menu next to your business name and choose <strong>Business Profile settings</strong>.
  </>,
  <>
    Choose <strong>People and access</strong>.
  </>,
  <>
    Click <strong>Add</strong>.
  </>,
  <>
    Paste the Kabsi group ID <strong>{KABSI_GROUP_ID}</strong> (copy it below), choose{" "}
    <strong>Manager</strong>, and click <strong>Invite</strong>.
  </>,
];

export function ManagerAccessInstructions({
  mode,
  businessName,
}: {
  mode: "phone" | "computer";
  businessName?: string;
}) {
  const steps = mode === "phone" ? phoneSteps : computerSteps;

  return (
    <ol className="space-y-4">
      {steps.map((text, index) => (
        <li key={index} className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-kb-yellow text-sm font-bold">
            {index + 1}
          </span>
          <span className="leading-7">
            {mode === "phone" && index === 1 && businessName ? (
              <>
                Choose <strong>{businessName}</strong>, then <strong>⋮</strong> or{" "}
                <strong>Profile settings</strong>, then <strong>People and access</strong>.
              </>
            ) : (
              text
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

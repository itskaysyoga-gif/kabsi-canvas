import { Check, X } from "lucide-react";
import { ELIGIBLE, GUIDELINES_URL, NOT_ELIGIBLE } from "@/lib/eligibility";

// Who can use Kabsi (D300). The lists come from one file so every page says the same thing.
export function EligibilityBlock() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-large bg-kb-white p-6 shadow-kb">
        <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Kabsi works for</p>
        <ul className="mt-4 space-y-3 leading-7">
          {ELIGIBLE.map((t) => (
            <li key={t} className="flex gap-3">
              <Check className="mt-1 size-4 shrink-0" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-large bg-kb-white p-6 shadow-kb">
        <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">
          Google does not allow
        </p>
        <ul className="mt-4 space-y-3 leading-7">
          {NOT_ELIGIBLE.map((t) => (
            <li key={t} className="flex gap-3">
              <X className="mt-1 size-4 shrink-0" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-6 text-kb-stone">
          The full list is in{" "}
          <a
            href={GUIDELINES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-kb-ink underline underline-offset-4"
          >
            Google's Business Profile guidelines
          </a>
          .
        </p>
      </div>
    </div>
  );
}

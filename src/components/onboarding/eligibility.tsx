import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Eligibility = "yes" | "notverified" | "unsure" | null;

const OPTIONS: { value: Exclude<Eligibility, null>; label: string; hint: string }[] = [
  {
    value: "yes",
    label: "Yes, I manage it and it's verified",
    hint: "I can sign in to Google and edit this business profile.",
  },
  {
    value: "unsure",
    label: "I'm not sure",
    hint: "Show me how to check in 30 seconds.",
  },
  {
    value: "notverified",
    label: "No, it isn't verified yet, or someone else manages it",
    hint: "Show me what to do first.",
  },
];

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-3 space-y-3">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-kb-yellow text-xs font-bold">
            {i + 1}
          </span>
          <span className="leading-6">{text}</span>
        </li>
      ))}
    </ol>
  );
}

/** Asks whether the picked business is verified and managed by the person setting up. Kabsi can only
 * connect to a verified Google Business Profile, so this runs before anything is saved. */
export function EligibilityCheck({
  businessName,
  value,
  onChange,
}: {
  businessName: string;
  value: Eligibility;
  onChange: (v: Eligibility) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="mt-6 rounded-card border-2 border-kb-hairline p-4" aria-label="Quick check">
      <h3 className="font-bold">One quick check</h3>
      <p className="mt-1 text-sm leading-6 text-kb-stone">
        Kabsi works with a <strong>verified</strong> Google Business Profile that you own or manage.
        Is <strong>{businessName}</strong> yours on Google?
      </p>
      <div className="mt-3 space-y-2" role="radiogroup" aria-label="Profile status">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => {
              onChange(o.value);
              setCopied(false);
            }}
            className={cn(
              "flex w-full items-start gap-3 rounded-card border-2 p-3 text-left",
              value === o.value
                ? "border-kb-black bg-kb-sand"
                : "border-kb-hairline hover:border-kb-stone",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                value === o.value ? "border-kb-black bg-kb-black text-white" : "border-kb-stone",
              )}
              aria-hidden="true"
            >
              {value === o.value ? <Check className="size-3" /> : null}
            </span>
            <span>
              <span className="block font-medium">{o.label}</span>
              <span className="block text-sm text-kb-stone">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {value === "unsure" ? (
        <div className="mt-4 rounded-card bg-kb-sand p-4 text-sm">
          <p className="font-bold">How to check</p>
          <Steps
            items={[
              <>
                Open{" "}
                <a
                  className="font-medium underline"
                  href="https://business.google.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  business.google.com
                </a>{" "}
                and sign in with the Google account you use for the business.
              </>,
              <>
                If <strong>{businessName}</strong> is listed there and says{" "}
                <strong>Verified</strong>, pick <strong>Yes</strong> above.
              </>,
              <>
                If it isn't listed, or it says <strong>Get verified</strong>, or you can't sign in
                to it, pick <strong>No</strong> above and follow the steps.
              </>,
            ]}
          />
        </div>
      ) : null}

      {value === "notverified" ? (
        <div className="mt-4 rounded-card bg-kb-sand p-4 text-sm">
          <p className="font-bold">Get your profile ready first (free, done on Google)</p>
          <Steps
            items={[
              <>
                Go to{" "}
                <a
                  className="inline-flex items-center gap-1 font-medium underline"
                  href="https://business.google.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  business.google.com <ExternalLink className="size-3" aria-hidden="true" />
                </a>{" "}
                and sign in.
              </>,
              <>
                Find <strong>{businessName}</strong> and choose <strong>Get verified</strong>. If
                someone else already manages it, choose <strong>Request access</strong>, or ask them
                to use Kabsi instead.
              </>,
              <>
                Follow Google's steps. Google decides which methods it offers (video, phone, email
                or a postcard). A postcard can take several days.
              </>,
              <>Come back here once the profile says Verified. Your search will still be here.</>,
            ]}
          />
          <p className="mt-3 text-kb-stone">
            We can't start until Google has verified the profile, because that is what lets you
            approve replies for it.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={async () => {
              const url = `${window.location.origin}/guides`;
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Link copied" : "Copy our guides link to send to the manager"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

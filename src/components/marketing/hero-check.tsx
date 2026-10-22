// The free Profile Check's business search, in the homepage hero (lane R, 22 Oct 2026). A visitor can start the check
// without leaving the homepage. The real finder brings Cloudflare's Turnstile script with it, which costs the first load
// (Lighthouse mobile must stay at 90 or more on a cold cache), so the hero first shows a plain box of the same size and
// swaps the real finder in at the first touch or focus, or 3 seconds after load. What was typed carries over.
import { lazy, Suspense, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileCheckState } from "@/components/profile-check/use-profile-check";

const BusinessFinder = lazy(() =>
  import("@/components/profile-check/business-finder").then((m) => ({ default: m.BusinessFinder })),
);

const INPUT_CLASS = "h-[52px] rounded-card bg-kb-white px-4 text-base text-kb-ink";
const ARM_AFTER_MS = 3000;

function Plain({
  q,
  onChange,
  onWake,
}: {
  q: string;
  onChange: (v: string) => void;
  onWake: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onWake();
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <label htmlFor="hero-biz" className="sr-only">
        Business name and city
      </label>
      <Input
        id="hero-biz"
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onWake}
        onPointerDown={onWake}
        placeholder="Business name and city"
        maxLength={120}
        autoComplete="organization"
        className={INPUT_CLASS}
      />
      <Button type="submit" className="shrink-0 sm:w-48" disabled>
        <Search /> Find my business
      </Button>
    </form>
  );
}

export function HeroFinder({ state }: { state: ProfileCheckState }) {
  const [armed, setArmed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), ARM_AFTER_MS);
    return () => window.clearTimeout(t);
  }, []);

  const wake = () => {
    setFocused(true);
    setArmed(true);
  };
  const plain = <Plain q={q} onChange={setQ} onWake={wake} />;
  return (
    <div data-testid="hero-finder">
      {armed ? (
        <Suspense fallback={plain}>
          <BusinessFinder state={state} tone="dark" initialQuery={q} autoFocus={focused} />
        </Suspense>
      ) : (
        plain
      )}
    </div>
  );
}

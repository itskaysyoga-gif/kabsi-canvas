import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/turnstile";
import { cn } from "@/lib/utils";
import { CTA_PRIMARY } from "@/lib/site";
import type { ProfileCheckState } from "@/components/profile-check/use-profile-check";

/** The calm state when the Places daily cap is reached or the check is paused: "Back soon". No error colour, no dead end. */
export function BackSoon({ message }: { message: string }) {
  return (
    <div
      role="status"
      data-testid="back-soon"
      className="rounded-large bg-kb-sand p-6 text-kb-ink sm:p-8"
    >
      <h2 className="font-display text-3xl leading-tight">Back soon</h2>
      <p className="mt-3 max-w-xl leading-7 text-kb-stone">
        {message.replace(/^Back soon\.?\s*/, "") ||
          "The free check is paused for today. Please try again tomorrow."}
      </p>
      <p className="mt-3 max-w-xl leading-7 text-kb-stone">
        You do not have to wait to get started. Kabsi can look after your reviews and your listing,
        and you approve each step.
      </p>
      <Button asChild className="mt-5 w-full sm:w-auto">
        <Link to="/start">{CTA_PRIMARY}</Link>
      </Button>
    </div>
  );
}

/**
 * Step 1, "Which business is yours?": search by name and area, pick from the results. Turnstile guards the search and
 * the pick; each token is used once, so the widget is replaced after every call. No account is needed.
 */
export function BusinessFinder({
  state,
  tone = "light",
}: {
  state: ProfileCheckState;
  tone?: "light" | "dark";
}) {
  const [q, setQ] = useState("");
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const dark = tone === "dark";
  const { results, busy, error, backSoon } = state;

  async function search(e: FormEvent) {
    e.preventDefault();
    const t = token;
    setToken("");
    setRound((n) => n + 1);
    await state.search(q, t);
  }
  async function pick(place: { place_id: string; name: string; address: string }) {
    const t = token;
    setToken("");
    setRound((n) => n + 1);
    await state.pick(place, t);
  }

  if (backSoon) return <BackSoon message={error?.message ?? ""} />;

  return (
    <div>
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="check-biz" className="sr-only">
          Business name and city
        </label>
        <Input
          id="check-biz"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Business name and city"
          maxLength={120}
          autoComplete="organization"
          className="h-[52px] rounded-card bg-kb-white px-4 text-base text-kb-ink"
        />
        <Button
          type="submit"
          className="shrink-0 sm:w-48"
          disabled={busy || q.trim().length < 2 || !token}
        >
          <Search /> {busy && !results ? "Searching" : "Find my business"}
        </Button>
      </form>
      <div className="mt-3">
        <Turnstile key={round} onToken={setToken} />
      </div>
      {error ? (
        <p
          className={cn("mt-3 text-sm", dark ? "text-kb-yellow" : "text-kb-red")}
          role="alert"
          data-testid="check-error"
        >
          {error.message}
        </p>
      ) : null}
      {results ? (
        <ul className="mt-4 space-y-2" aria-label="Search results">
          {results.length === 0 ? (
            <li className={cn("text-sm", dark ? "text-kb-stone-on-dark" : "text-kb-stone")}>
              Nothing found. Try the exact name as it appears on Google Maps plus your city.
            </li>
          ) : null}
          {results.map((p) => (
            <li key={p.place_id}>
              <button
                type="button"
                disabled={busy || !token}
                onClick={() => void pick(p)}
                className={cn(
                  "flex min-h-14 w-full items-start gap-3 rounded-card p-4 text-left transition-colors disabled:cursor-wait disabled:opacity-60",
                  dark
                    ? "bg-white/5 hover:bg-white/10"
                    : "border-2 border-kb-hairline hover:border-kb-stone",
                )}
              >
                <MapPin
                  className={cn("mt-0.5 size-5 shrink-0", dark ? "text-kb-yellow" : "text-kb-ink")}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block font-bold">{p.name}</span>
                  <span
                    className={cn(
                      "block text-sm",
                      dark ? "text-kb-stone-on-dark" : "text-kb-stone",
                    )}
                  >
                    {p.address}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {busy && results.length ? (
            <li
              className={cn("text-sm", dark ? "text-kb-stone-on-dark" : "text-kb-stone")}
              role="status"
            >
              Checking what customers see on Google
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

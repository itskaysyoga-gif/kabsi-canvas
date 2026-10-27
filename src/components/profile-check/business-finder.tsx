import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/turnstile";
import { cn } from "@/lib/utils";
import { FreeToolBusy } from "@/components/shared/free-tool-busy";
import type { ProfileCheckState } from "@/components/profile-check/use-profile-check";

/**
 * Step 1, "Which business is yours?": search by name and area, pick from the results. Turnstile guards the search and
 * the pick; each token is used once, so the widget is replaced after every call. No account is needed.
 */
export function BusinessFinder({
  state,
  tone = "light",
  initialQuery = "",
  autoFocus = false,
}: {
  state: ProfileCheckState;
  tone?: "light" | "dark";
  /** The homepage hero starts with a plain box and swaps this in; what was typed so far carries over. */
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(initialQuery);
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

  if (backSoon) return <FreeToolBusy />;

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
          autoFocus={autoFocus}
          className="h-[52px] rounded-card bg-surface-1 px-4 text-body text-text-1"
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
          className={cn("mt-3 text-small", dark ? "text-kb-yellow" : "text-bad")}
          role="alert"
          data-testid="check-error"
        >
          {error.message}
        </p>
      ) : null}
      {results ? (
        <ul className="mt-4 space-y-2" aria-label="Search results">
          {results.length === 0 ? (
            <li className={cn("text-small", dark ? "text-kb-mute" : "text-text-2")}>
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
                    : "border-2 border-line hover:border-stroke",
                )}
              >
                <MapPin
                  className={cn("mt-0.5 size-5 shrink-0", dark ? "text-kb-yellow" : "text-text-1")}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block font-bold">{p.name}</span>
                  <span className={cn("block text-small", dark ? "text-kb-mute" : "text-text-2")}>
                    {p.address}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {busy && results.length ? (
            <li className={cn("text-small", dark ? "text-kb-mute" : "text-text-2")} role="status">
              Checking what customers see on Google
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

// Check 2 (1 Nov 2026): the business box of the free check, with suggestions while the visitor types.
// Google's Places Autocomplete (New) through Kabsi's own function (profile-snapshot, action "suggest"): the key never
// reaches the browser. After 3 characters and a 200 ms pause (Scan 3; was 300), at most 5 suggestions with the name and a short address.
// Choosing one hands the place and the session token to the parent, which ends the session with Place Details.
// If suggestions are not available (the daily cap, a limit, a Google error, no bot check) the box is a plain text box
// and the visitor searches then picks, as before. Nothing from Places is kept here: the list lives in memory only.
// The pattern is the WAI-ARIA 1.2 combobox with a listbox popup (list autocomplete, focus stays in the input).
import { AlertTriangle, MapPin } from "lucide-react";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { newSessionToken, suggestBusinesses, type FoundBusiness } from "@/lib/profile-check";

// Scan 3: the pass's code and the bot check's widget load on the box's first touch, not with the page.
const passStore = () => import("@/lib/suggest-pass");
const Turnstile = lazy(() =>
  import("@/components/turnstile").then((m) => ({ default: m.Turnstile })),
);
import { cn } from "@/lib/utils";

const MIN_CHARS = 3;
const PAUSE_MS = 200;
const TOKEN_WAIT_MS = 8_000;

export function BusinessCombobox({
  id,
  label,
  placeholder,
  hint,
  error,
  value,
  onChange,
  onPick,
  leading,
  className,
  autoFocus,
}: {
  id?: string | undefined;
  label: string;
  placeholder?: string | undefined;
  hint?: ReactNode | undefined;
  error?: ReactNode | undefined;
  value: string;
  onChange: (text: string) => void;
  /** The visitor chose a suggestion. `sessionToken` ends the Autocomplete session when passed to Place Details. */
  onPick: (place: FoundBusiness, sessionToken: string) => void;
  leading?: ReactNode | undefined;
  className?: string | undefined;
  autoFocus?: boolean | undefined;
}) {
  const auto = useId();
  const fid = id ?? auto;
  const listId = `${fid}-list`;
  const optionId = (i: number) => `${fid}-opt-${i}`;
  const input = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const listEl = useRef<HTMLUListElement>(null);

  // What the visitor typed (not text the page put in the box), so a default value or a chosen name never asks Google.
  const [typed, setTyped] = useState("");
  const [items, setItems] = useState<FoundBusiness[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const [available, setAvailable] = useState(true);
  const [needToken, setNeedToken] = useState(false);
  const [round, setRound] = useState(0);

  const session = useRef(newSessionToken());
  const pass = useRef<string | undefined>(undefined);
  // Scan 3 (30.34 item 2): the pass is asked once per search session, when the visitor first touches the box.
  const warming = useRef<Promise<void> | null>(null);
  // One warm-up per box: after it, the suggestion calls ask for their own bot check if they still need one.
  const warmed = useRef(false);
  // A suggestion call is waiting for a bot check token: a warm-up then would only queue a second waiter.
  const asking = useRef(false);
  const cancelAsk = useRef<(() => void) | undefined>(undefined);
  const token = useRef("");
  const waiters = useRef<((t: string) => void)[]>([]);

  // A Turnstile token works once. The widget is replaced after every token taken (the `round` key) so the next one is
  // ready; a run that is replaced by a newer keystroke cancels its wait, so it never takes the token the newer run needs.
  const onToken = useCallback((t: string) => {
    token.current = t;
    if (t && waiters.current.length) {
      const w = waiters.current.shift()!;
      token.current = "";
      setRound((n) => n + 1);
      w(t);
    }
  }, []);
  const takeToken = useCallback(() => {
    let timer: number | undefined;
    let waiter: ((t: string) => void) | undefined;
    const promise = new Promise<string>((resolve) => {
      if (token.current) {
        const t = token.current;
        token.current = "";
        setRound((n) => n + 1);
        resolve(t);
        return;
      }
      waiter = resolve;
      waiters.current.push(resolve);
      timer = window.setTimeout(() => cancel(), TOKEN_WAIT_MS);
    });
    // Cancelling (or timing out) answers "" and leaves the queue.
    const cancel = () => {
      window.clearTimeout(timer);
      const i = waiter ? waiters.current.indexOf(waiter) : -1;
      if (i >= 0) waiters.current.splice(i, 1);
      waiter?.("");
    };
    return { promise, cancel };
  }, []);

  // Scan 3 (30.34 item 2): on the first touch of the box, one bot check buys the pass for the whole search session, so the
  // first suggestion call carries it and the function is awake before the third character. A pass this tab already holds
  // (another box, an earlier page) is used as it is. If the pass cannot be had, the first suggestion asks as before.
  const warm = useCallback(() => {
    if (!available || warming.current || warmed.current || asking.current) return;
    warmed.current = true;
    warming.current = (async () => {
      const s = await passStore();
      pass.current ??= s.readSuggestPass();
      if (pass.current) return;
      setNeedToken(true);
      const w = takeToken();
      const t = await w.promise;
      const p = t ? await s.getSuggestPass(t) : undefined;
      if (p) {
        pass.current = p;
        s.saveSuggestPass(p);
        setNeedToken(false);
        // A suggestion call still waiting for a token goes on with the pass instead.
        cancelAsk.current?.();
      }
    })()
      .catch(() => undefined)
      .finally(() => {
        warming.current = null;
      });
  }, [available, takeToken]);

  useEffect(() => {
    const q = typed.trim();
    if (!available || q.length < MIN_CHARS) {
      setItems([]);
      setOpen(false);
      setActive(-1);
      setStatus("");
      return;
    }
    const ctrl = new AbortController();
    let dead = false;
    let cancelWait: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      void (async () => {
        // Twice at most: the second time only when the pass had run out and a fresh bot check is needed.
        // The pass being asked on the first touch is waited for, not raced with a second bot check.
        // At most 3 seconds: a slow warm-up never holds the box (the call below then asks with its own token).
        if (warming.current)
          await Promise.race([warming.current, new Promise((r) => window.setTimeout(r, 3_000))]);
        if (dead) return;
        const store = await passStore().catch(() => null);
        if (dead) return;
        pass.current ??= store?.readSuggestPass();
        for (let attempt = 0; attempt < 2 && !dead; attempt++) {
          let turnstile: string | undefined;
          if (!pass.current) {
            setNeedToken(true);
            const w = takeToken();
            cancelWait = w.cancel;
            cancelAsk.current = w.cancel;
            asking.current = true;
            turnstile = await w.promise;
            asking.current = false;
            cancelAsk.current = undefined;
            cancelWait = undefined;
            if (dead) return;
            // No token, but the warm-up got the pass meanwhile (it took the token first): carry on with the pass.
            if (!turnstile) pass.current ??= store?.readSuggestPass();
            if (!turnstile && !pass.current) {
              setAvailable(false);
              setNeedToken(false);
              return;
            }
          }
          const sentPass = pass.current;
          let r;
          try {
            // A call that carries a Turnstile token is not aborted: the server has spent the token and its answer holds
            // the pass the next calls need.
            r = await suggestBusinesses(
              { query: q, sessionToken: session.current, turnstile, pass: sentPass },
              turnstile ? undefined : ctrl.signal,
            );
          } catch {
            return; // aborted: a newer call is on its way
          }
          if (r.pass) {
            pass.current = r.pass;
            store?.saveSuggestPass(r.pass);
            setNeedToken(false);
          }
          if (dead) return;
          if (r.challengeFailed && sentPass) {
            pass.current = undefined;
            store?.saveSuggestPass(undefined);
            continue;
          }
          if (!r.available) {
            pass.current = undefined;
            setAvailable(false);
            setNeedToken(false);
            setItems([]);
            setOpen(false);
            setStatus("");
            return;
          }
          setItems(r.suggestions);
          setActive(-1);
          setOpen(r.suggestions.length > 0 && document.activeElement === input.current);
          setStatus(
            r.suggestions.length
              ? `${r.suggestions.length} ${r.suggestions.length === 1 ? "suggestion" : "suggestions"}. Use the up and down arrow keys, then Enter to choose.`
              : "No suggestions. Press Enter to search.",
          );
          return;
        }
      })();
    }, PAUSE_MS);
    return () => {
      dead = true;
      window.clearTimeout(timer);
      cancelWait?.();
      ctrl.abort();
    };
  }, [typed, available, takeToken]);

  // The highlighted option stays in view when the list scrolls (it is shortened on a small screen).
  useEffect(() => {
    if (open && active >= 0)
      document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps

  // With the phone keyboard open the list can fall below the visible part of the page: scroll the page up (the box stays
  // under the header), and if the list still does not fit, shorten the list so its last row and the attribution show.
  useEffect(() => {
    const list = listEl.current;
    if (!open || !popup.current || !list || !input.current) return;
    list.style.maxHeight = "";
    const visible = (window.visualViewport?.height ?? window.innerHeight) - 8;
    const overflow = popup.current.getBoundingClientRect().bottom - visible;
    if (overflow <= 0) return;
    const scrollBy = Math.min(
      overflow,
      Math.max(0, input.current.getBoundingClientRect().top - 80),
    );
    if (scrollBy > 0) window.scrollBy({ top: scrollBy });
    const left = overflow - scrollBy;
    if (left > 0) list.style.maxHeight = `${Math.max(144, list.clientHeight - left)}px`;
  }, [open, items]);

  const choose = (p: FoundBusiness) => {
    const used = session.current;
    // The session ends with the pick: the next typing session gets a new token.
    session.current = newSessionToken();
    setTyped("");
    setItems([]);
    setOpen(false);
    setActive(-1);
    setStatus("");
    onChange(p.name);
    onPick(p, used);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!items.length) return;
      e.preventDefault();
      const down = e.key === "ArrowDown";
      if (!open) {
        setOpen(true);
        setActive(down ? 0 : items.length - 1);
        return;
      }
      setActive((a) => (down ? (a + 1) % items.length : a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      // With an option highlighted, Enter chooses it; otherwise it submits the form as usual.
      const p = open && active >= 0 ? items[active] : undefined;
      if (p) {
        e.preventDefault();
        choose(p);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setActive(-1);
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const showList = open && items.length > 0;
  const describedBy = [error ? `${fid}-err` : null, hint ? `${fid}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={fid} className="mb-2 block text-small font-bold text-text-1">
        {label}
      </label>
      <div
        className={cn(
          "flex h-13 items-center gap-3 rounded-input border bg-surface-2 px-4 transition-[border-color,box-shadow] duration-150 ease-kb focus-within:border-text-1 focus-within:ring-1 focus-within:ring-text-1",
          error ? "border-bad ring-1 ring-bad" : "border-stroke",
        )}
      >
        {leading}
        <input
          ref={input}
          id={fid}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="search"
          spellCheck={false}
          maxLength={120}
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setTyped(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => {
            warm();
            if (items.length) setOpen(true);
          }}
          onPointerDown={warm}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-full w-full min-w-0 bg-transparent text-body text-text-1 outline-none placeholder:text-text-3 focus-visible:outline-none"
        />
      </div>

      {showList && (
        <div
          ref={popup}
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-card border border-line-strong bg-surface-1 shadow-lift"
        >
          <ul
            ref={listEl}
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            className="max-h-96 overflow-y-auto"
          >
            {items.map((p, i) => (
              <li
                key={p.place_id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                // mousedown would blur the input and close the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseMove={() => active !== i && setActive(i)}
                className={cn(
                  "flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3",
                  i === active && "bg-surface-2",
                )}
              >
                <MapPin className="mt-0.5 size-5 shrink-0 text-text-2" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-bold">{p.name}</span>
                  {p.address && (
                    <span className="block truncate text-small text-text-2">{p.address}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {/* Google's Places policies: results shown without a Google map carry the words "Google Maps" (exactly, not translated). */}
          <p
            className="border-t border-line px-4 py-2 text-start text-label font-semibold text-text-3"
            data-testid="places-attribution"
          >
            <span translate="no">Google Maps</span>
          </p>
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {status}
      </div>

      {needToken && (
        <div className="mt-2">
          <Suspense fallback={null}>
            <Turnstile key={round} onToken={onToken} />
          </Suspense>
        </div>
      )}

      {error && (
        <p
          id={`${fid}-err`}
          className="mt-2 flex items-start gap-1.5 text-small font-semibold text-bad"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${fid}-hint`} className="mt-2 text-small text-text-2">
          {hint}
        </p>
      )}
    </div>
  );
}

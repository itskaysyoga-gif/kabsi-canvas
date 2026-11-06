// Nora, the Kabsi assistant (D261): the AI helper on every public page and in the app. Answers only from the
// knowledge base, saves contact details the visitor offers, and hands off to a person by email.
// Phones: a bottom sheet of at most 75 percent of the screen over the dimmed page (Polish 4, master plan 30.25 item 4).
// Desktop: a panel above the launcher. The conversation survives a reload
// (visitor and conversation ids in localStorage, messages fetched back from the server).
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUp, Loader2, MessageCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";
import { hasStoredSession } from "@/lib/stored-session";
import { ASSISTANT_CONVERSATION_KEY, ASSISTANT_VISITOR_KEY } from "@/lib/assistant-storage";
import { cn } from "@/lib/utils";
import { WhatsappLink } from "@/components/shared/whatsapp-link";
import { CONTACT_EMAIL, WHATSAPP_NUMBER, WHATSAPP_ON } from "@/lib/site";
import { Turnstile } from "@/components/turnstile";
import { useAuth } from "@/components/auth/auth-provider";
import { setChrome, useChrome, useConsentOpen } from "@/components/kabsi/page-signals";

type Msg = { role: "user" | "assistant"; content: string };
const ENDPOINT = `${supabaseUrl}/functions/v1/assistant`;
const VISITOR_KEY = ASSISTANT_VISITOR_KEY;
const CONV_KEY = ASSISTANT_CONVERSATION_KEY;

const SITE_STARTERS = [
  "How does Kabsi work?",
  "How much does it cost?",
  "Is this allowed by Google?",
  "Does Kabsi work with my own NFC cards?",
];
const APP_STARTERS = [
  "How do I add Kabsi as a Manager?",
  "Why is a draft marked blocked?",
  "How do I renew my plan?",
  "I'd like to talk to a person",
];

function store(key: string, value?: string | null) {
  try {
    if (value === undefined) return window.localStorage.getItem(key);
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the chat still works for this page view */
  }
  return null;
}
// Helps the team see where chats come from (country from the time zone, device, referrer). No IP, no fingerprint.
function visitorMeta() {
  try {
    const w = window.innerWidth;
    return {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language,
      device: w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop",
      ref: document.referrer ? new URL(document.referrer).hostname : "",
    };
  } catch {
    return {};
  }
}

function visitorId() {
  let id = store(VISITOR_KEY);
  if (!id || !/^[a-z0-9-]{16,64}$/i.test(id)) {
    id = crypto.randomUUID();
    store(VISITOR_KEY, id);
  }
  return id;
}

// The signed-in person's token, if there is one. A visitor with no stored session never loads supabase-js for Nora.
async function accessToken(): Promise<string | undefined> {
  if (!hasStoredSession()) return undefined;
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

/** Below 640 px: where the sheet sits and how tall it may be, kept above the phone keyboard (visualViewport). */
function useSheetBox(on: boolean) {
  const [box, setBox] = useState<{ bottom: number; height: number } | null>(null);
  useLayoutEffect(() => {
    if (!on) return;
    const vv = window.visualViewport;
    const read = () => {
      const full = window.innerHeight;
      const seen = vv ? vv.height : full;
      const bottom = vv ? Math.max(0, full - (vv.offsetTop + vv.height)) : 0;
      // At most 75 percent of the screen, and never taller than what the keyboard leaves.
      setBox({ bottom, height: Math.min(Math.round(full * 0.75), Math.round(seen - 12)) });
    };
    read();
    vv?.addEventListener("resize", read);
    vv?.addEventListener("scroll", read);
    window.addEventListener("resize", read);
    return () => {
      vv?.removeEventListener("resize", read);
      vv?.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [on]);
  return box;
}

export function AssistantWidget({
  surface,
  launcher = true,
}: {
  surface: "site" | "app";
  /** false on the public pages: the page shell draws her button from the first paint (site-chrome.tsx). */
  launcher?: boolean;
}) {
  const path = useLocation({ select: (l) => l.pathname });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const conversation = useRef<string | null>(null);
  // G-16 (P0.6-05): a visitor who is not signed in passes Turnstile once, to start a conversation.
  const { user } = useAuth();
  const [hasConversation, setHasConversation] = useState(false);
  const [checkToken, setCheckToken] = useState("");
  const [checkKey, setCheckKey] = useState(0);
  const needsCheck = !user && !hasConversation;
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  // Placement on the public pages. Design 6 (lane R, 30 Oct 2026): the consent bar comes first and the menu covers the
  // page, so the launcher waits. Design 8 (Web 4, lane R decision 5, 1 Nov 2026): below 640 px there is no floating
  // launcher at all; Nora's button sits in the phone bar (site-chrome.tsx), which steps aside while she is open.
  const { menuOpen } = useChrome();
  const consentOpen = useConsentOpen();
  const [phone, setPhone] = useState(false);
  // Layout effect: the phone check is known before the launcher first paints, so it never flashes on a phone.
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  useEffect(() => {
    setChrome({ noraOpen: open });
  }, [open]);
  const waitOnSite = surface === "site" && (consentOpen || menuOpen || phone);
  const sheet = useSheetBox(open && phone);
  // Swipe down on the sheet's top to close it.
  const [drag, setDrag] = useState(0);
  const dragFrom = useRef<number | null>(null);

  // Load the previous conversation the first time the panel opens.
  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    const conv = store(CONV_KEY);
    if (!conv) return;
    conversation.current = conv;
    setHasConversation(true);
    void accessToken()
      .then((token) => {
        const headers: Record<string, string> = { ...anonHeaders };
        if (token) headers["authorization"] = `Bearer ${token}`;
        return fetch(
          `${ENDPOINT}?visitor=${encodeURIComponent(visitorId())}&conversation=${encodeURIComponent(conv)}`,
          { headers },
        );
      })
      .then((r) => r.json())
      .then((d: { messages?: Msg[]; handoff?: boolean }) => {
        if (d.messages?.length) setMessages(d.messages);
        if (d.handoff) setHandoff(true);
      })
      .catch(() => undefined);
  }, [open, loaded]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);
  // Escape closes; phones: stop the page behind the sheet from scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const small = window.matchMedia("(max-width: 639px)").matches;
    const prev = document.body.style.overflow;
    if (small) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  });

  // Other parts of the app can open Nora with a first message (the list of what needs attention).
  const sendRef = useRef<(t: string) => void>(() => undefined);
  // P0.4-11: a chat opened from an onboarding step's "Need a hand?" chip carries which screen it came from, so Nora
  // knows the step, and the conversation's page says it, so the team can count help per step.
  const onboardingRef = useRef<{ screen: string; page: string } | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const d = (
        e as CustomEvent<{ prompt?: string; onboarding?: { screen: string; page: string } }>
      ).detail;
      onboardingRef.current = d?.onboarding ?? null;
      const prompt = d?.prompt;
      if (prompt) window.setTimeout(() => sendRef.current(prompt), 150);
    };
    window.addEventListener("kabsi:open-nora", onOpen);
    return () => window.removeEventListener("kabsi:open-nora", onOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setDrag(0);
    window.setTimeout(() => {
      if (launcherRef.current) return launcherRef.current.focus();
      // On the public pages the shell's button takes focus back (site-chrome.tsx, NoraLauncher).
      if (document.querySelector("[data-nora-launcher]")) return;
      // On a phone the phone bar gives focus back to Nora's button in it (site-chrome.tsx).
      if (document.querySelector("[data-nora-bar]") && window.innerWidth < 640) return;
      // The launcher may be waiting (over the hero on a phone, or behind the menu): focus goes back to the page.
      const main = document.getElementById("main");
      main?.setAttribute("tabindex", "-1");
      main?.focus({ preventScroll: true });
    }, 0);
  }, []);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    if (needsCheck && !checkToken) {
      // Keep what they asked (a suggested question from a setup step, for one) so they only press send once the check is done.
      setInput(message);
      setError("Please complete the check below first.");
      return;
    }
    setError("");
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const token = await accessToken();
      const headers: Record<string, string> = {
        "content-type": "application/json",
        ...anonHeaders,
      };
      if (token) headers["authorization"] = `Bearer ${token}`;
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          visitor: visitorId(),
          conversation: conversation.current,
          message,
          page: onboardingRef.current?.page ?? path,
          surface,
          ...(onboardingRef.current
            ? { onboarding: { screen: onboardingRef.current.screen } }
            : {}),
          meta: visitorMeta(),
          ...(needsCheck ? { turnstile: checkToken } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        conversation_id?: string;
        reply?: string;
        handoff?: boolean;
        message?: string;
        error?: string;
      };
      if (needsCheck) {
        // A token works once: a new check is shown if this one was refused.
        setCheckToken("");
        setCheckKey((k) => k + 1);
      }
      if (body.error === "challenge_failed") {
        conversation.current = null;
        store(CONV_KEY, null);
        setHasConversation(false);
      }
      if (!res.ok || !body.reply)
        throw new Error(
          // Go live 1 (B-036): a failure without the server's message still gives a next step.
          body.message || `Nora could not answer. Try again, or write to ${CONTACT_EMAIL}.`,
        );
      if (body.conversation_id) {
        conversation.current = body.conversation_id;
        store(CONV_KEY, body.conversation_id);
        setHasConversation(true);
      }
      if (body.handoff) setHandoff(true);
      setMessages((m) => [...m, { role: "assistant", content: body.reply! }]);
    } catch (e) {
      setError(
        e instanceof Error && e.message !== "Failed to fetch"
          ? e.message
          : "Couldn't reach the assistant. Check your connection and try again.",
      );
    }
    setBusy(false);
  }

  sendRef.current = (t) => void send(t);

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }
  function restart() {
    conversation.current = null;
    store(CONV_KEY, null);
    setHasConversation(false);
    setMessages([]);
    setHandoff(false);
    setError("");
  }

  const starters = surface === "app" ? APP_STARTERS : SITE_STARTERS;

  // No launcher on the login and setup screens. Setup has its own "Need a hand?" chip (P0.4-11), which opens this panel.
  if (path === "/login") return null;
  const setupScreen = path === "/start";

  return (
    <>
      {/* Polish 1: no floating button on a signed-in screen; Nora opens from "Your account and help". */}
      {launcher && !open && !setupScreen && !waitOnSite && surface === "site" ? (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Nora, Kabsi's assistant"
          className={cn(
            "fixed bottom-4 right-4 z-40 flex size-12 items-center justify-center gap-2 rounded-full bg-kb-black text-sm font-bold text-kb-white shadow-[0_12px_32px_rgba(0,0,0,.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-kb-yellow sm:right-6",
            "sm:bottom-6 sm:h-14 sm:w-auto sm:pl-4 sm:pr-5",
          )}
        >
          <span className="grid size-8 place-items-center rounded-full bg-kb-sand text-kb-black">
            <MessageCircle className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Chat with Nora</span>
        </button>
      ) : null}
      {open && phone ? (
        // The dimmed page: a tap on it closes the sheet. The page behind does not scroll (the effect above).
        <div
          aria-hidden="true"
          data-nora-scrim
          onClick={close}
          className="fixed inset-0 z-50 touch-none bg-scrim"
        />
      ) : null}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kabsi-assistant-title"
          data-nora-panel
          style={
            phone && sheet
              ? {
                  bottom: sheet.bottom,
                  height: sheet.height,
                  transform: drag ? `translateY(${drag}px)` : undefined,
                }
              : undefined
          }
          className="fixed inset-x-0 bottom-0 z-50 flex h-[75dvh] flex-col overflow-hidden rounded-t-[1.25rem] bg-kb-white shadow-[0_-12px_40px_rgba(0,0,0,.25)] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100vh-48px))] sm:w-[400px] sm:rounded-panel sm:shadow-[0_24px_60px_rgba(0,0,0,.28)] sm:ring-1 sm:ring-kb-hairline"
        >
          <header
            className="relative flex items-center gap-3 bg-kb-carbon px-4 pt-4 pb-3 text-kb-white sm:py-3"
            onTouchStart={(e) => {
              dragFrom.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchMove={(e) => {
              const y = e.touches[0]?.clientY;
              if (dragFrom.current !== null && y !== undefined)
                setDrag(Math.max(0, y - dragFrom.current));
            }}
            onTouchEnd={() => {
              dragFrom.current = null;
              if (drag > 80) close();
              else setDrag(0);
            }}
          >
            {/* The grabber: a swipe down on the top of the sheet closes it (phones only). */}
            <span
              aria-hidden="true"
              className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/30 sm:hidden"
            />
            <span className="grid size-9 place-items-center rounded-full bg-kb-sand text-kb-black">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p id="kabsi-assistant-title" className="font-bold leading-tight">
                {phone ? "Nora, Kabsi's assistant" : "Nora from Kabsi"}
              </p>
              <p className="text-xs text-kb-mute">
                AI assistant · a real person is one message away
              </p>
            </div>
            {messages.length ? (
              <button
                type="button"
                onClick={restart}
                className="grid size-10 place-items-center rounded-full hover:bg-white/10"
                aria-label="Start a new conversation"
                title="New conversation"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={close}
              className="grid size-10 place-items-center rounded-full hover:bg-white/10"
              aria-label="Close the chat"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-kb-sand px-4 py-4"
            aria-live="polite"
          >
            <Bubble role="assistant">
              {surface === "app"
                ? "Hi, I'm Nora. Stuck on something? Ask me about replies, setup or your plan, and if I can't sort it, I'll get a person from the team for you."
                : "Hi, I'm Nora. I help business owners keep their Google Business Profile complete and current. Ask me anything about Kabsi, how it works or pricing. And if you'd rather talk to a person, just say so."}
            </Bubble>
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.role === "assistant" ? (
                  <RichText text={m.content} onNavigate={close} />
                ) : (
                  m.content
                )}
              </Bubble>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 px-1 text-sm text-kb-stone" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Writing…
              </div>
            ) : null}
            {!messages.length && !busy ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="min-h-10 rounded-pill border border-kb-hairline bg-kb-white px-3.5 py-2 text-left text-sm font-medium hover:border-kb-black"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            {handoff ? (
              <p className="rounded-card bg-kb-white p-3 text-xs leading-5 text-kb-stone ring-1 ring-kb-hairline">
                A person from Kabsi has this conversation and will reply by email.{" "}
                {WHATSAPP_ON ? (
                  <>
                    You can also message us on{" "}
                    <WhatsappLink kind="handover" glyph className="font-bold">
                      WhatsApp {WHATSAPP_NUMBER}
                    </WhatsappLink>
                    .
                  </>
                ) : (
                  <>
                    You can also write to{" "}
                    <a href="mailto:hello@kabsi.co" className="font-bold underline">
                      hello@kabsi.co
                    </a>
                    .
                  </>
                )}
              </p>
            ) : null}
            {open && needsCheck ? (
              <div className="flex justify-center" data-testid="nora-check">
                <Turnstile key={checkKey} onToken={setCheckToken} />
              </div>
            ) : null}
            {error ? (
              <p className="rounded-card bg-kb-red/10 p-3 text-sm text-kb-red" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={submit}
            className="border-t border-kb-hairline bg-kb-white p-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2 rounded-panel border border-kb-hairline bg-kb-white p-1.5 focus-within:border-kb-black">
              <label htmlFor="kabsi-assistant-input" className="sr-only">
                Your message
              </label>
              <textarea
                id="kabsi-assistant-input"
                ref={inputRef}
                dir="auto"
                rows={1}
                value={input}
                maxLength={2000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Ask anything, in any language"
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2.5 py-2.5 text-base outline-none placeholder:text-kb-stone"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black disabled:opacity-40"
              >
                <ArrowUp className="size-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] leading-4 text-kb-stone">
              AI answers from Kabsi's own information and can make mistakes. Don't share passwords
              or card numbers. See our{" "}
              <Link to="/privacy" onClick={close} className="underline">
                privacy policy
              </Link>
              .
            </p>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        dir="auto"
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-panel px-4 py-2.5 text-[15px] leading-6",
          role === "user"
            ? "rounded-br-md bg-kb-black text-kb-white"
            : "rounded-bl-md bg-kb-white text-kb-ink shadow-sm ring-1 ring-kb-hairline",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// A tiny, safe Markdown subset for replies: **bold**, [text](/internal-path or https link), "- " lists.
// No HTML is ever injected.
function RichText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`l${out.length}`} className="my-1 list-disc space-y-0.5 pl-5">
          {list}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((line, i) => {
    const m = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (m) list.push(<li key={i}>{inline(m[1] ?? "", onNavigate)}</li>);
    else {
      flush();
      out.push(
        <span key={i} className="block min-h-[0.5em]">
          {inline(line, onNavigate)}
        </span>,
      );
    }
  });
  flush();
  return <>{out}</>;
}

function inline(text: string, onNavigate: () => void): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<b key={m.index}>{m[1]}</b>);
    else {
      const href = m[3] ?? "";
      if (/^\/(?![/\\])/.test(href))
        parts.push(
          <a
            key={m.index}
            href={href}
            onClick={onNavigate}
            className="font-bold underline underline-offset-2"
          >
            {m[2]}
          </a>,
        );
      else if (/^(https:\/\/|mailto:)/.test(href))
        parts.push(
          <a
            key={m.index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline underline-offset-2"
          >
            {m[2]}
          </a>,
        );
      else parts.push(m[2]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

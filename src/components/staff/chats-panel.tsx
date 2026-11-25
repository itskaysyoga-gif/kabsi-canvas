// Staff: every conversation with Nora (D261), labelled by country, topic, intent and lead temperature,
// with filters, counts and a CSV export. Reads through the staff-only staff_chats / staff_chat_stats RPCs.
import { useEffect, useState } from "react";
import { RetryLine } from "@/components/kabsi/retry-line";
import { fmtDateTime } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { ChoiceChips } from "@/components/kabsi/d3-account";
import { Skeleton } from "@/components/kabsi/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { timeAgo } from "@/lib/dashboard";
import { Button, STAFF_CARD, STAFF_H2 } from "./staff-ui";

export type Chat = {
  id: string;
  updated_at: string;
  surface: string;
  status: string;
  first_page: string | null;
  country: string | null;
  language: string | null;
  device: string | null;
  category: string | null;
  intent: string | null;
  lead_temperature: string | null;
  sentiment: string | null;
  business_type: string | null;
  summary: string | null;
  next_step: string | null;
  message_count: number;
  email: string | null;
  name: string | null;
  business_name: string | null;
  phone: string | null;
  signed_in_business: string | null;
};
type Stat = { dimension: string; value: string; conversations: number };

const CATEGORIES = [
  "pricing",
  "how_it_works",
  "setup",
  "cards",
  "partners",
  "reviews_help",
  "google_policy",
  "account",
  "billing",
  "bug",
  "privacy",
  "other",
];
const INTENTS = ["buyer", "existing_customer", "partner", "support", "researching", "other"];
const TEMPS = ["hot", "warm", "cold"];
const nice = (v: string | null) => (v ? v.replace(/_/g, " ") : "-");

export type ChatFilter = {
  country: string;
  category: string;
  intent: string;
  temp: string;
  days: number;
};
/** The staff_chats read, the same for this panel and the Today page (App 5). */
export const chatsKey = (f: ChatFilter) =>
  ["staff-chats", f.country, f.category, f.intent, f.temp, f.days] as const;
export async function loadChats(f: ChatFilter): Promise<Chat[]> {
  const { data, error } = await supabase.rpc("staff_chats", {
    p_country: f.country || null,
    p_category: f.category || null,
    p_intent: f.intent || null,
    p_temperature: f.temp || null,
    p_days: f.days,
    p_limit: 300,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Chat[];
}
export const ALL_CHATS: ChatFilter = { country: "", category: "", intent: "", temp: "", days: 30 };

export function ChatsPanel() {
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [intent, setIntent] = useState("");
  const [temp, setTemp] = useState("");
  const [days, setDays] = useState(30);
  const [who, setWho] = useState<"all" | "handoff">("all");
  const filter = { country, category, intent, temp, days };
  const chats = useQuery({ queryKey: chatsKey(filter), queryFn: () => loadChats(filter) });
  const shown = (chats.data ?? []).filter((c) => who === "all" || c.status === "handoff");
  const stats = useQuery({
    queryKey: ["staff-chat-stats", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("staff_chat_stats", { p_days: days });
      if (error) throw new Error(error.message);
      return (data ?? []) as Stat[];
    },
  });
  const countries = (stats.data ?? []).filter((s) => s.dimension === "country");

  function csv() {
    const cols = [
      "updated_at",
      "country",
      "category",
      "intent",
      "lead_temperature",
      "sentiment",
      "name",
      "email",
      "business_name",
      "phone",
      "business_type",
      "summary",
      "next_step",
      "first_page",
      "status",
    ] as const;
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = [
      cols.join(","),
      ...(chats.data ?? []).map((c) => cols.map((k) => q(c[k])).join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = "kabsi-chats.csv";
    a.click();
  }

  const ids = shown.map((c) => c.id);
  const last = useQuery({
    queryKey: ["staff-chat-last", ids.join(",")],
    queryFn: () => loadLast(ids),
    enabled: ids.length > 0,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = shown.find((c) => c.id === openId) ?? null;
  const handoffs = (chats.data ?? []).filter((c) => c.status === "handoff").length;

  const select = "h-11 rounded-input border border-stroke bg-surface-1 px-3 text-small";
  return (
    <section className={STAFF_CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={STAFF_H2}>Chats with Nora</h2>
        {chats.data ? (
          <p className="text-small text-text-2">
            {handoffs ? `${handoffs} waiting for a person` : "Nobody is waiting for a person"}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-small text-text-2">
        Tap a chat to read it. Each one is labelled and emailed as a report about 10 minutes after
        it goes quiet.
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <ChoiceChips
          name="chat-who"
          legend="Show"
          value={who}
          onChange={(v) => setWho(v as "all" | "handoff")}
          options={[
            { value: "all", label: "Every chat" },
            { value: "handoff", label: "Needs a person" },
          ]}
        />
      </div>

      {chats.isError ? (
        <RetryLine
          className="mt-3"
          what="The chats did not load."
          onRetry={() => void chats.refetch()}
        />
      ) : null}
      <div className="mt-4">
        {chats.isLoading ? (
          <div className="space-y-2" role="status" aria-label="Loading chats">
            <Skeleton className="h-16 w-full rounded-inner" />
            <Skeleton className="h-16 w-full rounded-inner" />
          </div>
        ) : null}
        {chats.data && shown.length === 0 ? (
          <p className="rounded-inner bg-surface-2 p-4 text-small text-text-2">
            {who === "handoff"
              ? "Nobody is waiting for a person. Nora answers on the website and in Kabsi, and a chat shows here when she hands one over."
              : "No chats match. Nora's chats show here as they happen."}
          </p>
        ) : null}
        {shown.length ? (
          <ul className="-mx-2 divide-y divide-line">
            {shown.map((c) => {
              const msg = last.data?.get(c.id);
              const st = chatState(c.status);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(c.id)}
                    className="press flex w-full min-w-0 items-start gap-3 rounded-inner px-2 py-3 text-start hover:bg-surface-2 focus-visible:outline-2"
                    data-testid="chat-row"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-body font-bold">
                          {chatName(c)}
                        </span>
                        <span className="shrink-0 text-label text-text-2">
                          {timeAgo(c.updated_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-small text-text-2 break-words">
                        {msg ? (
                          <>
                            <span className="font-semibold text-text-1">
                              {msg.role === "user" ? "Them: " : "Nora: "}
                            </span>
                            <span dir="auto">{msg.content}</span>
                          </>
                        ) : (
                          (c.summary ?? `${c.message_count} messages`)
                        )}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={cn("rounded-pill px-2 py-0.5 text-label font-bold", st.cls)}
                        >
                          {st.word}
                        </span>
                        {c.lead_temperature ? (
                          <span className="rounded-pill border border-line px-2 py-0.5 text-label text-text-2">
                            {c.lead_temperature} lead
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ChevronRight className="mt-1 size-5 shrink-0 text-text-2" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <details className="mt-5 rounded-inner border border-line">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-small font-bold">
          Filters, figures and export
        </summary>
        <div className="border-t border-line p-4">
          {stats.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["temperature", "intent", "category", "country"].map((d) => (
                <div key={d} className="rounded-inner bg-surface-2 p-4 text-small">
                  <p className="text-label font-bold text-text-2">{d}</p>
                  <ul className="mt-2 space-y-1">
                    {stats
                      .data!.filter((s) => s.dimension === d)
                      .slice(0, 6)
                      .map((s) => (
                        <li key={s.value} className="flex justify-between gap-3">
                          <span className="truncate">{nice(s.value)}</span>
                          <b>{s.conversations}</b>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <select
              aria-label="Country"
              className={select}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.value} value={c.value === "unknown" ? "" : c.value}>
                  {c.value} ({c.conversations})
                </option>
              ))}
            </select>
            <select
              aria-label="Topic"
              className={select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All topics</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {nice(c)}
                </option>
              ))}
            </select>
            <select
              aria-label="Intent"
              className={select}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
            >
              <option value="">All intents</option>
              {INTENTS.map((c) => (
                <option key={c} value={c}>
                  {nice(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ChoiceChips
              name="chat-lead"
              legend="Lead"
              value={temp || "any"}
              onChange={(v) => setTemp(v === "any" ? "" : v)}
              options={[
                { value: "any", label: "All" },
                ...TEMPS.map((t) => ({ value: t, label: t })),
              ]}
            />
            <ChoiceChips
              name="chat-days"
              legend="Period"
              value={String(days)}
              onChange={(v) => setDays(Number(v))}
              options={[7, 30, 90, 365].map((d) => ({ value: String(d), label: `${d} days` }))}
            />
          </div>
          {chats.data?.length ? (
            <Button size="compact" variant="outline" className="mt-4" onClick={csv}>
              Download CSV
            </Button>
          ) : null}
        </div>
      </details>

      <ChatThread chat={opened} onClose={() => setOpenId(null)} />
    </section>
  );
}

/** The name a chat goes by in the list: the business first, then the person. */
export function chatName(c: Pick<Chat, "business_name" | "signed_in_business" | "name" | "email">) {
  return c.business_name ?? c.signed_in_business ?? c.name ?? c.email ?? "Website visitor";
}

/** The state chip: a word and its colour. */
export function chatState(status: string): { word: string; cls: string } {
  if (status === "handoff") return { word: "Needs a person", cls: "bg-kb-yellow text-kb-black" };
  if (status === "open") return { word: "Open", cls: "bg-info-soft text-text-1" };
  return { word: "Done", cls: "bg-surface-2 text-text-2" };
}

type Last = { conversation_id: string; role: string; content: string; created_at: string };
async function loadLast(ids: string[]): Promise<Map<string, Last>> {
  const { data, error } = await supabase.rpc("staff_chat_last" as never, { p_ids: ids } as never);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as Last[]).map((m) => [m.conversation_id, m]));
}
type Message = { id: number; role: string; content: string; created_at: string };
async function loadThread(id: string): Promise<Message[]> {
  const { data, error } = await supabase.rpc(
    "staff_chat_thread" as never,
    { p_conversation: id } as never,
  );
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

/** One chat, read in full: who, the labels, the summary and next step, then every message. */
function ChatThread({ chat, onClose }: { chat: Chat | null; onClose: () => void }) {
  const wide = useWide();
  const q = useQuery({
    queryKey: ["staff-chat-thread", chat?.id],
    queryFn: () => loadThread(chat!.id),
    enabled: !!chat,
  });
  const st = chat ? chatState(chat.status) : null;
  return (
    <Sheet open={!!chat} onOpenChange={(o) => (o ? null : onClose())}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        className={cn(
          "flex flex-col gap-0 border-line bg-surface-1 p-0 text-text-1",
          wide ? "w-[28rem] sm:max-w-[28rem]" : "max-h-[90dvh] rounded-t-panel",
        )}
      >
        {chat && st ? (
          <>
            <SheetHeader className="border-b border-line px-5 pt-6 pb-4 text-start sm:text-start">
              <SheetTitle className="pr-8 font-display text-h3 font-bold text-text-1">
                {chatName(chat)}
              </SheetTitle>
              <SheetDescription className="text-small text-text-2">
                {[
                  chat.name && chat.name !== chatName(chat) ? chat.name : null,
                  chat.country,
                  nice(chat.category),
                  fmtDateTime(chat.updated_at),
                ]
                  .filter((x) => x && x !== "-")
                  .join(" · ")}
              </SheetDescription>
              <span className="mt-2 flex flex-wrap gap-1.5">
                <span className={cn("rounded-pill px-2 py-0.5 text-label font-bold", st.cls)}>
                  {st.word}
                </span>
                {chat.lead_temperature ? (
                  <span className="rounded-pill border border-line px-2 py-0.5 text-label text-text-2">
                    {chat.lead_temperature} lead
                  </span>
                ) : null}
              </span>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {chat.summary || chat.next_step ? (
                <div className="mb-4 rounded-inner bg-surface-2 p-3 text-small">
                  {chat.summary ? <p>{chat.summary}</p> : null}
                  {chat.next_step ? (
                    <p className="mt-1 font-semibold">Next step: {chat.next_step}</p>
                  ) : null}
                </div>
              ) : null}
              {q.isError ? (
                <RetryLine what="The messages did not load." onRetry={() => void q.refetch()} />
              ) : q.isLoading ? (
                <div className="space-y-2" role="status" aria-label="Loading messages">
                  <Skeleton className="h-12 w-3/4 rounded-bubble" />
                  <Skeleton className="ml-auto h-12 w-3/4 rounded-bubble" />
                </div>
              ) : q.data?.length ? (
                <ol className="space-y-2">
                  {q.data.map((m) => (
                    <li
                      key={m.id}
                      className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}
                    >
                      <span
                        dir="auto"
                        className={cn(
                          "max-w-[85%] rounded-bubble px-3 py-2 text-small break-words whitespace-pre-line",
                          m.role === "user"
                            ? "bg-surface-2 text-text-1"
                            : "border border-line bg-surface-1 text-text-1",
                        )}
                      >
                        <span className="sr-only">{m.role === "user" ? "Them: " : "Nora: "}</span>
                        {m.content}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-small text-text-2">
                  No messages are kept for this chat any more. The summary above stays.
                </p>
              )}
            </div>
            <div className="border-t border-line px-5 py-3 text-small text-text-2">
              {[chat.email, chat.phone].filter(Boolean).join(" · ") || "No contact details given"}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function useWide() {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

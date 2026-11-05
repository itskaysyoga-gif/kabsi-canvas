// Staff: every conversation with Nora (D261), labelled by country, topic, intent and lead temperature,
// with filters, counts and a CSV export. Reads through the staff-only staff_chats / staff_chat_stats RPCs.
import { useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ChoiceChips } from "@/components/kabsi/d3-account";
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

  const select = "h-11 rounded-input border border-stroke bg-surface-1 px-3 text-small";
  return (
    <section className={STAFF_CARD}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={STAFF_H2}>Chats with Nora</h2>
          <p className="mt-1 text-small text-text-2">
            Each chat is labelled and emailed as a report about 10 minutes after it goes quiet.
          </p>
        </div>
        {chats.data?.length ? (
          <Button size="compact" variant="outline" onClick={csv}>
            Download CSV
          </Button>
        ) : null}
      </div>

      {stats.data?.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="mt-4 grid gap-4 md:grid-cols-3">
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
        <ChoiceChips
          name="chat-lead"
          legend="Lead"
          value={temp || "any"}
          onChange={(v) => setTemp(v === "any" ? "" : v)}
          options={[{ value: "any", label: "All" }, ...TEMPS.map((t) => ({ value: t, label: t }))]}
        />
        <ChoiceChips
          name="chat-days"
          legend="Period"
          value={String(days)}
          onChange={(v) => setDays(Number(v))}
          options={[7, 30, 90, 365].map((d) => ({ value: String(d), label: `${d} days` }))}
        />
      </div>

      {chats.isError ? <p className="mt-3 text-bad">{String(chats.error.message)}</p> : null}
      <div className="mt-4 space-y-3">
        {chats.isLoading ? <p className="text-text-2">Loading chats</p> : null}
        {chats.data && shown.length === 0 ? (
          <p className="text-text-2">
            {who === "handoff" ? "Nobody is waiting for a person." : "No chats match."}
          </p>
        ) : null}
        {shown.map((c) => (
          <details
            key={c.id}
            className="rounded-inner border border-line bg-surface-1 p-4 text-small"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center gap-2">
                <b>{c.name ?? c.email ?? c.signed_in_business ?? "Anonymous visitor"}</b>
                {c.lead_temperature ? (
                  <span
                    className={cn(
                      "rounded-pill px-2 py-0.5 text-label font-bold",
                      c.lead_temperature === "hot"
                        ? "bg-bad-soft text-bad"
                        : c.lead_temperature === "warm"
                          ? "bg-warn-soft text-warn"
                          : "bg-surface-2 text-text-2",
                    )}
                  >
                    {c.lead_temperature}
                  </span>
                ) : (
                  <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-label text-text-2">
                    not labelled yet
                  </span>
                )}
                {c.status === "handoff" ? (
                  <span className="rounded-pill bg-kb-black px-2 py-0.5 text-label font-bold text-kb-white">
                    needs a person
                  </span>
                ) : null}
                <span className="ml-auto text-label text-text-2">{fmtDateTime(c.updated_at)}</span>
              </div>
              <p className="mt-1 text-text-2">
                {[c.country, nice(c.category), nice(c.intent), c.business_type, c.device]
                  .filter((x) => x && x !== "-")
                  .join(" · ")}
              </p>
              {c.summary ? <p className="mt-2">{c.summary}</p> : null}
            </summary>
            <div className="mt-3 border-t border-line pt-3 text-text-2">
              {c.next_step ? <p>Next step: {c.next_step}</p> : null}
              <p>
                {[c.email, c.phone, c.business_name].filter(Boolean).join(" · ") ||
                  "No contact details given"}
              </p>
              <p>
                Started on {c.first_page ?? "-"} · {c.message_count} messages · {c.surface}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

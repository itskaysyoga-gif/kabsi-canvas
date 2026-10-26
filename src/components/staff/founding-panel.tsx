import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import {
  decideFounding,
  linkFounding,
  loadFounding,
  TRADE_LABEL,
  type FoundingApplication,
  type FoundingTrade,
} from "@/lib/programs";

// Founding 25 (master plan 30.17 section 1): applications to accept, waitlist or decline against the mix (10 beauty and
// hair, 5 food, 5 health, 5 other; a trade's open place goes to any trade after 30 days), the real places left, the
// link from an accepted place to its business (Pro for 90 days from the day Google access works, no card), and the
// day-45 kill gate: fewer than 10 of the 25 approving work at least once a week pauses new places.
export function FoundingPanel({ businesses }: { businesses: { id: string; name: string }[] }) {
  const q = useQuery({
    queryKey: ["staff-founding"],
    queryFn: loadFounding,
    refetchInterval: 120_000,
  });
  const [filter, setFilter] = useState<"open" | "all">("open");
  if (q.isLoading) return null;
  if (q.error)
    return (
      <p className="mt-8 text-sm text-kb-stone">
        Founding 25 did not load: {String(q.error.message)}
      </p>
    );
  const o = q.data;
  if (!o) return null;
  const apps = o.applications.filter((a) =>
    filter === "all" ? true : a.status === "new" || (a.status === "accepted" && !a.organization_id),
  );
  const g = o.kill_gate;
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">Founding 25</h2>
        <p className="text-sm text-kb-stone">
          {o.places.left} of {o.places.total} places left
          {o.places.open_to_any ? " · open places go to any trade" : ""}
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {(Object.keys(TRADE_LABEL) as FoundingTrade[]).map((t) => (
          <li key={t} className="rounded-card bg-kb-sand p-3">
            <p className="font-bold">{TRADE_LABEL[t]}</p>
            <p className="text-kb-stone">
              {o.places.by_trade[t]?.taken ?? 0} of {o.places.by_trade[t]?.cap ?? 0}
            </p>
          </li>
        ))}
      </ul>
      <div
        className={`mt-4 rounded-card p-4 text-sm ${g.below && g.linked > 0 ? "border-2 border-kb-red" : "bg-kb-sand"}`}
      >
        <p className="font-bold">Day 45 gate</p>
        <p className="mt-1">
          {g.program_day
            ? `Day ${g.program_day} of the program`
            : "No founding business has started yet"}
          {g.gate_on ? ` · gate on ${fmtDate(g.gate_on)}` : ""}
        </p>
        <p className="mt-1">
          Approved work in the last 7 days: {g.weekly_approvers} of {g.linked} linked businesses
          (needed: {g.needed} of 25).
          {g.below && g.program_day && g.program_day >= g.gate_day
            ? " Below the gate: pause new places and fix what stops them."
            : ""}
        </p>
      </div>
      {o.members.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-kb-stone">
              <tr>
                <th className="py-1 pr-3 font-medium">Business</th>
                <th className="py-1 pr-3 font-medium">Day</th>
                <th className="py-1 pr-3 font-medium">Approvals, 7 days</th>
                <th className="py-1 pr-3 font-medium">Weeks with an approval</th>
                <th className="py-1 font-medium">Plan</th>
              </tr>
            </thead>
            <tbody>
              {o.members.map((m) => (
                <tr key={m.application_id} className="border-t border-kb-hairline">
                  <td className="py-2 pr-3">{m.business}</td>
                  <td className="py-2 pr-3">{m.day ?? "waiting for access"}</td>
                  <td className="py-2 pr-3">{m.approvals_7d}</td>
                  <td className="py-2 pr-3">
                    {m.weeks ? `${m.weeks_with_approval} of ${m.weeks}` : "-"}
                  </td>
                  <td className="py-2">
                    {m.paying ? "Paying" : m.ends_at ? `Free until ${fmtDate(m.ends_at)}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button
          size="compact"
          variant={filter === "open" ? "outline" : "ghost"}
          onClick={() => setFilter("open")}
        >
          To decide
        </Button>
        <Button
          size="compact"
          variant={filter === "all" ? "outline" : "ghost"}
          onClick={() => setFilter("all")}
        >
          All applications
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        {apps.length === 0 ? <p className="text-kb-stone">Nothing to decide.</p> : null}
        {apps.map((a) => (
          <Application key={a.id} app={a} businesses={businesses} />
        ))}
      </div>
    </section>
  );
}

function Application({
  app,
  businesses,
}: {
  app: FoundingApplication;
  businesses: { id: string; name: string }[];
}) {
  const client = useQueryClient();
  const [msg, setMsg] = useState("");
  const [location, setLocation] = useState("");
  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      setMsg("");
      void client.invalidateQueries({ queryKey: ["staff-founding"] });
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : String(e)),
  });
  return (
    <article className="rounded-large bg-kb-white p-5 shadow-kb">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{app.business_name}</p>
          <p className="text-sm text-kb-stone">
            {TRADE_LABEL[app.trade]} · {app.business_kind} · {app.country} · {app.whatsapp}
          </p>
        </div>
        <p className="text-xs text-kb-stone">
          {app.status} · applied {fmtDate(app.created_at)}
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{app.why_now}</p>
      <p className="mt-2 text-xs text-kb-stone">
        Case study: {app.case_study === "named" ? "named" : "anonymous"} · check-in every two weeks:
        yes
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {app.status !== "accepted" ? (
          <Button
            size="compact"
            variant="outline"
            disabled={run.isPending}
            onClick={() => run.mutate(() => decideFounding(app.id, "accepted"))}
          >
            Accept
          </Button>
        ) : null}
        {app.status !== "waitlisted" && !app.organization_id ? (
          <Button
            size="compact"
            variant="outline"
            disabled={run.isPending}
            onClick={() => run.mutate(() => decideFounding(app.id, "waitlisted"))}
          >
            Waitlist
          </Button>
        ) : null}
        {app.status !== "declined" && !app.organization_id ? (
          <Button
            size="compact"
            variant="outline"
            disabled={run.isPending}
            onClick={() => run.mutate(() => decideFounding(app.id, "declined"))}
          >
            Decline
          </Button>
        ) : null}
      </div>
      {app.status === "accepted" && !app.organization_id ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-sm" htmlFor={`f25-${app.id}`}>
            Their business on Kabsi
          </label>
          <select
            id={`f25-${app.id}`}
            className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Choose…</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Button
            size="compact"
            variant="outline"
            disabled={!location || run.isPending}
            onClick={() => run.mutate(() => linkFounding(app.id, location))}
          >
            Link and give 90 days of Pro
          </Button>
        </div>
      ) : null}
      {app.organization_id ? (
        <p className="mt-3 text-sm text-kb-stone">
          Linked {app.linked_at ? fmtDate(app.linked_at) : ""}
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-kb-red">{msg}</p> : null}
    </article>
  );
}

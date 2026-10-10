import { useState } from "react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { amStaff, contentCall } from "@/lib/reviews";
import { track } from "@/lib/telemetry";
import { ShieldCheck as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Google Protection (K-19, P0.2-04): Kabsi compares your Google profile with the details you confirmed and asks you
// when they differ. Nothing changes on Google until you choose. The full Google Profile screen is P0.3-11; this page
// keeps to the change cards, what Kabsi watches and the history.
export const Route = createFileRoute("/_authenticated/app/shield")({
  head: () => ({
    meta: [{ title: "Google Protection | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: ShieldPage,
});

type Value = { display?: string } | null;
type Change = {
  id: string;
  field: string;
  previous_value: Value;
  previous_fact_id: string | null;
  google_value: Value;
  source: string;
  status: string;
  explanation: string | null;
  recommend: string | null;
  recommend_reason: string | null;
  support_requested_at: string | null;
  detected_at: string;
};
type Fact = { key: string; value: Value; status: string };

const LABEL: Record<string, string> = {
  name: "Business name",
  phone: "Phone",
  website: "Website",
  address: "Address",
  regular_hours: "Opening hours",
  main_category: "Main category",
  open_status: "Open status",
  map_pin: "Map pin",
};
// K-19, K-64, K-116.2, K-117: these need the owner, signed in, and carry the warning.
const HIGH_RISK = ["name", "address", "main_category", "open_status", "map_pin"];
const VERIFY_WARNING = "Changing this can make Google ask you to verify your business again.";
const STATUS: Record<string, string> = {
  accepted: "You said Google is right",
  rejected: "Your information is on its way to Google",
  corrected: "Your information is back on Google",
  failed: "Google did not take your information",
  expired: "No answer in 14 days",
  superseded: "Replaced by a newer change",
};
const WHO: Record<string, string> = {
  google_update: "Google changed this itself, or accepted a suggestion from the public.",
  scheduled_check: "We don't know who changed it.",
  notification: "Google told Kabsi about this change.",
};
const OPEN = ["detected", "awaiting_review"];
const label = (field: string) => LABEL[field] ?? field.replace(/_/g, " ");

async function loadShield(locationId: string) {
  const [changes, facts] = await Promise.all([
    supabase
      .from("profile_changes")
      .select(
        "id, field, previous_value, previous_fact_id, google_value, source, status, explanation, recommend, recommend_reason, support_requested_at, detected_at",
      )
      .eq("location_id", locationId)
      .order("detected_at", { ascending: false })
      .limit(30),
    supabase
      .from("knowledge_facts")
      .select("key, value, status")
      .eq("location_id", locationId)
      .like("slot", "profile.%")
      .is("superseded_by", null),
  ]);
  if (changes.error) throw new Error(changes.error.message);
  if (facts.error) throw new Error(facts.error.message);
  return { changes: (changes.data ?? []) as Change[], facts: (facts.data ?? []) as Fact[] };
}

function ShieldPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const data = useQuery({
    queryKey: ["shield", loc?.id],
    queryFn: () => loadShield(loc!.id),
    enabled: !!loc,
    refetchInterval: 60_000,
  });
  const refresh = () =>
    Promise.all(
      [["shield"], ["dashboard"], ["activity"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const changes = data.data?.changes ?? [];
  const open = changes.filter((c) => OPEN.includes(c.status));
  const past = changes.filter((c) => !OPEN.includes(c.status));
  const facts = new Map((data.data?.facts ?? []).map((f) => [f.key, f]));
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Profile</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Google Protection</h1>
      <p className="mt-2 max-w-2xl text-kb-stone">
        Kabsi compares your Google profile with the details you confirmed and asks you when they
        differ. Google sometimes changes details itself or accepts edits from the public. Nothing
        changes on Google until you choose.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {data.error ? (
        <p className="mt-6 text-kb-red" role="alert">
          Couldn't load your profile. Refresh the page.
        </p>
      ) : null}
      {loc?.concierge ? <EarlyAccessNotice what="Google Protection" /> : null}
      {loc && !loc.concierge && loc.status !== "active" ? (
        <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
          <p className="font-bold">
            Google Protection starts once Kabsi can reach your Google profile.
          </p>
          <Button asChild size="compact" className="mt-4">
            <Link to="/start">Continue setup</Link>
          </Button>
        </div>
      ) : loc && !data.isLoading && !data.error && !facts.size ? (
        <p className="mt-6 text-kb-stone">
          Kabsi reads your Google profile within a few minutes of going active.
        </p>
      ) : null}
      <div className="mt-7 space-y-4">
        {open.map((c) => (
          <OpenChange key={c.id} change={c} onDone={refresh} />
        ))}
      </div>
      {facts.size ? (
        <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-kb-green" aria-hidden="true" />
            <h2 className="font-bold">
              {open.length ? "What Kabsi watches" : "Watching. No changes waiting."}
            </h2>
          </div>
          <dl className="mt-4 divide-y divide-kb-hairline">
            {Object.keys(LABEL).map((k) => {
              const f = facts.get(k);
              const confirmed = f?.status === "verified";
              return (
                <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-kb-stone">{LABEL[k]}</dt>
                  <dd dir="auto" className="min-w-0 break-words text-right font-medium">
                    {f?.value?.display || "-"}
                    {f?.value && !confirmed ? (
                      <span className="block text-xs font-normal text-kb-stone">
                        Not yet confirmed by you
                      </span>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ) : null}
      {past.length ? (
        <div className="mt-8">
          <h2 className="text-lg font-bold">History</h2>
          <div className="mt-3 space-y-2">
            {past.map((c) => (
              <div key={c.id} className="rounded-card bg-kb-white p-4 text-sm shadow-kb">
                <p className="font-medium">
                  {label(c.field)} ·{" "}
                  {c.support_requested_at
                    ? "Kabsi's team is asking Google support"
                    : (STATUS[c.status] ?? c.status)}
                </p>
                <p className="text-kb-stone">
                  {fmtDate(c.detected_at)} ·{" "}
                  {c.google_value
                    ? `Google showed “${c.google_value.display || "(empty)"}”`
                    : "Details removed after 30 days (Google's rule)"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {loc ? <StaffEdit locationId={loc.id} /> : null}
    </div>
  );
}

function OpenChange({ change, onDone }: { change: Change; onDone: () => unknown }) {
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  const confirmed = !!change.previous_fact_id;
  const risky = HIGH_RISK.includes(change.field);
  const googleRight = change.recommend === "accept";
  async function decide(decision: "accept" | "reject") {
    setBusy(decision);
    setErr("");
    try {
      // A third conflict in 30 days comes back as "support": the history then says Kabsi's team asks Google.
      await contentCall({ do: "shield_decide", change_id: change.id, decision });
      track(decision === "reject" ? "shield_reverted" : "shield_kept", { channel: "dashboard" });
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong. Nothing changed.");
    }
    setBusy("");
  }
  const before = change.previous_value?.display || "(empty)";
  const now = change.google_value?.display || "(empty)";
  return (
    <article className="rounded-large border-2 border-kb-black bg-kb-white p-6">
      <p className="font-bold">{label(change.field)} changed on Google</p>
      <p className="mt-1 text-sm text-kb-stone">{fmtDateTime(change.detected_at)}</p>
      {change.explanation ? <p className="mt-3 leading-7">{change.explanation}</p> : null}
      <p className="mt-1 text-sm text-kb-stone">{WHO[change.source] ?? WHO["scheduled_check"]}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold uppercase text-kb-stone">
            {confirmed ? "You approved" : "Not yet confirmed by you"}
          </p>
          <p dir="auto" className="mt-1">
            {before}
          </p>
        </div>
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold uppercase text-kb-stone">Google shows now</p>
          <p dir="auto" className="mt-1">
            {now}
          </p>
        </div>
      </div>
      {googleRight && change.recommend_reason ? (
        <p className="mt-4 rounded-card bg-kb-sand p-3 text-sm">
          <span className="font-bold">Kabsi recommends “Google is right”.</span>{" "}
          {change.recommend_reason}
        </p>
      ) : null}
      {risky ? <p className="mt-3 text-sm text-kb-stone">{VERIFY_WARNING}</p> : null}
      {!confirmed ? (
        <p className="mt-3 text-sm text-kb-stone">
          You have not confirmed this detail yet, so Kabsi will not put the old value back.
        </p>
      ) : null}
      {err ? (
        <p className="mt-3 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {/* One primary button: the recommended choice, or "Keep my information" when Kabsi has no view. */}
        {confirmed && !googleRight ? (
          <>
            <Button className="w-full sm:w-auto" disabled={!!busy} onClick={() => setConfirm(true)}>
              {busy === "reject" ? "Saving…" : "Keep my information"}
            </Button>
            <Button variant="ghost" disabled={!!busy} onClick={() => void decide("accept")}>
              {busy === "accept" ? "Saving…" : "Google is right"}
            </Button>
          </>
        ) : (
          <>
            <Button
              className="w-full sm:w-auto"
              disabled={!!busy}
              onClick={() => void decide("accept")}
            >
              {busy === "accept" ? "Saving…" : "Google is right"}
            </Button>
            {confirmed ? (
              <Button variant="ghost" disabled={!!busy} onClick={() => setConfirm(true)}>
                {busy === "reject" ? "Saving…" : "Keep my information"}
              </Button>
            ) : null}
          </>
        )}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Keep your {label(change.field).toLowerCase()} on Google?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kabsi sends your approved value to Google: {before}.
              {googleRight && change.recommend_reason ? ` ${change.recommend_reason}` : ""}
              {risky ? ` ${VERIFY_WARNING}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => void decide("reject")}>
              Keep my information
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

// Staff only, simulated locations only: pretend Google edited the profile. The keys are the mock listing's own.
const MOCK_FIELDS: [string, string][] = [
  ["title", "Business name"],
  ["phone", "Phone"],
  ["address", "Address"],
  ["website", "Website"],
  ["hours", "Opening hours"],
  ["categories", "Main category"],
  ["open_status", "Open status (OPEN, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY)"],
  ["map_pin", "Map pin (latitude, longitude)"],
];
function StaffEdit({ locationId }: { locationId: string }) {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
  const [field, setField] = useState("phone");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  if (!staff.data) return null;
  async function run() {
    const { error } = await supabase.rpc("staff_mock_listing_edit", {
      p_location: locationId,
      p_field: field,
      p_value: value,
    });
    setMsg(error ? `Couldn't: ${error.message}` : "Edited. The alert arrives within 5 minutes.");
  }
  return (
    <details className="mt-10 rounded-large border border-dashed border-kb-hairline p-5">
      <summary className="cursor-pointer text-sm font-bold">Staff: simulate a Google edit</summary>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
        >
          {MOCK_FIELDS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <Input
          aria-label="New value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New value"
        />
        <Button
          size="compact"
          variant="outline"
          disabled={!value.trim()}
          onClick={() => void run()}
        >
          Simulate
        </Button>
      </div>
      {msg ? <p className="mt-3 text-sm text-kb-stone">{msg}</p> : null}
    </details>
  );
}

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

// Google Protection (D218): Kabsi watches the listing and alerts you when something changes. It can't stop
// Google or the public from editing, but it can put your version back with one tap.
export const Route = createFileRoute("/_authenticated/app/shield")({
  head: () => ({
    meta: [{ title: "Google Protection | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: ShieldPage,
});

type FieldValue = { display: string };
type Change = {
  id: string;
  field: string;
  old_value: FieldValue | null;
  new_value: FieldValue | null;
  state: string;
  created_at: string;
};
const LABEL: Record<string, string> = {
  title: "Business name",
  phone: "Phone",
  address: "Address",
  website: "Website",
  hours: "Opening hours",
  categories: "Main category",
};
const STATE: Record<string, string> = {
  reverting: "Being put back",
  reverted: "Put back",
  kept: "Kept the new one",
  revert_failed: "Couldn't put back",
};

async function loadShield(locationId: string) {
  const [base, changes] = await Promise.all([
    supabase
      .from("listing_baselines")
      .select("fields, updated_at")
      .eq("location_id", locationId)
      .maybeSingle(),
    supabase
      .from("listing_changes")
      .select("id, field, old_value, new_value, state, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return {
    base: base.data as { fields: Record<string, FieldValue> } | null,
    changes: (changes.data ?? []) as Change[],
  };
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
  const open = (data.data?.changes ?? []).filter((c) => c.state === "open");
  const past = (data.data?.changes ?? []).filter((c) => c.state !== "open");
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Profile</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Google Protection</h1>
      <p className="mt-2 max-w-2xl text-kb-stone">
        Kabsi watches your Google listing and emails you when something changes. Google sometimes
        accepts edits from the public. Kabsi can't stop that, but it can put your version back in
        one tap.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {data.error ? (
        <p className="mt-6 text-kb-red" role="alert">
          Couldn't load your listing. Refresh the page.
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
      ) : loc && !data.isLoading && !data.error && !data.data?.base ? (
        <p className="mt-6 text-kb-stone">
          Kabsi takes a first snapshot of your listing within a few minutes of going active.
        </p>
      ) : null}
      <div className="mt-7 space-y-4">
        {open.map((c) => (
          <OpenChange key={c.id} change={c} onDone={refresh} />
        ))}
      </div>
      {data.data?.base ? (
        <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-kb-green" aria-hidden="true" />
            <h2 className="font-bold">
              {open.length ? "Your saved version" : "Watching. No changes waiting."}
            </h2>
          </div>
          <dl className="mt-4 divide-y divide-kb-hairline">
            {Object.entries(LABEL).map(([k, label]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-kb-stone">{label}</dt>
                <dd dir="auto" className="min-w-0 break-words text-right font-medium">
                  {data.data!.base!.fields[k]?.display || "-"}
                </dd>
              </div>
            ))}
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
                  {LABEL[c.field] ?? c.field} · {STATE[c.state] ?? c.state}
                </p>
                <p className="text-kb-stone">
                  {fmtDate(c.created_at)} ·{" "}
                  {c.new_value
                    ? `Google showed “${c.new_value.display || "(empty)"}”`
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
  async function decide(decision: "revert" | "keep") {
    setBusy(decision);
    setErr("");
    try {
      await contentCall({ do: "shield_decide", change_id: change.id, decision });
      track(decision === "revert" ? "shield_reverted" : "shield_kept", { channel: "dashboard" });
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong. Nothing changed.");
    }
    setBusy("");
  }
  return (
    <article className="rounded-large border-2 border-kb-black bg-kb-white p-6">
      <p className="font-bold">{LABEL[change.field] ?? change.field} changed on Google</p>
      <p className="mt-1 text-sm text-kb-stone">{fmtDateTime(change.created_at)}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold uppercase text-kb-stone">Before</p>
          <p dir="auto" className="mt-1">
            {change.old_value?.display || "(empty)"}
          </p>
        </div>
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold uppercase text-kb-stone">Now</p>
          <p dir="auto" className="mt-1">
            {change.new_value?.display || "(empty)"}
          </p>
        </div>
      </div>
      {err ? (
        <p className="mt-3 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="w-full sm:w-auto" disabled={!!busy} onClick={() => setConfirm(true)}>
          {busy === "revert" ? "Saving…" : "Keep my information"}
        </Button>
        <Button variant="ghost" disabled={!!busy} onClick={() => void decide("keep")}>
          {busy === "keep" ? "Saving…" : "Keep the new one"}
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Keep your {(LABEL[change.field] ?? change.field).toLowerCase()} on Google?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Google will show: {change.old_value?.display || "your saved version"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => void decide("revert")}>
              Keep my information
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

// Staff only, simulated locations only: pretend someone edited the listing on Google.
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
          {Object.entries(LABEL).map(([k, l]) => (
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

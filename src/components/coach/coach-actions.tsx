import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { CopyButton } from "@/components/shared/copy-button";
import { coachCall, FIELD_LABEL, VERDICT_LABEL, type Verdict } from "@/lib/coach";

// The Profile Coach's actions (P0.8-09 part B, Pro). Each one shows exactly what will change, and a change goes to Google only
// after "Confirm and save to Google": the owner's approval, sent after a 10 second undo window. Nothing here guesses a business
// name, and nothing here is sent without being read first.
const SENT =
  "Approved. Kabsi sends it to Google in a few seconds and checks that it shows. You can undo it until then.";

function Panel({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-large bg-kb-white p-6 shadow-kb">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-kb-stone">{intro}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const say = (x: unknown) =>
  x instanceof Error ? x.message : "That did not work. Please try again.";

export function CoachActions({
  locationId,
  onChanged,
}: {
  locationId: string;
  onChanged: () => unknown;
}) {
  return (
    <div data-testid="coach-actions">
      <h2 className="mt-10 font-display text-3xl leading-tight">Kabsi can do these for you</h2>
      <p className="mt-1 text-sm text-kb-stone">
        Each one shows what will change. You approve it, and nothing reaches Google before that.
      </p>
      <WebsiteTag locationId={locationId} onChanged={onChanged} />
      <Categories locationId={locationId} onChanged={onChanged} />
      <WebsiteCheck locationId={locationId} onChanged={onChanged} />
      <Snippet locationId={locationId} />
      <Description locationId={locationId} />
    </div>
  );
}

function WebsiteTag({ locationId, onChanged }: { locationId: string; onChanged: () => unknown }) {
  const qc = useQueryClient();
  const tag = useQuery({
    queryKey: ["coach-tag", locationId],
    queryFn: () =>
      coachCall<{ website: string | null; tagged: string | null; reason: string | null }>(
        locationId,
        "website_tag",
      ),
    retry: false,
  });
  const [msg, setMsg] = useState("");
  const apply = useMutation({
    mutationFn: () => coachCall(locationId, "website_tag_apply"),
    onSuccess: async () => {
      setMsg(SENT);
      await qc.invalidateQueries({ queryKey: ["coach-tag", locationId] });
      await onChanged();
    },
    onError: (x) => setMsg(say(x)),
  });
  const t = tag.data;
  return (
    <Panel
      title="See the visits Google sends to your website"
      intro="A small tag on your website link shows how many visits come from your Google profile."
    >
      {tag.isLoading ? <p className="text-sm text-kb-stone">Loading…</p> : null}
      {t && !t.website ? (
        <p className="text-sm text-kb-stone">Add a website to your profile first.</p>
      ) : null}
      {t?.website && !t.tagged ? (
        <p className="text-sm text-kb-stone">
          Your website link already has a tag, or Kabsi cannot add one to it.
        </p>
      ) : null}
      {t?.website && t.tagged ? (
        <>
          <p className="text-sm font-bold">Now</p>
          <p className="break-all text-sm">{t.website}</p>
          <p className="mt-3 text-sm font-bold">With the tag</p>
          <p className="break-all text-sm">{t.tagged}</p>
          <Button className="mt-4" disabled={apply.isPending} onClick={() => apply.mutate()}>
            Confirm and save to Google
          </Button>
        </>
      ) : null}
      {msg ? (
        <p className="mt-3 text-sm" role="status">
          {msg}
        </p>
      ) : null}
    </Panel>
  );
}

type Suggested = {
  primary: string;
  additional: string[];
  suggestions: { name: string; displayName: string }[];
};

function Categories({ locationId, onChanged }: { locationId: string; onChanged: () => unknown }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["coach-categories", locationId],
    queryFn: () => coachCall<Suggested>(locationId, "categories"),
    retry: false,
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState("");
  const apply = useMutation({
    mutationFn: () => coachCall(locationId, "categories_apply", { add: picked }),
    onSuccess: async () => {
      setMsg(SENT);
      setConfirming(false);
      setPicked([]);
      await qc.invalidateQueries({ queryKey: ["coach-categories", locationId] });
      await onChanged();
    },
    onError: (x) => {
      setMsg(say(x));
      setConfirming(false);
    },
  });
  const toggle = (n: string) => {
    setMsg("");
    setConfirming(false);
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 3 ? [...p, n] : p));
  };
  const s = q.data;
  return (
    <Panel
      title="Add more categories"
      intro="Extra categories help Google show you for more of what you do. Your main category stays as it is. Only the owner, signed in, can change categories, and Google asks for a week between changes."
    >
      {q.isLoading ? <p className="text-sm text-kb-stone">Loading…</p> : null}
      {s && !s.suggestions.length ? (
        <p className="text-sm text-kb-stone">
          Kabsi has no extra category to suggest for {s.primary || "your business"} right now.
        </p>
      ) : null}
      {s?.suggestions.length ? (
        <>
          <p className="text-sm text-kb-stone">Main category: {s.primary}</p>
          <ul className="mt-3 space-y-2" aria-label="Suggested categories">
            {s.suggestions.map((c) => (
              <li key={c.name}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-card border-2 border-kb-hairline px-4">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={picked.includes(c.displayName)}
                    onChange={() => toggle(c.displayName)}
                  />
                  <span className="font-medium">{c.displayName}</span>
                </label>
              </li>
            ))}
          </ul>
          {confirming ? (
            <div className="mt-4 rounded-card bg-kb-sand p-4">
              <p className="text-sm font-bold">Google will show these extra categories:</p>
              <p className="mt-1 text-sm">{[...s.additional, ...picked].join(", ")}</p>
              <Button className="mt-3" disabled={apply.isPending} onClick={() => apply.mutate()}>
                Confirm and save to Google
              </Button>
            </div>
          ) : (
            <Button
              className="mt-4"
              variant="outline"
              disabled={!picked.length}
              onClick={() => setConfirming(true)}
            >
              Review
            </Button>
          )}
        </>
      ) : null}
      {msg ? (
        <p className="mt-3 text-sm" role="status">
          {msg}
        </p>
      ) : null}
    </Panel>
  );
}

type CheckResult =
  | {
      state: "checked";
      pages: number;
      found: Record<"name" | "phone" | "address" | "hours", Verdict>;
    }
  | { state: "blocked"; reason: string }
  | { state: "unreachable" };

const BLOCKED: Record<string, string> = {
  robots: "Your website asks programs not to read it, so Kabsi did not.",
  not_a_link: "Your website link is not a web address Kabsi can read.",
};

function WebsiteCheck({ locationId, onChanged }: { locationId: string; onChanged: () => unknown }) {
  const run = useMutation({
    mutationFn: () => coachCall<CheckResult>(locationId, "website_check"),
    onSuccess: () => onChanged(),
  });
  const r = run.data;
  return (
    <Panel
      title="Check your website against your profile"
      intro="Kabsi reads your public website, up to three pages, and compares the name, phone number, address and opening times with your Google profile. It keeps the answer, never the page."
    >
      <Button variant="outline" disabled={run.isPending} onClick={() => run.mutate()}>
        {run.isPending ? "Checking" : "Check my website"}
      </Button>
      {run.isError ? (
        <p className="mt-3 text-sm" role="alert">
          {say(run.error)}
        </p>
      ) : null}
      {r?.state === "checked" ? (
        <ul className="mt-4 space-y-2" aria-label="What the website says">
          {(Object.keys(FIELD_LABEL) as (keyof typeof FIELD_LABEL)[]).map((f) => (
            <li
              key={f}
              className="flex items-center justify-between gap-3 rounded-card border-2 border-kb-hairline p-3"
            >
              <span className="font-medium">{FIELD_LABEL[f]}</span>
              <StatusPill
                tone={
                  r.found[f] === "match" ? "green" : r.found[f] === "mismatch" ? "amber" : "grey"
                }
              >
                {VERDICT_LABEL[r.found[f]]}
              </StatusPill>
            </li>
          ))}
        </ul>
      ) : null}
      {r?.state === "blocked" ? (
        <p className="mt-3 text-sm" role="status">
          {BLOCKED[r.reason] ?? "Kabsi could not safely read that website."}
        </p>
      ) : null}
      {r?.state === "unreachable" ? (
        <p className="mt-3 text-sm" role="status">
          Your website did not answer. Try again later.
        </p>
      ) : null}
    </Panel>
  );
}

function Snippet({ locationId }: { locationId: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["coach-snippet", locationId],
    queryFn: () => coachCall<{ snippet: string }>(locationId, "snippet"),
    enabled: open,
    retry: false,
  });
  return (
    <Panel
      title="A snippet for your website"
      intro="Search engines read this to understand your business. Paste it into your website. It is built from your approved profile and sent nowhere."
    >
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          Show the snippet
        </Button>
      ) : null}
      {q.data ? (
        <>
          <pre
            className="max-h-72 overflow-auto rounded-card bg-kb-sand p-4 text-xs leading-5"
            data-testid="snippet"
          >
            {q.data.snippet}
          </pre>
          <div className="mt-3">
            <CopyButton text={q.data.snippet} label="Copy the snippet" />
          </div>
        </>
      ) : null}
      {q.isError ? (
        <p className="mt-3 text-sm" role="alert">
          {say(q.error)}
        </p>
      ) : null}
    </Panel>
  );
}

type DescriptionAnswer = {
  state: "ai_off" | "no_facts" | "draft" | "rejected";
  text?: string;
  problems?: string[];
};

function Description({ locationId }: { locationId: string }) {
  const q = useQuery({
    queryKey: ["coach-description", locationId],
    queryFn: () => coachCall<DescriptionAnswer>(locationId, "description"),
    retry: false,
  });
  const a = q.data;
  return (
    <Panel
      title="Your profile description"
      intro="Kabsi writes a draft of up to 750 characters from the facts you confirmed, with no links, offers or contact details. You read it and approve it."
    >
      {a?.state === "ai_off" ? (
        <p className="text-sm text-kb-stone">
          Kabsi writes this draft once its AI credit is switched on. Nothing has been written for
          you yet.
        </p>
      ) : null}
      {a?.state === "no_facts" ? (
        <p className="text-sm text-kb-stone">
          Tell Kabsi what you offer on About your business first.
        </p>
      ) : null}
      {a?.state === "rejected" ? (
        <p className="text-sm text-kb-stone">
          Kabsi's draft did not meet Google's rules, so it was not shown.
        </p>
      ) : null}
      {a?.state === "draft" && a.text ? (
        <p className="whitespace-pre-wrap text-sm">{a.text}</p>
      ) : null}
      {q.isError ? (
        <p className="text-sm" role="alert">
          {say(q.error)}
        </p>
      ) : null}
    </Panel>
  );
}

// "About your business" (P0.3-01, K-10, K-11, K-120): Business Knowledge, one fact at a time. Drafts use only the
// facts marked Verified; anything else (Needs your OK, Out of date, a question with two answers) is left out of
// every reply and post until the owner says which is right. Every change is a membership-checked RPC (src/lib/
// knowledge.ts): a change is a new version, Confirm re-dates a fact, Delete removes the fact and every version.
// Onboarding shows only the basics, saved the same way.
import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAutosize } from "@/lib/use-autosize";
import {
  BookOpenCheck,
  CircleHelp,
  Info,
  MapPinned,
  MessageSquareQuote,
  PhoneCall,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/ui/status-pill";
import { Banner } from "@/components/ui/banner";
import { friendlyError, type Location } from "@/lib/onboarding";
import {
  answerQuestion,
  confirmFact,
  factState,
  factText,
  fieldOf,
  loadKnowledge,
  rejectFact,
  removeFact,
  saveFact,
  sourceLabel,
  verifiedValues,
  type ConfirmQuestion,
  type Fact,
  type FactValue,
  type FactState,
  type Field,
  type ListField,
  type TextField,
} from "@/lib/knowledge";
import { cn } from "@/lib/utils";

type FieldDef = {
  key: TextField;
  label: string;
  hint?: string;
  placeholder: string;
  max: number;
  long?: boolean;
  required?: boolean;
  type?: string;
};
type ListDef = { key: ListField; label: string; hint: string; placeholder: string; max: number };
type Group = {
  id: string;
  title: string;
  sub: string;
  icon: ReactNode;
  fields: FieldDef[];
  lists?: ListDef[];
};

const GROUPS: Group[] = [
  {
    id: "voice",
    title: "Your voice",
    sub: "How replies sound and how they're signed.",
    icon: <MessageSquareQuote />,
    fields: [
      {
        key: "signature",
        label: "How you sign replies",
        placeholder: "e.g. Luca, Trattoria Verde",
        max: 80,
        required: true,
      },
      {
        key: "signature_ar",
        label: "Sign-off for replies in Arabic",
        hint: "Used only when a review is in Arabic.",
        placeholder: "مثلاً: فريق مخبز الزيتونة",
        max: 80,
      },
      {
        key: "tone_notes",
        label: "Anything about your voice",
        placeholder:
          "e.g. We're a family place, keep it friendly. We say 'see you soon', not 'goodbye'.",
        max: 200,
        long: true,
      },
    ],
  },
  {
    id: "offer",
    title: "What you offer",
    sub: "Used when a customer mentions a product or service.",
    icon: <ShoppingBag />,
    fields: [
      {
        key: "about",
        label: "Your business in a sentence or two",
        placeholder:
          "e.g. A neighbourhood bakery baking bread and pastries every morning since 2015.",
        max: 400,
        long: true,
      },
      {
        key: "services",
        label: "Main products or services",
        placeholder: "e.g. Sourdough, croissants, birthday cakes to order, coffee",
        max: 600,
        long: true,
      },
      {
        key: "price_notes",
        label: "Price notes",
        hint: "Only what you'd say to a customer. Kabsi asks you again every 90 days.",
        placeholder: "e.g. Cakes to order start at $35.",
        max: 300,
      },
    ],
  },
  {
    id: "visit",
    title: "Visiting you",
    sub: "Answers to the practical questions reviews often raise.",
    icon: <MapPinned />,
    fields: [
      {
        key: "hours_note",
        label: "Opening hours details",
        hint: "Kabsi asks you again every 60 days.",
        placeholder: "e.g. Kitchen closes at 10pm. Closed on public holidays.",
        max: 200,
      },
      {
        key: "parking",
        label: "Parking",
        placeholder: "e.g. Free parking behind the shop",
        max: 200,
      },
      {
        key: "accessibility",
        label: "Accessibility",
        placeholder: "e.g. Step-free entrance and an accessible toilet",
        max: 200,
      },
      { key: "wifi", label: "Wi-Fi", placeholder: "e.g. Free Wi-Fi for customers", max: 100 },
      {
        key: "languages",
        label: "Languages your team speaks",
        placeholder: "e.g. English, Spanish, Arabic",
        max: 120,
      },
    ],
  },
  {
    id: "order",
    title: "Ordering and booking",
    sub: "How customers book, order and pay.",
    icon: <BookOpenCheck />,
    fields: [
      {
        key: "booking",
        label: "How to book or order",
        placeholder: "e.g. Book by phone or on our website. Walk-ins welcome.",
        max: 200,
      },
      {
        key: "payment_methods",
        label: "Payment methods",
        placeholder: "e.g. Cash and all major cards",
        max: 200,
      },
      {
        key: "delivery",
        label: "Delivery or takeaway",
        placeholder: "e.g. We deliver within 3 miles, 11am to 9pm",
        max: 200,
      },
      {
        key: "service_area",
        label: "Area you serve",
        placeholder: "e.g. Downtown and the east side",
        max: 200,
      },
      {
        key: "policies",
        label: "Policies",
        hint: "Returns, cancellations, pets, children. A policy is never offered as compensation.",
        placeholder:
          "e.g. Bookings can be cancelled up to 24 hours before. Dogs welcome on the terrace.",
        max: 400,
        long: true,
      },
    ],
  },
  {
    id: "care",
    title: "Unhappy customers and your team",
    sub: "Replies ask unhappy customers to contact you through the details on your Google profile.",
    icon: <PhoneCall />,
    fields: [
      {
        key: "contact_phone",
        label: "Business phone",
        hint: "Kabsi never writes a phone number in a public reply. Google can reject replies that do.",
        placeholder: "e.g. +1 (555) 010-0100",
        max: 30,
        type: "tel",
      },
    ],
    lists: [
      {
        key: "staff_names",
        label: "Staff names that may appear in replies",
        hint: "Kabsi only uses a name when the customer mentions that person, and asks you again every 180 days.",
        placeholder: "e.g. Maria",
        max: 80,
      },
    ],
  },
  {
    id: "rules",
    title: "Mention and never mention",
    sub: "Kabsi follows these in every reply and post, and its safety check enforces them.",
    icon: <Info />,
    fields: [
      {
        key: "mention",
        label: "Things you'd like mentioned when relevant",
        placeholder: "e.g. Our new terrace is open. Gluten-free bread every Friday.",
        max: 600,
        long: true,
      },
      {
        key: "avoid",
        label: "Anything Kabsi should never say or promise",
        placeholder: "e.g. Don't promise same-day delivery. Don't mention the old location.",
        max: 400,
        long: true,
      },
    ],
  },
];
const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);
const ONBOARDING_KEYS: TextField[] = [
  "signature",
  "contact_phone",
  "hours_note",
  "mention",
  "avoid",
];
const TONES = [
  ["warm", "Warm"],
  ["formal", "Formal"],
  ["short", "Short & friendly"],
] as const;

const STATE_LABEL: Record<FactState, { label: string; tone: "green" | "amber" | "grey" }> = {
  verified: { label: "Verified", tone: "green" },
  needs_ok: { label: "Needs your OK", tone: "amber" },
  out_of_date: { label: "Out of date", tone: "grey" },
};

const labelOf = (field: Field) =>
  ALL_FIELDS.find((f) => f.key === field)?.label ??
  (field === "staff_names"
    ? "Staff name"
    : field === "faqs"
      ? "Question customers ask"
      : field === "tone"
        ? "Tone"
        : "Rule");

function useKnowledge(locationId: string) {
  return useQuery({
    queryKey: ["knowledge", locationId],
    queryFn: () => loadKnowledge(locationId),
  });
}

export function KnowledgeForm({
  location,
  mode,
  onSaved,
  submitLabel,
}: {
  location: Location;
  mode: "onboarding" | "settings";
  onSaved: () => Promise<unknown> | void;
  submitLabel?: string;
}) {
  return mode === "onboarding" ? (
    <BasicsForm location={location} onSaved={onSaved} submitLabel={submitLabel} />
  ) : (
    <FactsScreen location={location} />
  );
}

// ── Onboarding: the basics, each saved as a verified fact ──────────────────────────────────────────────────────

function BasicsForm({
  location,
  onSaved,
  submitLabel,
}: {
  location: Location;
  onSaved: () => Promise<unknown> | void;
  submitLabel?: string | undefined;
}) {
  const knowledge = useKnowledge(location.id);
  if (knowledge.isLoading) return <p className="text-kb-stone">Loading…</p>;
  if (knowledge.error) {
    return (
      <p className="text-kb-red" role="alert">
        Couldn't load your facts. Refresh the page.
      </p>
    );
  }
  return (
    <BasicsFields
      location={location}
      current={verifiedValues(knowledge.data?.facts ?? [])}
      onSaved={onSaved}
      submitLabel={submitLabel}
    />
  );
}

function BasicsFields({
  location,
  current,
  onSaved,
  submitLabel,
}: {
  location: Location;
  current: Partial<Record<Field, unknown>>;
  onSaved: () => Promise<unknown> | void;
  submitLabel?: string | undefined;
}) {
  const fields = ALL_FIELDS.filter((f) => ONBOARDING_KEYS.includes(f.key));
  const [text, setText] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        typeof current[f.key] === "string" ? (current[f.key] as string) : "",
      ]),
    ),
  );
  const [tone, setTone] = useState<string>(
    typeof current.tone === "string" ? current.tone : "warm",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Only what changed: an unchanged value is not a new version.
      for (const f of fields) {
        const v = (text[f.key] ?? "").trim();
        if (v && v !== current[f.key]) await saveFact(location.id, f.key, v);
      }
      if (tone !== current.tone) await saveFact(location.id, "tone", tone);
      await queryClient.invalidateQueries({ queryKey: ["knowledge", location.id] });
      await onSaved();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <section aria-labelledby="kg-basics">
        <h2 id="kg-basics" className="text-lg font-bold leading-tight">
          The basics
        </h2>
        <p className="mt-0.5 text-sm leading-6 text-kb-stone">
          You can add much more later under Settings, About your business.
        </p>
        <div className="mt-5 space-y-5">
          {fields.map((f) => (
            <TextInput
              key={f.key}
              id={`kf-${f.key}`}
              f={f}
              value={text[f.key] ?? ""}
              onChange={(v) => setText((t) => ({ ...t, [f.key]: v }))}
              withLabel
            />
          ))}
          <ToneChoice value={tone} onChange={setTone} />
        </div>
      </section>
      {error ? (
        <p className="text-sm text-kb-red" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Saving…" : (submitLabel ?? "Save")}
      </Button>
    </form>
  );
}

// ── Settings: every fact with its status ───────────────────────────────────────────────────────────────────────

function FactsScreen({ location }: { location: Location }) {
  const knowledge = useKnowledge(location.id);
  const queryClient = useQueryClient();
  // One editor open at a time, so the screen keeps one yellow button (K-108).
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (knowledge.isLoading) return <p className="text-kb-stone">Loading…</p>;
  if (knowledge.error || !knowledge.data) {
    return (
      <p className="text-kb-red" role="alert">
        Couldn't load your facts. Refresh the page.
      </p>
    );
  }
  const { facts, questions } = knowledge.data;
  const counts = { verified: 0, needs_ok: 0, out_of_date: 0 };
  for (const f of facts) {
    const s = factState(f);
    if (s) counts[s]++;
  }

  async function run(action: () => Promise<unknown>, done: string) {
    setError("");
    setNotice("");
    try {
      await action();
      setEditing(null);
      setNotice(done);
      await queryClient.invalidateQueries({ queryKey: ["knowledge", location.id] });
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  const ctx: RowContext = { location, editing, setEditing, run };
  const tone = facts.find((f) => fieldOf(f.slot) === "tone");

  return (
    <div className="space-y-5">
      <div className="rounded-large bg-kb-carbon p-5 text-kb-white sm:p-6">
        <p className="text-sm font-bold uppercase tracking-wider text-kb-stone-on-dark">
          How Kabsi uses this
        </p>
        <p className="mt-2 leading-7">
          Replies and posts use only the facts marked Verified, and only when a customer raises the
          topic. Anything else is left out, never made up.
        </p>
        <p className="mt-3 text-sm text-kb-stone-on-dark">
          {counts.verified} verified
          {counts.needs_ok ? `, ${counts.needs_ok} need your OK` : ""}
          {counts.out_of_date ? `, ${counts.out_of_date} out of date` : ""}
        </p>
      </div>

      {questions.map((q) => (
        <Question key={q.id} q={q} facts={facts} run={run} />
      ))}

      {GROUPS.map((g) => (
        <section
          key={g.id}
          className="rounded-large bg-kb-white p-5 shadow-kb sm:p-7"
          aria-labelledby={`kg-${g.id}`}
        >
          <GroupHeader id={`kg-${g.id}`} icon={g.icon} title={g.title} sub={g.sub} />
          <div className="mt-5 space-y-5">
            {g.id === "voice" ? (
              <ToneChoice
                value={typeof tone?.value?.text === "string" ? tone.value.text : "warm"}
                onChange={(t) => run(() => saveFact(location.id, "tone", t), "Tone saved.")}
                state={tone ? factState(tone) : null}
              />
            ) : null}
            {g.fields.map((f) => (
              <SingleFact
                key={f.key}
                def={f}
                fact={facts.find((x) => fieldOf(x.slot) === f.key)}
                ctx={ctx}
              />
            ))}
            {(g.lists ?? []).map((l) => (
              <ListFacts
                key={l.key}
                def={l}
                facts={facts.filter((x) => fieldOf(x.slot) === l.key)}
                ctx={ctx}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-large bg-kb-white p-5 shadow-kb sm:p-7" aria-labelledby="kg-faq">
        <GroupHeader
          id="kg-faq"
          icon={<CircleHelp />}
          title="Questions customers ask"
          sub="Replies and posts can use these answers, and nothing beyond them. Up to 8."
        />
        <div className="mt-5">
          <ListFacts
            def={{ key: "faqs", label: "", hint: "", placeholder: "", max: 400 }}
            facts={facts.filter((x) => fieldOf(x.slot) === "faqs")}
            ctx={ctx}
          />
        </div>
      </section>

      <div aria-live="polite">
        {error ? (
          <Banner tone="problem">{error}</Banner>
        ) : notice ? (
          <Banner tone="success">{notice}</Banner>
        ) : null}
      </div>
    </div>
  );
}

type RowContext = {
  location: Location;
  editing: string | null;
  setEditing: (id: string | null) => void;
  run: (action: () => Promise<unknown>, done: string) => Promise<void>;
};

function GroupHeader({
  id,
  icon,
  title,
  sub,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-5"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-lg font-bold leading-tight">
          {title}
        </h2>
        <p className="mt-0.5 text-sm leading-6 text-kb-stone">{sub}</p>
      </div>
    </div>
  );
}

function Question({
  q,
  facts,
  run,
}: {
  q: ConfirmQuestion;
  facts: Fact[];
  run: RowContext["run"];
}) {
  const current = facts.find((f) => f.slot === q.slot);
  return (
    <section
      className="rounded-large border border-kb-yellow bg-kb-white p-5 shadow-kb ring-2 ring-kb-yellow sm:p-7"
      aria-label="A question about your facts"
    >
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">
        {labelOf(fieldOf(q.slot))}
      </p>
      <h2 className="mt-1 text-lg font-bold leading-tight">
        Kabsi found two different answers. Which is right?
      </h2>
      <p className="mt-1 text-sm text-kb-stone">
        Replies and posts leave this out until you choose.
      </p>
      <div className="mt-4 space-y-3">
        {current ? (
          <Answer
            from={sourceLabel(current.source)}
            text={factText(current.value)}
            onPick={() => run(() => answerQuestion(q.id, "current"), "Saved. Kabsi uses this one.")}
          />
        ) : null}
        <Answer
          from={sourceLabel(q.proposed_source)}
          text={factText(q.proposed_value)}
          onPick={() => run(() => answerQuestion(q.id, "proposed"), "Saved. Kabsi uses this one.")}
        />
      </div>
    </section>
  );
}

function Answer({ from, text, onPick }: { from: string; text: string; onPick: () => void }) {
  return (
    <div className="rounded-card border border-kb-hairline p-4">
      <p className="text-sm text-kb-stone">From {from.toLowerCase()}</p>
      <p className="mt-1 whitespace-pre-line break-words" dir="auto">
        {text}
      </p>
      <Button variant="secondary" size="compact" className="mt-3" onClick={onPick}>
        This one is right
      </Button>
    </div>
  );
}

function ToneChoice({
  value,
  onChange,
  state,
}: {
  value: string;
  onChange: (t: string) => void;
  state?: FactState | null;
}) {
  return (
    <fieldset>
      <legend className="flex items-center gap-2 text-sm font-bold">
        Tone{" "}
        {state ? (
          <StatusPill tone={STATE_LABEL[state].tone}>{STATE_LABEL[state].label}</StatusPill>
        ) : null}
      </legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {TONES.map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={value === t}
            className={cn(
              "min-h-11 rounded-card border-2 px-2 text-sm font-bold",
              value === t ? "border-kb-black bg-kb-sand" : "border-kb-hairline",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SingleFact({
  def,
  fact,
  ctx,
}: {
  def: FieldDef;
  fact: Fact | undefined;
  ctx: RowContext;
}) {
  const editId = fact?.id ?? `new:${def.key}`;
  return (
    <div>
      <p className="font-bold">
        {def.label}{" "}
        {def.required ? null : <span className="font-normal text-kb-stone">(optional)</span>}
      </p>
      {def.hint ? <p className="mt-0.5 text-sm text-kb-stone">{def.hint}</p> : null}
      {ctx.editing === editId ? (
        <Editor
          def={def}
          initial={fact ? factText(fact.value) : ""}
          onCancel={() => ctx.setEditing(null)}
          onSave={(v) =>
            ctx.run(() => saveFact(ctx.location.id, def.key, v, fact?.id), "Saved as verified.")
          }
        />
      ) : fact ? (
        <FactLine fact={fact} ctx={ctx} onEdit={() => ctx.setEditing(editId)} />
      ) : (
        <Button
          variant="tertiary"
          className="mt-2 min-h-11 text-sm"
          onClick={() => ctx.setEditing(editId)}
        >
          <Plus aria-hidden="true" /> Add
        </Button>
      )}
    </div>
  );
}

function ListFacts({ def, facts, ctx }: { def: ListDef; facts: Fact[]; ctx: RowContext }) {
  const isFaq = def.key === "faqs";
  const cap = def.key === "staff_names" ? 20 : isFaq ? 8 : 10;
  const newId = `new:${def.key}`;
  return (
    <div>
      {def.label ? <p className="font-bold">{def.label}</p> : null}
      {def.hint ? <p className="mt-0.5 text-sm text-kb-stone">{def.hint}</p> : null}
      <div className="mt-2 space-y-3">
        {facts.map((f) =>
          ctx.editing === f.id ? (
            <ListEditor
              key={f.id}
              def={def}
              initial={f.value}
              onCancel={() => ctx.setEditing(null)}
              onSave={(v) =>
                ctx.run(() => saveFact(ctx.location.id, def.key, v, f.id), "Saved as verified.")
              }
            />
          ) : (
            <FactLine key={f.id} fact={f} ctx={ctx} onEdit={() => ctx.setEditing(f.id)} />
          ),
        )}
        {ctx.editing === newId ? (
          <ListEditor
            def={def}
            initial={null}
            onCancel={() => ctx.setEditing(null)}
            onSave={(v) =>
              ctx.run(() => saveFact(ctx.location.id, def.key, v), "Saved as verified.")
            }
          />
        ) : facts.length < cap ? (
          <Button
            variant="tertiary"
            className="min-h-11 text-sm"
            onClick={() => ctx.setEditing(newId)}
          >
            <Plus aria-hidden="true" /> {isFaq ? "Add a question" : "Add a name"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// One fact: its text, its status and what the owner can do with it.
function FactLine({ fact, ctx, onEdit }: { fact: Fact; ctx: RowContext; onEdit: () => void }) {
  const [asking, setAsking] = useState(false);
  const state = factState(fact);
  if (!state) return null;
  const s = STATE_LABEL[state];
  return (
    <div className="mt-2 rounded-card border border-kb-hairline p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 whitespace-pre-line break-words" dir="auto">
          {factText(fact.value)}
        </p>
        <StatusPill tone={s.tone}>{s.label}</StatusPill>
      </div>
      {state !== "verified" ? (
        <p className="mt-1 text-sm text-kb-stone">
          {state === "needs_ok"
            ? `From ${sourceLabel(fact.source).toLowerCase()}. Replies and posts leave it out until you confirm it.`
            : "Kabsi asks you to check this again. Replies and posts leave it out until you confirm it."}
        </p>
      ) : null}
      {asking ? (
        <div className="mt-3 rounded-card bg-kb-sand p-3">
          <p className="text-sm">
            Delete this for good? Kabsi removes it and every earlier version, and stops using it.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="compact"
              onClick={() => ctx.run(() => removeFact(fact.id), "Deleted.")}
            >
              Delete
            </Button>
            <Button variant="ghost" size="compact" onClick={() => setAsking(false)}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {state !== "verified" ? (
            <Button
              variant="secondary"
              size="compact"
              onClick={() => ctx.run(() => confirmFact(fact.id), "Confirmed.")}
            >
              Confirm
            </Button>
          ) : null}
          {state === "needs_ok" ? (
            <Button
              variant="ghost"
              size="compact"
              onClick={() => ctx.run(() => rejectFact(fact.id), "Kabsi won't use it.")}
            >
              Not right
            </Button>
          ) : null}
          <Button variant="ghost" size="compact" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="compact" onClick={() => setAsking(true)}>
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

function Editor({
  def,
  initial,
  onSave,
  onCancel,
}: {
  def: FieldDef;
  initial: string;
  onSave: (v: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim()) return;
        setBusy(true);
        await onSave(value.trim());
        setBusy(false);
      }}
    >
      <TextInput id={`kf-${def.key}`} f={def} value={value} onChange={setValue} />
      <EditorButtons busy={busy} onCancel={onCancel} />
    </form>
  );
}

function ListEditor({
  def,
  initial,
  onSave,
  onCancel,
}: {
  def: ListDef;
  initial: FactValue | null;
  onSave: (v: string | { q: string; a: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const item = initial?.item ?? {};
  const [name, setName] = useState(initial?.name ?? "");
  const [q, setQ] = useState(item.q ?? "");
  const [a, setA] = useState(item.a ?? "");
  const [busy, setBusy] = useState(false);
  const isFaq = def.key === "faqs";
  return (
    <form
      className="rounded-card border border-kb-hairline p-3 sm:p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = isFaq ? { q: q.trim(), a: a.trim() } : name.trim();
        if (isFaq ? !q.trim() || !a.trim() : !name.trim()) return;
        setBusy(true);
        await onSave(v);
        setBusy(false);
      }}
    >
      {isFaq ? (
        <>
          <Input
            aria-label="Question"
            dir="auto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Do you have vegan options?"
            maxLength={160}
            className="h-12 rounded-card px-4 text-base"
          />
          <Textarea
            aria-label="Answer"
            dir="auto"
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="e.g. Yes, three vegan dishes every day."
            className="mt-2 min-h-16 rounded-card px-4 py-3 text-base md:text-base"
            maxLength={400}
          />
        </>
      ) : (
        <Input
          aria-label={def.label}
          dir="auto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={def.placeholder}
          maxLength={def.max}
          className="h-12 rounded-card px-4 text-base"
        />
      )}
      <EditorButtons busy={busy} onCancel={onCancel} />
    </form>
  );
}

function EditorButtons({ busy, onCancel }: { busy: boolean; onCancel: () => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="submit" size="compact" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="compact" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function TextInput({
  id,
  f,
  value,
  onChange,
  withLabel,
}: {
  id: string;
  f: FieldDef;
  value: string;
  onChange: (v: string) => void;
  withLabel?: boolean;
}) {
  const areaRef = useAutosize(value, 320);
  return (
    <div>
      {withLabel ? (
        <>
          <Label htmlFor={id} className="font-bold">
            {f.label}{" "}
            {f.required ? null : <span className="font-normal text-kb-stone">(optional)</span>}
          </Label>
          {f.hint ? <p className="mt-0.5 text-sm text-kb-stone">{f.hint}</p> : null}
        </>
      ) : null}
      {f.long ? (
        <Textarea
          id={id}
          ref={areaRef}
          aria-label={withLabel ? undefined : f.label}
          dir="auto"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={f.placeholder}
          maxLength={f.max}
          rows={2}
          className="mt-2 min-h-20 resize-none rounded-card px-4 py-3 text-base md:text-base"
        />
      ) : (
        <Input
          id={id}
          aria-label={withLabel ? undefined : f.label}
          dir="auto"
          type={f.type ?? "text"}
          required={f.required && withLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={f.placeholder}
          maxLength={f.max}
          className="mt-2 h-12 rounded-card px-4 text-base"
        />
      )}
      {value.length > f.max * 0.8 ? (
        <p className="mt-1 text-right text-xs text-kb-stone">
          {value.length} / {f.max}
        </p>
      ) : null}
    </div>
  );
}

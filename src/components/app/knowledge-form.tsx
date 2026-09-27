// "About your business" (D260): the only facts reply and post drafts may use. Grouped so an owner can fill
// it in a few minutes; every field is optional except the sign-off. Saved through the whitelisted
// update_knowledge_card RPC (unknown keys and over-long text are refused there too).
import { useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpenCheck,
  CircleHelp,
  Info,
  MapPinned,
  MessageSquareQuote,
  PhoneCall,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { friendlyError, saveKnowledge, type KnowledgeCard, type Location } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type TextKey =
  | "signature"
  | "signature_ar"
  | "tone_notes"
  | "about"
  | "services"
  | "price_notes"
  | "booking"
  | "payment_methods"
  | "hours_note"
  | "service_area"
  | "delivery"
  | "parking"
  | "accessibility"
  | "wifi"
  | "languages"
  | "policies"
  | "contact_phone"
  | "mention"
  | "avoid";

type Field = {
  key: TextKey;
  label: string;
  hint?: string;
  placeholder: string;
  max: number;
  long?: boolean;
  required?: boolean;
  type?: string;
};
type Group = { id: string; title: string; sub: string; icon: ReactNode; fields: Field[] };

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
        hint: "Only what you'd say to a customer. Kabsi never invents prices or offers.",
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
    title: "Unhappy customers",
    sub: "How hard reviews move to a private conversation.",
    icon: <PhoneCall />,
    fields: [
      {
        key: "contact_phone",
        label: "Phone to give unhappy customers",
        placeholder: "e.g. +1 (555) 010-0100",
        max: 30,
        type: "tel",
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

const ONBOARDING_KEYS: TextKey[] = ["signature", "contact_phone", "hours_note", "mention", "avoid"];
const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));
type Faq = { q: string; a: string };

const initialText = (card: KnowledgeCard) =>
  Object.fromEntries(
    ALL_KEYS.map((k) => {
      const v = card[k];
      if (k === "delivery" && v === true) return [k, "Yes, we deliver"];
      return [k, typeof v === "string" ? v : ""];
    }),
  ) as Record<TextKey, string>;

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
  const card = location.knowledge_card ?? {};
  const [text, setText] = useState(() => initialText(card));
  const [tone, setTone] = useState<"warm" | "formal" | "short">(card.tone ?? "warm");
  const [staff, setStaff] = useState((card.staff_names ?? []).join(", "));
  const [faqs, setFaqs] = useState<Faq[]>(() =>
    ((card["faqs"] as Faq[] | undefined) ?? []).filter((f) => f && (f.q || f.a)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (k: TextKey, v: string) => {
    setText((t) => ({ ...t, [k]: v }));
    setDirty(true);
    setSaved(false);
  };
  const filled = ALL_KEYS.filter((k) => text[k].trim()).length + (faqs.length ? 1 : 0);
  const total = ALL_KEYS.length + 1;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Only known keys: the RPC refuses anything else. Empty fields are left out.
      const next: KnowledgeCard = { tone };
      for (const k of ALL_KEYS) if (text[k].trim()) next[k] = text[k].trim();
      const names = staff
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      if (names.length) next.staff_names = names;
      const qa = faqs
        .map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
        .filter((f) => f.q && f.a)
        .slice(0, 8);
      if (qa.length) next["faqs"] = qa;
      await saveKnowledge(location.id, next);
      await onSaved();
      setSaved(true);
      setDirty(false);
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  const groups =
    mode === "onboarding"
      ? [
          {
            id: "basics",
            title: "The basics",
            sub: "You can add much more later under Settings, About your business.",
            icon: <MessageSquareQuote />,
            fields: GROUPS.flatMap((g) => g.fields).filter((f) => ONBOARDING_KEYS.includes(f.key)),
          },
        ]
      : GROUPS;

  return (
    <form onSubmit={save} className="space-y-5">
      {mode === "settings" ? (
        <div className="rounded-large bg-kb-carbon p-5 text-kb-white sm:p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-kb-stone-on-dark">
            How Kabsi uses this
          </p>
          <p className="mt-2 leading-7">
            Replies and posts use only these facts, and only when a customer raises the topic.
            Anything that isn't here is left out, never made up.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-pill bg-kb-white/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={filled}
              aria-label="Sections filled in"
            >
              <div
                className="h-full rounded-pill bg-kb-yellow transition-[width]"
                style={{ width: `${Math.round((filled / total) * 100)}%` }}
              />
            </div>
            <span className="text-sm text-kb-stone-on-dark">
              {filled} of {total} filled in
            </span>
          </div>
        </div>
      ) : null}

      {groups.map((g) => (
        <section
          key={g.id}
          className={cn(mode === "settings" && "rounded-large bg-kb-white p-5 shadow-kb sm:p-7")}
          aria-labelledby={`kg-${g.id}`}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-5"
            >
              {g.icon}
            </span>
            <div>
              <h2 id={`kg-${g.id}`} className="text-lg font-bold leading-tight">
                {g.title}
              </h2>
              <p className="mt-0.5 text-sm leading-6 text-kb-stone">{g.sub}</p>
            </div>
          </div>
          <div className="mt-5 space-y-5">
            {g.fields.map((f) => (
              <FieldRow key={f.key} f={f} value={text[f.key]} onChange={(v) => set(f.key, v)} />
            ))}
            {g.id === "voice" || g.id === "basics" ? (
              <fieldset>
                <legend className="text-sm font-bold">Tone</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["warm", "formal", "short"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTone(t);
                        setDirty(true);
                      }}
                      aria-pressed={tone === t}
                      className={cn(
                        "min-h-11 rounded-card border-2 px-2 text-sm font-bold",
                        tone === t ? "border-kb-black bg-kb-sand" : "border-kb-hairline",
                      )}
                    >
                      {t === "warm" ? "Warm" : t === "formal" ? "Formal" : "Short & friendly"}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
            {g.id === "care" ? (
              <div>
                <Label htmlFor="kf-staff" className="font-bold">
                  Staff names that may appear in replies
                </Label>
                <p className="mt-0.5 text-sm text-kb-stone">
                  Comma-separated. Kabsi only uses a name when the customer mentions that person.
                </p>
                <Input
                  id="kf-staff"
                  value={staff}
                  onChange={(e) => {
                    setStaff(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="e.g. Sam, Maria, Omar"
                  className="mt-2 h-12 rounded-card px-4 text-base"
                  maxLength={300}
                />
              </div>
            ) : null}
          </div>
        </section>
      ))}

      {mode === "settings" ? (
        <section
          className="rounded-large bg-kb-white p-5 shadow-kb sm:p-7"
          aria-labelledby="kg-faq"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-5"
            >
              <CircleHelp />
            </span>
            <div>
              <h2 id="kg-faq" className="text-lg font-bold leading-tight">
                Questions customers ask
              </h2>
              <p className="mt-0.5 text-sm leading-6 text-kb-stone">
                Replies and posts can use these answers, and nothing beyond them. Up to 8.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-card border border-kb-hairline p-3 sm:p-4">
                <Input
                  aria-label={`Question ${i + 1}`}
                  value={f.q}
                  onChange={(e) => {
                    setFaqs(faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)));
                    setDirty(true);
                  }}
                  placeholder="e.g. Do you have vegan options?"
                  maxLength={160}
                />
                <Textarea
                  aria-label={`Answer ${i + 1}`}
                  value={f.a}
                  onChange={(e) => {
                    setFaqs(faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)));
                    setDirty(true);
                  }}
                  placeholder="e.g. Yes, three vegan dishes every day."
                  className="mt-2 min-h-16"
                  maxLength={400}
                />
                <button
                  type="button"
                  className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-sm text-kb-stone hover:text-kb-black"
                  onClick={() => {
                    setFaqs(faqs.filter((_, j) => j !== i));
                    setDirty(true);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Remove
                </button>
              </div>
            ))}
            {faqs.length < 8 ? (
              <Button
                type="button"
                variant="outline"
                size="compact"
                onClick={() => setFaqs([...faqs, { q: "", a: "" }])}
              >
                <Plus /> Add a question
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="text-sm text-kb-red" role="alert">
          {error}
        </p>
      ) : null}
      <div
        className={cn(
          mode === "settings" &&
            "sticky bottom-20 z-10 rounded-large bg-kb-white/95 p-3 shadow-kb backdrop-blur md:bottom-4",
        )}
      >
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : (submitLabel ?? "Save")}
        </Button>
        {saved ? (
          <p className="mt-2 text-center text-sm text-kb-green" role="status">
            Saved. New drafts use this from now on.
          </p>
        ) : dirty && mode === "settings" ? (
          <p className="mt-2 text-center text-sm text-kb-stone">You have unsaved changes.</p>
        ) : null}
      </div>
    </form>
  );
}

function FieldRow({
  f,
  value,
  onChange,
}: {
  f: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `kf-${f.key}`;
  return (
    <div>
      <Label htmlFor={id} className="font-bold">
        {f.label}{" "}
        {f.required ? null : <span className="font-normal text-kb-stone">(optional)</span>}
      </Label>
      {f.hint ? <p className="mt-0.5 text-sm text-kb-stone">{f.hint}</p> : null}
      {f.long ? (
        <Textarea
          id={id}
          dir="auto"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={f.placeholder}
          maxLength={f.max}
          className="mt-2 min-h-20 rounded-card px-4 py-3 text-base"
        />
      ) : (
        <Input
          id={id}
          dir="auto"
          type={f.type ?? "text"}
          required={f.required}
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

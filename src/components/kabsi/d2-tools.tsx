// The free review link and QR code tool (/google-review-link), with the real search and Google's own review link.
import { Download, MapPin, Printer, QrCode as QrIcon, SearchX } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { CTA_TRIAL, FREE_TOOL_BUSY, FREE_TOOL_BUSY_CODES } from "@/lib/site";
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";
import { Turnstile } from "@/components/turnstile";
import { track } from "@/lib/telemetry";
import {
  CopyField,
  PageTop,
  QrCode,
  SearchForm,
  SearchingSteps,
  ToolTabs,
  downloadQrPng,
} from "./d2-parts";
import { ScanBox } from "./scan-box";
import { Banner, Button, ButtonLink, Card, EmptyState } from "./ui";

/* ---------- Shared pieces ---------- */

function NoneFound() {
  return (
    <EmptyState icon={SearchX} title="We could not find that business.">
      Check the name and city, or type the name exactly as it shows on Google.
    </EmptyState>
  );
}

function RankToo() {
  return (
    <section className="container-kb section-y" aria-labelledby="rank-too">
      <div className="mx-auto max-w-[40rem]">
        <h2 id="rank-too" className="text-h2">
          Want to see where you rank too?
        </h2>
        <ScanBox under="scan" className="mt-8" />
      </div>
    </section>
  );
}

/* ---------- Review link and QR code ---------- */

const RULES_TITLE = "Send it to every customer, the same way.";
const RULES_TEXT =
  "Do not offer anything in return, and do not ask only happy customers. Those are Google's rules.";

/** The card a business keeps by the till. Before a business is found it shows an empty code space, never a made-up code. */
export function CounterCard({
  business,
  link,
  cardRef,
}: {
  business: string;
  link: string | null;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={cardRef}
      className={cn(
        "relative mx-auto w-full max-w-[22rem] rounded-panel bg-kb-white p-6 text-center text-kb-ink shadow-lift transition-opacity duration-200 ease-kb sm:p-7",
      )}
    >
      <p className="font-display text-h3 font-bold">Scan to leave a review</p>
      <p className="mt-1 text-small text-kb-stone">It takes a minute.</p>
      <div className="mx-auto mt-5 w-full max-w-[14rem]">
        {link ? (
          <QrCode
            value={link}
            label={`QR code that opens the review box for ${business}`}
            className="ring-1 ring-kb-ink/10"
          />
        ) : (
          <div
            aria-hidden
            className="grid aspect-square w-full place-items-center rounded-card border-2 border-dashed border-kb-ink/15 text-kb-stone"
          >
            <QrIcon className="size-12" strokeWidth={1.25} />
          </div>
        )}
      </div>
      <p className="mt-5 font-display text-title font-bold">{business}</p>
    </div>
  );
}

const PRINT_SCRIPT =
  "<script>window.onload = function () { window.focus(); window.print(); };</" + "script>";

const esc = (t: string) =>
  t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

function printCounterCard(name: string, svg: string) {
  // The name comes from Google: escaped before it goes into the print page.
  const business = esc(name);
  const w = window.open("", "_blank", "width=640,height=860");
  if (!w) return;
  w.document
    .write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Counter card, ${business}</title>
<style>
  @page { size: A5; margin: 12mm }
  body { margin: 0; font-family: system-ui, sans-serif; color: #111; display: grid; place-items: center; min-height: 100vh }
  .card { text-align: center; width: 100%; max-width: 380px }
  h1 { font-size: 34px; margin: 0 0 6px }
  p { margin: 0; font-size: 18px; color: #5e5b55 }
  svg { width: 300px; height: 300px; margin: 28px 0 }
  strong { display: block; font-size: 26px; color: #111 }
</style></head><body><div class="card"><h1>Scan to leave a review</h1><p>It takes a minute.</p>${svg}<strong>${business}</strong></div>
${PRINT_SCRIPT}</body></html>`);
  w.document.close();
}

type Place = { place_id: string; name: string; address: string; review_url: string };
type Phase = "empty" | "searching" | "pick" | "result" | "none" | "busy";

/**
 * The free review link tool (D252): the visitor's own business, Google's own review link for it and a real QR code.
 * The search runs through the review-link Edge Function (the Places key stays on the server), behind Turnstile.
 */
export function ReviewLinkTool() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("empty");
  const [places, setPlaces] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const searching = phase === "searching";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) {
      setError("Type your business name and city.");
      return;
    }
    setError(null);
    setPhase("searching");
    const t = token;
    setToken("");
    setRound((n) => n + 1);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/review-link`, {
        method: "POST",
        headers: { "content-type": "application/json", ...anonHeaders },
        body: JSON.stringify({ query: query.trim(), turnstile: t }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        places?: Place[];
        message?: string;
        error?: string;
      };
      if (!res.ok && (FREE_TOOL_BUSY_CODES as readonly string[]).includes(j.error ?? "")) {
        setPhase("busy");
      } else if (!res.ok) {
        setError(j.message || "Search didn't work. Try again.");
        setPhase("empty");
      } else {
        const found = j.places ?? [];
        track("free_tool_used", { source: "review_link_search" });
        setPlaces(found);
        if (found.length === 1) choose(found[0]!);
        else setPhase(found.length ? "pick" : "none");
      }
    } catch {
      setError("Search didn't work. Try again.");
      setPhase("empty");
    }
  };
  const choose = (p: Place) => {
    setPlace(p);
    setPhase("result");
    track("review_link_created", { source: "review_link_tool" });
  };
  const print = () => {
    const svg = cardRef.current?.querySelector("svg")?.outerHTML;
    if (svg && place) printCounterCard(place.name, svg);
    track("free_tool_used", { source: "review_link_print" });
  };
  const file =
    (place?.name ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "business";

  return (
    <>
      <PageTop
        title="Get your Google review link and QR code."
        lead="One link that opens the review box on your Google profile. Free, no sign-up."
      >
        <div className="mt-8" />
      </PageTop>
      <section className="container-kb -mt-6">
        <ToolTabs current="/google-review-link" />
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            {phase === "busy" ? (
              <div className="rounded-panel border border-line bg-surface-1 p-6 sm:p-8">
                <h2 className="text-h3">Today's free checks are used up.</h2>
                <p className="mt-3 max-w-xl text-body text-text-2">{FREE_TOOL_BUSY}</p>
                <ButtonLink to="/start" variant="secondary" className="mt-6">
                  {CTA_TRIAL}
                </ButtonLink>
              </div>
            ) : (
              <>
                <SearchForm
                  button="Get my link"
                  query={query}
                  setQuery={setQuery}
                  error={error}
                  setError={setError}
                  onSubmit={(e) => void submit(e)}
                  loading={searching}
                />
                <p className="mt-3 text-small text-text-2">Free, no sign-up.</p>
                <div className="mt-3">
                  <Turnstile key={round} onToken={setToken} />
                </div>
              </>
            )}

            {searching && (
              <Card className="mt-8">
                <h2 className="mb-5 text-h3">Searching for {query}</h2>
                <SearchingSteps
                  steps={["Finding your business on Google", "Building your link and QR code"]}
                  progress={0}
                />
              </Card>
            )}
            {phase === "none" && (
              <div className="mt-8">
                <NoneFound />
              </div>
            )}
            {phase === "pick" && (
              <div className="mt-8">
                <h2 className="text-h3">Pick your business</h2>
                <ul className="mt-4 space-y-3">
                  {places.map((p) => (
                    <li key={p.place_id}>
                      <button
                        type="button"
                        onClick={() => choose(p)}
                        className="press flex w-full items-start gap-4 rounded-card border border-line bg-surface-1 p-4 text-start hover:border-line-strong hover:bg-surface-2"
                      >
                        <MapPin className="mt-0.5 size-5 shrink-0 text-text-2" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-title">{p.name}</span>
                          <span className="mt-1 block text-small text-text-2">{p.address}</span>
                        </span>
                        <span className="shrink-0 self-center text-small font-bold">This one</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {phase === "result" && place && (
              <div className="mt-8 space-y-6">
                <div className="rounded-card border border-line bg-surface-1 p-4">
                  <p className="text-title">{place.name}</p>
                  <p className="mt-0.5 text-small text-text-2">{place.address}</p>
                </div>
                <CopyField label="Your review link" value={place.review_url} />
                {/* Neutral wording, the same for every customer (master plan 30.16 section 4). */}
                <CopyField
                  label="A message to send after a visit"
                  copyLabel="Copy message"
                  value={`Thank you for visiting ${place.name}. If you have a minute, you can leave a review on Google here: ${place.review_url}`}
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="secondary"
                    icon={<Download className="size-5" aria-hidden />}
                    onClick={() => {
                      void downloadQrPng(place.review_url, `google-review-qr-${file}.png`);
                      track("free_tool_used", { source: "review_link_png" });
                    }}
                  >
                    Download QR code
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<Printer className="size-5" aria-hidden />}
                    onClick={print}
                  >
                    Print a counter card
                  </Button>
                </div>
              </div>
            )}

            {phase !== "result" && phase !== "pick" && (
              <ul className="mt-8 space-y-3 text-body text-text-2">
                {[
                  "Type your business name and city.",
                  "Kabsi finds your business on Google and builds the link.",
                  "Put the code by the till, and send the link to every customer.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-small font-bold text-text-1">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:pt-[1.875rem]">
            <CounterCard
              cardRef={cardRef}
              business={place?.name ?? "Your business"}
              link={place?.review_url ?? null}
            />
          </div>
        </div>

        <Banner tone="info" title={RULES_TITLE} className="mt-10 max-w-3xl">
          {RULES_TEXT}
        </Banner>
      </section>
      <RankToo />
    </>
  );
}

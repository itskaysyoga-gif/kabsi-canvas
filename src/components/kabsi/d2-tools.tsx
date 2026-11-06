// The free review link and QR code tool (/google-review-link), with the real search and Google's own review link.
import {
  Download,
  ExternalLink,
  MapPin,
  Printer,
  QrCode as QrIcon,
  Search,
  SearchX,
  Share2,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { CTA_TRIAL, FREE_TOOL_BUSY_CODES } from "@/lib/site";
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";
import { useLazyTurnstile } from "@/components/turnstile";
import { track } from "@/lib/telemetry";
import { CopyField, SearchingSteps, ToolTabs } from "./d2-parts";
import { BusinessCombobox } from "./business-combobox";
import type { FoundBusiness } from "@/lib/profile-check";
import cafeCounter1600 from "@/assets/photos/cafe-counter-1600.webp";
import cafeCounter800 from "@/assets/photos/cafe-counter-800.webp";
import { ScanBox } from "./scan-box";
import { Banner, Button, ButtonLink, Card, EmptyState, Field, buttonClass } from "./ui";
import { dropsLetters, hasLetters, printable } from "@/lib/qr-card-name";
import { Marked, YellowNumber } from "@/components/kabsi/highlight";

/* ---------- Shared pieces ---------- */

function NoneFound() {
  return (
    <EmptyState icon={SearchX} title="We could not find that business.">
      Check the name and city, or type the name exactly as it shows on Google.
    </EmptyState>
  );
}

// Fix 2 (master plan 30.27 item 2): the free check does not rank, so the closing line says what it does.
function CheckToo() {
  return (
    <section className="container-kb section-y" aria-labelledby="check-too">
      <div className="mx-auto max-w-[40rem]">
        <h2 id="check-too" className="text-h2">
          <Marked text="See what Google shows about you." mark="Google shows" />
        </h2>
        <p className="mt-3 text-lead text-text-2">
          The free check reads your Google profile and names the one thing to do first.
        </p>
        <ScanBox under="scan" className="mt-8" />
      </div>
    </section>
  );
}

/* ---------- Review link and QR code ---------- */

const RULES_TITLE = "Send it to every customer, the same way.";
const RULES_TEXT =
  "Do not offer anything in return, and do not ask only happy customers. Those are Google's rules.";

// Launch 2 part B (master plan 30.36 item 7): the lines of this tool that tell the truth about what happened.
export const REVIEW_TOOL_BUSY = {
  title: "The review link tool is busy right now.",
  line: "Try again in a few minutes.",
} as const;
export const CARD_FAILED =
  "The card could not be made on this device. Try the PDF, or another browser.";
export const TEST_LINE =
  "Check it opens your business. Google may ask customers to sign in before they write a review.";
export const NAME_LABEL = "Name on the card";
export const NAME_HELP = "Type the business name in English letters as you want it printed.";

/** Google's own review link for a place (the same format the review-link function returns). */
export const reviewUrl = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

/**
 * Scan 3 (master plan 30.34 item 3): the branded card, drawn from src/lib/qr-card.ts (loaded with it). Before a business
 * is chosen it shows an empty code space, never a made-up code.
 */
export function BrandedCard({ business, link }: { business: string; link: string | null }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    if (!link) return setSvg(null);
    let live = true;
    void import("@/lib/qr-card").then((q) => {
      if (live)
        setSvg(
          q.cardSvg(
            q.cardShapes(business, link, q.canvasMeasure()),
            `Review card for ${business}: ${q.CARD_LINE}, with a QR code`,
          ),
        );
    });
    return () => {
      live = false;
    };
  }, [business, link]);
  return (
    <figure className="mx-auto w-full max-w-[22rem]">
      {svg ? (
        <div
          data-testid="review-card"
          className="overflow-hidden rounded-panel bg-kb-white shadow-lift [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          // The SVG is built by qr-card.ts from shapes; the business name in it is escaped there.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="grid aspect-[297/420] w-full place-items-center rounded-panel bg-kb-white p-8 text-center text-kb-ink shadow-lift">
          <div>
            <p className="font-display text-title font-bold">{business}</p>
            <p className="mt-1 text-body text-kb-stone">Scan to review us on Google</p>
            <div
              aria-hidden
              className="mx-auto mt-6 grid aspect-square w-40 place-items-center rounded-card border-[10px] border-kb-yellow text-kb-stone"
            >
              <QrIcon className="size-12" strokeWidth={1.25} />
            </div>
            <p className="mt-6 text-small text-kb-stone">kabsi.co</p>
          </div>
        </div>
      )}
      <figcaption className="mt-3 text-center text-small text-text-2">
        A6 card, 105 by 148 mm. Print it for your counter.
      </figcaption>
    </figure>
  );
}

type Place = { place_id: string; name: string; address: string; review_url: string };
type Phase = "empty" | "searching" | "pick" | "result" | "none" | "busy";

/**
 * The free review link tool (D252; Scan 3, 30.34 item 3): the same suggestions as the free check, a confirm card with
 * "Change business", Google's own review link, the branded card as PNG and A6 PDF, copy and share. A typed search without
 * a suggestion still goes through the review-link Edge Function (the Places key stays on the server), behind Turnstile.
 */
export function ReviewLinkTool() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("empty");
  const [places, setPlaces] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [canShare, setCanShare] = useState(false);
  // The name the card prints. Asked for only when Google's name has letters the card cannot print.
  const [printName, setPrintName] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  // The bot check loads on the form's first touch, not at page start (Fix 1); the search waits for its token.
  const check = useLazyTurnstile();
  const searching = phase === "searching";
  useEffect(() => setCanShare(typeof navigator !== "undefined" && !!navigator.share), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) {
      setError("Type your business name and city.");
      return;
    }
    setError(null);
    setPhase("searching");
    const t = await check.take();
    if (!t) {
      setPhase("empty");
      return;
    }
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
        // Scan 3: never chosen for the owner, not even the only match; the list asks and the confirm card follows.
        setPhase(found.length ? "pick" : "none");
      }
    } catch {
      setError("Search didn't work. Try again.");
      setPhase("empty");
    }
  };
  const choose = (p: Place) => {
    setPlace(p);
    setPrintName(printable(p.name));
    setCardError(null);
    setPhase("result");
    track("review_link_created", { source: "review_link_tool" });
  };
  // A suggestion from the box: the Place ID gives Google's own review link, with no search on the server.
  const pickSuggestion = (p: FoundBusiness) =>
    choose({
      place_id: p.place_id,
      name: p.name,
      address: p.address,
      review_url: reviewUrl(p.place_id),
    });
  const change = () => {
    setPlace(null);
    setPlaces([]);
    setPhase("empty");
    window.setTimeout(() => document.getElementById("review-search")?.focus(), 0);
  };
  // A name the card cannot print in full: the owner types the name to print, and every place it shows uses that.
  const askName = !!place && dropsLetters(place.name);
  const cardName = place ? (askName ? printName : place.name) : "";
  const shownName = place ? (askName ? printable(printName) : place.name) : "";
  const canMake = !!place && hasLetters(cardName);
  const file =
    printable(cardName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "business";
  const download = async (kind: "png" | "pdf") => {
    if (!place || !canMake) return;
    setCardError(null);
    let saved = false;
    try {
      const q = await import("@/lib/qr-card");
      saved = await q.saveCard(
        kind,
        cardName,
        place.review_url,
        kind === "png" ? `review-card-${file}.png` : `review-card-${file}-a6.pdf`,
      );
    } catch {
      saved = false;
    }
    // Counted only when the file was made and handed to the browser.
    if (!saved) return setCardError(CARD_FAILED);
    track("free_tool_used", { source: kind === "png" ? "review_link_png" : "review_link_print" });
  };
  const share = () => {
    if (!place) return;
    void navigator
      .share({
        title: shownName || "Review us on Google",
        text: shownName ? `Leave a review for ${shownName} on Google` : "Leave a review on Google",
        url: place.review_url,
      })
      .catch(() => undefined);
  };

  return (
    <>
      <section className="container-kb pt-10 lg:pt-16">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <h1 className="text-display text-balance">
              <Marked
                text="Get your Google review link and QR code."
                mark="review link and QR code."
              />
            </h1>
            <p className="mt-4 max-w-[34rem] text-lead text-text-2">
              One link that opens the review box on your Google profile. Free, no sign-up.
            </p>
          </div>
          {/* A library photo (docs/PHOTOS.md, cafe-counter), loaded first: it is the hero's picture. */}
          <img
            src={cafeCounter800}
            srcSet={`${cafeCounter800} 800w, ${cafeCounter1600} 1600w`}
            sizes="(min-width: 1024px) 34rem, calc(100vw - 40px)"
            width={1600}
            height={1067}
            alt="A cafe owner at the counter"
            fetchPriority="high"
            className="aspect-[3/2] w-full rounded-panel bg-surface-2 object-cover"
          />
        </div>
      </section>
      <section className="container-kb mt-10">
        <ToolTabs current="/google-review-link" />
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            {phase === "busy" ? (
              <div className="rounded-panel border border-line bg-surface-1 p-6 sm:p-8">
                <h2 className="text-h3">{REVIEW_TOOL_BUSY.title}</h2>
                <p className="mt-3 max-w-xl text-body text-text-2">{REVIEW_TOOL_BUSY.line}</p>
                <ButtonLink to="/start" variant="secondary" className="mt-6">
                  {CTA_TRIAL}
                </ButtonLink>
              </div>
            ) : phase === "result" && place ? (
              <section
                aria-labelledby="confirm-h"
                className="rounded-panel border border-line bg-surface-1 p-5 sm:p-6"
              >
                <p id="confirm-h" className="text-small font-bold text-text-2">
                  Your business on Google
                </p>
                {/* R-61: a name the card cannot print is never shown in its own letters; the typed name stands in. */}
                <p className="mt-1 text-h3 break-words">
                  {askName ? shownName || "Your business" : place.name}
                </p>
                {place.address && <p className="mt-1 text-body text-text-2">{place.address}</p>}
                <p className="mt-1 text-label font-semibold text-text-3">
                  <span translate="no">Google Maps</span>
                </p>
                <button
                  type="button"
                  onClick={change}
                  className="press mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                >
                  Change business
                </button>
              </section>
            ) : (
              <div ref={check.area}>
                <form
                  onSubmit={(e) => void submit(e)}
                  noValidate
                  className="flex flex-col gap-3 sm:flex-row sm:items-start"
                >
                  <BusinessCombobox
                    id="review-search"
                    className="min-w-0 flex-1"
                    label="Find your business on Google"
                    placeholder="Business name and city"
                    value={query}
                    onChange={(v) => {
                      setQuery(v);
                      if (error) setError(null);
                    }}
                    onPick={(p) => pickSuggestion(p)}
                    error={error}
                    leading={<Search className="size-5 shrink-0 text-text-3" aria-hidden />}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={searching}
                    className="sm:mt-[1.875rem]"
                  >
                    Get my link
                  </Button>
                </form>
                <p className="mt-3 text-small text-text-2">Free, no sign-up.</p>
                <div className="mt-3">{check.widget}</div>
              </div>
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
                <h2 className="text-h3">
                  <Marked text="Pick your business" mark="your business" />
                </h2>
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
                          <span className="mt-1 block text-body text-text-2">{p.address}</span>
                        </span>
                        <span className="shrink-0 self-center text-body font-bold">This one</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-label font-semibold text-text-3">
                  <span translate="no">Google Maps</span>
                </p>
              </div>
            )}

            {phase === "result" && place && (
              <div className="mt-6 space-y-6">
                <div>
                  <CopyField label="Your review link" value={place.review_url}>
                    <a
                      href={place.review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClass("tertiary")}
                    >
                      <ExternalLink className="size-5" aria-hidden />
                      Test the link
                    </a>
                  </CopyField>
                  <p className="mt-2 text-small text-text-2">{TEST_LINE}</p>
                </div>
                {/* Neutral wording, the same for every customer (master plan 30.16 section 4). */}
                <CopyField
                  label="A message to send after a visit"
                  copyLabel="Copy message"
                  value={`Thank you for visiting ${shownName || "us"}. If you have a minute, you can leave a review on Google here: ${place.review_url}`}
                />
                {askName ? (
                  <div className="max-w-[22rem]">
                    <Field
                      id="card-name"
                      label={NAME_LABEL}
                      value={printName}
                      autoComplete="organization"
                      onChange={(e) => {
                        setPrintName(e.target.value);
                        setCardError(null);
                      }}
                    />
                    <p className="mt-2 text-small text-text-2">{NAME_HELP}</p>
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    variant="secondary"
                    icon={<Download className="size-5" aria-hidden />}
                    disabled={!canMake}
                    onClick={() => void download("png")}
                  >
                    Download the card (PNG)
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<Printer className="size-5" aria-hidden />}
                    disabled={!canMake}
                    onClick={() => void download("pdf")}
                  >
                    Download to print (A6 PDF)
                  </Button>
                  {canShare && (
                    <Button
                      variant="secondary"
                      icon={<Share2 className="size-5" aria-hidden />}
                      onClick={share}
                    >
                      Share the link
                    </Button>
                  )}
                </div>
                <p role="status" className={cardError ? "text-small text-text-1" : "sr-only"}>
                  {cardError ?? ""}
                </p>
              </div>
            )}

            {phase !== "result" && phase !== "pick" && (
              <ol className="mt-8 space-y-3 text-body">
                {[
                  "Type your business name and city, then choose it.",
                  "Check it is your business, or change it.",
                  "Put the card by the till, and send the link to every customer.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <YellowNumber n={i + 1} />
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="lg:pt-2">
            <BrandedCard
              business={place ? (hasLetters(cardName) ? cardName : "") : "Your business"}
              link={place && hasLetters(cardName) ? place.review_url : null}
            />
          </div>
        </div>

        <Banner tone="info" title={RULES_TITLE} className="mt-10 max-w-3xl">
          {RULES_TEXT}
        </Banner>
      </section>
      <CheckToo />
    </>
  );
}

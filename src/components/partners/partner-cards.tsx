import { useEffect, useState } from "react";
import { BusinessCombobox } from "@/components/kabsi/business-combobox";
import { Banner, Button, buttonClass, Card } from "@/components/kabsi/ui";
import type { FoundBusiness } from "@/lib/profile-check";
import {
  BATCHES,
  CARD_COPY as C,
  type CardLink,
  CardLinkError,
  type CardLinks,
  cardLinkUrl,
  linksText,
  loadCardLinks,
  mintCardLinks,
  setCardBusiness,
} from "@/lib/partner-cards";

// Cards 2 (master plan 30.50 item 9): "Card links" on the partner home. Mint links in batches (200 to start, until staff
// raise it), choose cards, find the business with the review link search (its suggestions and shared limits), and set it.
// Nothing from Google is kept but the Place ID: the picked business's name shows only until the page closes.
export default function PartnerCards() {
  const [data, setData] = useState<CardLinks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<FoundBusiness | null>(null);
  const [copied, setCopied] = useState(false);
  const load = () =>
    loadCardLinks()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof CardLinkError ? e.message : C.none));
  useEffect(() => {
    void load();
  }, []);

  const act = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      setNote(await fn());
      await load();
    } catch (e) {
      setError(
        e instanceof CardLinkError
          ? e.message
          : "Something went wrong. Please try again in a minute.",
      );
    } finally {
      setBusy(false);
    }
  };
  const mint = (n: number) => act(async () => (await mintCardLinks(n), null));
  const place = () =>
    act(async () => {
      if (!picked) return null;
      const r = await setCardBusiness(chosen, picked.place_id);
      setChosen([]);
      setPicked(null);
      setQuery("");
      return C.setDone(r.count);
    });
  const toggle = (code: string) =>
    setChosen((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
  const copyAll = async (cards: CardLink[]) => {
    try {
      await navigator.clipboard.writeText(linksText(cards));
      setCopied(true);
    } catch {
      /* the links are on screen to copy by hand */
    }
  };

  if (!data || data.result !== "ok") return error ? <Banner tone="bad" title={error} /> : null;
  const open = data.cards.filter((c) => c.state === "new" || c.state === "set");
  return (
    <Card>
      <h2 className="text-h3 font-bold text-text-1">{C.title}</h2>
      <p className="mt-1 text-body text-text-2">{C.lead}</p>
      <p className="mt-2 text-small text-text-2">{C.count(data.used, data.limit)}</p>

      {data.can_mint ? (
        <div className="mt-4">
          <p className="text-small font-bold text-text-1">{C.makeTitle}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BATCHES.map((n) => (
              <Button
                key={n}
                variant="secondary"
                size="md"
                disabled={busy || data.used + n > data.limit}
                onClick={() => void mint(n)}
              >
                {C.make(n)}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-body text-text-2">{C.notActive}</p>
      )}

      {error ? <Banner tone="bad" title={error} className="mt-4" /> : null}
      {note ? (
        <p className="mt-4 text-body text-text-1" role="status">
          {note}
        </p>
      ) : null}

      {data.cards.length ? (
        <>
          <button
            type="button"
            onClick={() => void copyAll(data.cards)}
            className={buttonClass("secondary", "md") + " mt-5"}
          >
            {copied ? C.copied : C.copyAll}
          </button>
          <ul className="mt-3 divide-y divide-line">
            {data.cards.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center gap-3 py-3">
                {c.state === "new" || c.state === "set" ? (
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-kb-green"
                    aria-label={C.select(c.code)}
                    checked={chosen.includes(c.code)}
                    onChange={() => toggle(c.code)}
                  />
                ) : (
                  <span className="size-5 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 flex-1 break-all font-mono text-small text-text-1">
                  {cardLinkUrl(c.code)}
                </span>
                <span className="text-small text-text-2">
                  {C.state[c.state]}
                  {c.state !== "claimed" ? ` · ${C.taps(c.taps)}` : ""}
                </span>
                {c.destination ? (
                  <a
                    href={c.destination}
                    target="_blank"
                    rel="noreferrer"
                    className="text-small font-bold text-text-1 underline underline-offset-4"
                  >
                    {C.test}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-small text-text-2">{C.tapNote}</p>
        </>
      ) : (
        <p className="mt-4 text-body text-text-2">{C.none}</p>
      )}

      {open.length ? (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-body font-bold text-text-1">{C.setTitle}</h3>
          <p className="mt-1 text-small text-text-2">{C.setHint}</p>
          {picked ? (
            <div className="mt-3 rounded-inner bg-surface-2 p-4">
              <p className="text-body font-bold text-text-1">{picked.name}</p>
              <p className="text-small text-text-2">{picked.address}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="md" disabled={busy || !chosen.length} onClick={() => void place()}>
                  {C.setButton(chosen.length)}
                </Button>
                <Button variant="secondary" size="md" onClick={() => setPicked(null)}>
                  {C.change}
                </Button>
              </div>
            </div>
          ) : (
            <BusinessCombobox
              id="card-business"
              className="mt-3"
              label={C.searchLabel}
              placeholder={C.searchPlaceholder}
              value={query}
              onChange={setQuery}
              onPick={(p) => setPicked(p)}
            />
          )}
        </div>
      ) : null}

      <p className="mt-6 text-small text-text-2">{C.claimLine}</p>
      <p className="mt-1 text-small text-text-2">{C.rule}</p>
    </Card>
  );
}

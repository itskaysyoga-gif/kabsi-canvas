import { useEffect, useState } from "react";
import { Button, Card } from "@/components/kabsi/ui";
import { PARTNER_KIND_OPTIONS, type PartnerKind } from "@/lib/partner";
import {
  CAN_SAY,
  DO_NOT_SAY,
  KIT,
  KIT_NOTICE,
  KIT_POSTS,
  LABEL_NOTE,
  postText,
} from "@/lib/partner-kit";

// Partners 3 (master plan 30.50 item 5): the kit in the partner home. Three ready posts for a kind of partner (the
// partner's own kind first), the A6 insert for card packaging with the partner's QR code, and the say and never say lists.
// The words are src/lib/partner-kit.ts and docs/COPY.md section 83. The insert's drawing code loads only when the kit shows.

export function PartnerKit({ kind, name, link }: { kind: PartnerKind; name: string; link: string }) {
  const [shown, setShown] = useState<PartnerKind>(kind);
  const [copied, setCopied] = useState<number | null>(null);
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all([import("@/lib/partner-insert"), import("@/lib/qr-card")])
      .then(([ins, card]) => {
        if (live) setSvg(ins.insertSvg(ins.insertShapes(name, link, card.canvasMeasure())));
      })
      .catch(() => live && setSvg(""));
    return () => {
      live = false;
    };
  }, [name, link]);

  const copy = async (i: number, body: string) => {
    try {
      await navigator.clipboard.writeText(postText(body, link));
      setCopied(i);
    } catch {
      /* the post is on screen to copy by hand */
    }
  };

  const download = async () => {
    setFailed(false);
    try {
      const [ins, card] = await Promise.all([import("@/lib/partner-insert"), import("@/lib/qr-card")]);
      const shapes = ins.insertShapes(name, link, card.canvasMeasure());
      const blob = new Blob([ins.insertPdf(shapes)], { type: "application/pdf" });
      card.saveBlob(blob, "kabsi-insert-a6.pdf");
    } catch {
      setFailed(true);
    }
  };

  return (
    <Card>
      <h2 id="kit" className="scroll-mt-20 text-h3 font-bold text-text-1">
        {KIT.title}
      </h2>
      <p className="mt-1 text-small text-text-2">{KIT.lead}</p>

      <h3 className="mt-6 text-title text-text-1">{KIT.postsTitle}</h3>
      <p className="mt-1 text-small text-text-2">{LABEL_NOTE}</p>
      <label className="mt-3 flex flex-wrap items-center gap-2 text-small font-bold text-text-1">
        {KIT.kindLabel}
        <select
          value={shown}
          onChange={(e) => {
            setShown(e.target.value as PartnerKind);
            setCopied(null);
          }}
          className="min-h-11 rounded-input border border-stroke bg-surface-0 px-3 text-body font-normal text-text-1"
        >
          {PARTNER_KIND_OPTIONS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <ol className="mt-4 space-y-4">
        {KIT_POSTS[shown].map((body, i) => (
          <li key={`${shown}-${i}`} className="rounded-inner bg-surface-2 p-4">
            <p className="whitespace-pre-line text-small text-text-1">{postText(body, link)}</p>
            <Button variant="secondary" size="md" className="mt-3" onClick={() => void copy(i, body)}>
              {copied === i ? KIT.copied : KIT.copy}
            </Button>
          </li>
        ))}
      </ol>
      <span className="sr-only" role="status">
        {copied !== null ? KIT.copied : ""}
      </span>

      <h3 className="mt-8 text-title text-text-1">{KIT.insertTitle}</h3>
      <p className="mt-1 text-small text-text-2">{KIT.insertLine}</p>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
        {/* The SVG is drawn by partner-insert.ts from shapes; the partner's name in it is escaped there. */}
        <div
          className="w-44 shrink-0 overflow-hidden rounded-inner border border-line bg-surface-0"
          aria-label={KIT.insertPreview}
          role="img"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div>
          <Button variant="secondary" size="md" onClick={() => void download()}>
            {KIT.insertDownload}
          </Button>
          {failed ? <p className="mt-2 text-small text-bad">{KIT.insertFailed}</p> : null}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-title text-text-1">{KIT.canSayTitle}</h3>
          <ul className="mt-2 list-disc space-y-2 ps-5 text-body text-text-1">
            {CAN_SAY.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-title text-text-1">{KIT.doNotSayTitle}</h3>
          <ul className="mt-2 list-disc space-y-2 ps-5 text-body text-text-1">
            {DO_NOT_SAY.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-6 text-small text-text-2">{KIT_NOTICE}</p>
    </Card>
  );
}

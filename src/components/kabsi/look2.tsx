// One WhatsApp message in the Look 2 style (master plan 30.50 item 2, COPY.md 77), drawn on the website: a marker (an
// icon on the site; DESIGN.md has no emoji on the site), a bold title, the facts one per line with reviews and drafts as
// quote lines, then one status or question, the buttons under it with the yes first. A picture: its buttons are not
// controls. Home 2's hero thread uses it (Site 3a's one demonstration used it below the hero).
import { cn } from "@/lib/utils";
import { Img, type Photo } from "./photos";
import { ExampleBadge, KabsiMark } from "./ui";

export type Look2Line = { text: string; quote?: boolean };
export type Look2Message = {
  id: string;
  marker: "review" | "hours" | "post";
  title: string;
  business: string;
  facts: readonly Look2Line[];
  status: string;
  buttons?: readonly string[];
  time: string;
};

/** The three markers, drawn inline in lucide's shapes (star, clock, image) so the hero loads no icon module. */
function Marker({ kind }: { kind: Look2Message["marker"] }) {
  const svg = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "review")
    return (
      <svg {...svg} className="size-4 shrink-0 fill-current text-warn">
        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
      </svg>
    );
  if (kind === "hours")
    return (
      <svg {...svg} className="size-4 shrink-0 text-kb-green-ink">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  return (
    <svg {...svg} className="size-4 shrink-0 text-kb-green-ink">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3-3a2 2 0 0 0-3 0L6 21" />
    </svg>
  );
}

/** WhatsApp reply buttons drawn as a picture: not focusable, hidden from screen readers. */
function Buttons({ labels }: { labels: readonly string[] }) {
  return (
    <div
      className={cn(
        "ms-1.5 mt-1 grid max-w-[95%] gap-1",
        labels.length === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
      aria-hidden
    >
      {labels.map((b) => (
        <span
          key={b}
          className="grid h-8 place-items-center rounded-bubble bg-wa-in px-1 text-center text-chat font-semibold text-wa-link shadow-bubble"
        >
          {b}
        </span>
      ))}
    </div>
  );
}

export function Look2Bubble({ m }: { m: Look2Message }) {
  return (
    <li>
      <div className="relative ms-1.5 max-w-[95%] rounded-bubble rounded-ss-none bg-wa-in px-2.5 pt-1.5 pb-1 text-chat text-wa-ink shadow-bubble">
        <span
          aria-hidden
          className="absolute -start-2 top-0 size-2.5 bg-wa-in [clip-path:polygon(0_0,100%_0,100%_100%)]"
        />
        <p className="flex items-center gap-1.5">
          <Marker kind={m.marker} />
          <span>
            <span className="font-bold">{m.title}</span> · {m.business}
          </span>
        </p>
        <div className="mt-1.5 space-y-0.5">
          {m.facts.map((f) =>
            f.quote ? (
              <p key={f.text} className="border-s-[3px] border-wa-divider ps-2 text-wa-time-out">
                {f.text}
              </p>
            ) : (
              <p key={f.text}>{f.text}</p>
            ),
          )}
        </div>
        <p className="mt-1.5">{m.status}</p>
        <p className="mt-0.5 text-end text-chat-meta text-wa-time-out">{m.time}</p>
      </div>
      {m.buttons && <Buttons labels={m.buttons} />}
    </li>
  );
}

/** The owner's own message, on the right; with a photo when `photo` is given. */
export function OwnerBubble({
  text,
  time,
  photo,
}: {
  text: string;
  time: string;
  photo?: Photo | undefined;
}) {
  return (
    <li className="ms-auto w-fit max-w-[80%] rounded-bubble rounded-se-none bg-wa-out p-1.5 text-chat text-wa-ink shadow-bubble">
      {photo && (
        <Img
          photo={photo}
          sizes="160px"
          decorative
          className="aspect-[4/3] w-40 rounded-[0.375rem] object-cover object-[50%_30%]"
        />
      )}
      <p className="px-1 pt-1">{text}</p>
      <p className="px-1 text-end text-chat-meta text-wa-time-out">{time}</p>
    </li>
  );
}

/** One Example message in a small phone (Site 3b: the sign-in page's side picture, in the words of Home's thread). */
export function Look2Phone({ message, caption }: { message: Look2Message; caption: string }) {
  return (
    <figure className="relative w-full max-w-[20rem]">
      <div className="rounded-[2.4rem] bg-kb-black p-[0.55rem] shadow-float">
        <div className="overflow-hidden rounded-[1.9rem] bg-wa-chat">
          <div className="flex items-center gap-2 border-b border-wa-divider bg-wa-header px-3 pt-3 pb-2 text-wa-ink">
            <KabsiMark ring={false} className="size-8" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-chat font-bold">Kabsi</p>
              <p className="truncate text-chat-meta text-wa-time-out">Today</p>
            </div>
            <ExampleBadge className="shrink-0" />
          </div>
          <ol className="space-y-2 px-2.5 pt-3 pb-4" aria-label="A message from Kabsi, Example">
            <Look2Bubble m={message} />
          </ol>
        </div>
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}

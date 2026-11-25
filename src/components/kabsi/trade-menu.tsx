// SITE-6: the header's on-demand parts: the rows of the "For your business" menu and the phone menu's contents. This
// module is reached only through a dynamic import() from site-header.tsx (on the first hover, focus or tap of a menu
// button), so its icons, lines and the phone menu never weigh on a page's first load (the speed gate). The trade icons
// are Lucide's drawings (ISC licence, lucide-react 0.575) kept as plain SVG data, and the module imports no new Lucide
// icon: one would split Lucide's shared code out of the first-load chunk. tests/site6-header.test.ts keeps the list
// equal to the industry pages that exist (industriesAtoZ) and their names.
import { createElement, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronRight, MessageCircle } from "lucide-react";
import {
  ALL_BUSINESSES,
  MAIN_CTA,
  NAV_LINKS,
  TRADES_MENU_LABEL,
  WHATSAPP_ON,
  WHATSAPP_URL,
} from "@/lib/site";
import { cn } from "@/lib/utils";
import { SiteLink } from "./site-link";
import { ButtonLink, TrialLine, WhatsAppGlyph } from "./ui";

type SvgNode = [string, Record<string, string>];
export type TradeRow = { slug: string; label: string; line: string; icon: SvgNode[] };

/** Every industry page, A to Z by its name, each with one line of what Kabsi does there (from trade-work.ts). */
export const TRADE_MENU: readonly TradeRow[] = [
  {
    slug: "auto-repair",
    label: "Auto repair",
    line: "Careful replies, your number watched",
    icon: [
      [
        "path",
        {
          d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",
        },
      ],
    ],
  },
  {
    slug: "bakery",
    label: "Bakeries",
    line: "Today's bake posted, early closing",
    icon: [
      ["path", { d: "M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487" }],
      ["path", { d: "M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132" }],
      ["path", { d: "M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42" }],
      ["path", { d: "M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14" }],
      [
        "path",
        {
          d: "M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676",
        },
      ],
    ],
  },
  {
    slug: "barbershop",
    label: "Barbershops",
    line: "Walk-in hours and fresh fades",
    icon: [
      ["path", { d: "M5.42 9.42 8 12" }],
      ["circle", { cx: "4", cy: "8", r: "2" }],
      ["path", { d: "m14 6-8.58 8.58" }],
      ["circle", { cx: "4", cy: "16", r: "2" }],
      ["path", { d: "M10.8 14.8 14 18" }],
      ["path", { d: "M16 12h-2" }],
      ["path", { d: "M22 12h-2" }],
    ],
  },
  {
    slug: "beauty-salon",
    label: "Beauty salons",
    line: "Treatment reviews and closures",
    icon: [
      [
        "path",
        {
          d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
        },
      ],
      ["path", { d: "M20 2v4" }],
      ["path", { d: "M22 4h-4" }],
      ["circle", { cx: "4", cy: "20", r: "2" }],
    ],
  },
  {
    slug: "cafe",
    label: "Cafes",
    line: "Early hours and new bakes posted",
    icon: [
      ["path", { d: "M10 2v2" }],
      ["path", { d: "M14 2v2" }],
      [
        "path",
        {
          d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",
        },
      ],
      ["path", { d: "M6 2v2" }],
    ],
  },
  {
    slug: "car-wash",
    label: "Car washes and detailing",
    line: "Detailing photos, weather closures",
    icon: [
      [
        "path",
        {
          d: "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2",
        },
      ],
      ["circle", { cx: "7", cy: "17", r: "2" }],
      ["path", { d: "M9 17h6" }],
      ["circle", { cx: "17", cy: "17", r: "2" }],
    ],
  },
  {
    slug: "cleaner",
    label: "Cleaners",
    line: "Replies after each clean",
    icon: [
      ["path", { d: "M3 3h.01" }],
      ["path", { d: "M7 5h.01" }],
      ["path", { d: "M11 7h.01" }],
      ["path", { d: "M3 7h.01" }],
      ["path", { d: "M7 9h.01" }],
      ["path", { d: "M3 11h.01" }],
      ["rect", { width: "4", height: "4", x: "15", y: "5" }],
      ["path", { d: "m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2" }],
      ["path", { d: "m13 14 8-2" }],
      ["path", { d: "m13 19 8-2" }],
    ],
  },
  {
    slug: "dental-clinic",
    label: "Dental clinics",
    line: "Private replies, emergency hours",
    icon: [
      ["circle", { cx: "12", cy: "12", r: "10" }],
      ["path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }],
      ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9" }],
      ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9" }],
    ],
  },
  {
    slug: "florist",
    label: "Florists",
    line: "Busy day hours and bouquet posts",
    icon: [
      [
        "path",
        {
          d: "M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1",
        },
      ],
      ["circle", { cx: "12", cy: "8", r: "2" }],
      ["path", { d: "M12 10v12" }],
      ["path", { d: "M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z" }],
      ["path", { d: "M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z" }],
    ],
  },
  {
    slug: "gym-and-fitness",
    label: "Gyms and fitness studios",
    line: "Holiday class hours, new classes",
    icon: [
      [
        "path",
        {
          d: "M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z",
        },
      ],
      ["path", { d: "m2.5 21.5 1.4-1.4" }],
      ["path", { d: "m20.1 3.9 1.4-1.4" }],
      [
        "path",
        {
          d: "M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z",
        },
      ],
      ["path", { d: "m9.6 14.4 4.8-4.8" }],
    ],
  },
  {
    slug: "hair-salon",
    label: "Hair salons",
    line: "Replies that thank the right stylist",
    icon: [
      ["circle", { cx: "6", cy: "6", r: "3" }],
      ["path", { d: "M8.12 8.12 12 12" }],
      ["path", { d: "M20 4 8.12 15.88" }],
      ["circle", { cx: "6", cy: "18", r: "3" }],
      ["path", { d: "M14.8 14.8 20 20" }],
    ],
  },
  {
    slug: "lash-and-brow-studio",
    label: "Lash and brow studios",
    line: "Fresh sets and the booking page",
    icon: [
      [
        "path",
        {
          d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
        },
      ],
      ["circle", { cx: "12", cy: "12", r: "3" }],
    ],
  },
  {
    slug: "medical-and-aesthetic-clinic",
    label: "Medical and aesthetic clinics",
    line: "General replies, the website link",
    icon: [
      ["path", { d: "m18 2 4 4" }],
      ["path", { d: "m17 7 3-3" }],
      ["path", { d: "M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" }],
      ["path", { d: "m9 11 4 4" }],
      ["path", { d: "m5 19-3 3" }],
      ["path", { d: "m14 4 6 6" }],
    ],
  },
  {
    slug: "nail-salon",
    label: "Nail salons",
    line: "Nail art posts and holiday hours",
    icon: [
      ["path", { d: "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" }],
      ["path", { d: "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" }],
      ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" }],
      [
        "path",
        {
          d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
        },
      ],
    ],
  },
  {
    slug: "optician",
    label: "Opticians",
    line: "New frames and eye test bookings",
    icon: [
      ["circle", { cx: "6", cy: "15", r: "4" }],
      ["circle", { cx: "18", cy: "15", r: "4" }],
      ["path", { d: "M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2" }],
      ["path", { d: "M2.5 13 5 7c.7-1.3 1.4-2 3-2" }],
      ["path", { d: "M21.5 13 19 7c-.7-1.3-1.5-2-3-2" }],
    ],
  },
  {
    slug: "pet-grooming",
    label: "Pet groomers",
    line: "Fresh grooms and closed weeks",
    icon: [
      ["path", { d: "M11.25 16.25h1.5L12 17z" }],
      ["path", { d: "M16 14v.5" }],
      [
        "path",
        {
          d: "M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309",
        },
      ],
      ["path", { d: "M8 14v.5" }],
      [
        "path",
        {
          d: "M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5",
        },
      ],
    ],
  },
  {
    slug: "physiotherapy",
    label: "Physiotherapy",
    line: "Evening hours, the booking link",
    icon: [
      [
        "path",
        {
          d: "M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z",
        },
      ],
    ],
  },
  {
    slug: "restaurant",
    label: "Restaurants",
    line: "Holiday hours and the menu link",
    icon: [
      ["path", { d: "m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" }],
      ["path", { d: "M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" }],
      ["path", { d: "m2.1 21.8 6.4-6.3" }],
      ["path", { d: "m19 5-7 7" }],
    ],
  },
  {
    slug: "spa-and-massage",
    label: "Spas and massage",
    line: "Calm replies and holiday hours",
    icon: [
      [
        "path",
        {
          d: "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",
        },
      ],
      [
        "path",
        {
          d: "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",
        },
      ],
    ],
  },
  {
    slug: "tattoo-studio",
    label: "Tattoo studios",
    line: "Healed work and guest artist hours",
    icon: [
      [
        "path",
        {
          d: "M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z",
        },
      ],
      [
        "path",
        {
          d: "m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18",
        },
      ],
      ["path", { d: "m2.3 2.3 7.286 7.286" }],
      ["circle", { cx: "11", cy: "11", r: "2" }],
    ],
  },
  {
    slug: "veterinary-clinic",
    label: "Vet clinics",
    line: "Kind replies, the number kept right",
    icon: [
      ["circle", { cx: "11", cy: "4", r: "2" }],
      ["circle", { cx: "18", cy: "8", r: "2" }],
      ["circle", { cx: "20", cy: "16", r: "2" }],
      [
        "path",
        {
          d: "M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z",
        },
      ],
    ],
  },
  {
    slug: "yoga-and-pilates-studio",
    label: "Yoga and pilates studios",
    line: "Class posts and holiday timetables",
    icon: [
      ["circle", { cx: "12", cy: "5", r: "1" }],
      ["path", { d: "m9 20 3-6 3 6" }],
      ["path", { d: "m6 8 6 2 6-2" }],
      ["path", { d: "M12 10v4" }],
    ],
  },
];

/** A 24 px line drawing, drawn like Lucide's icons (currentColor, 1.75 stroke, round ends). */
function Glyph({ nodes, className }: { nodes: SvgNode[]; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {nodes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

const ARROW: SvgNode[] = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "m12 5 7 7-7 7" }],
];

const iconBox =
  "grid size-9 shrink-0 place-items-center rounded-md bg-surface-2 text-text-1 transition-colors duration-150 ease-kb";
const allLinkCls =
  "press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-small font-semibold text-text-1 underline decoration-line-strong underline-offset-4 hover:decoration-text-1";

/**
 * The computer's menu panel: the trades in three columns (two under 1280 px), icon, name and one line each, then "All
 * businesses". Plain links in a list (a disclosure, not an ARIA menu), so Tab and the screen reader read them as links.
 */
function TradeMenuPanel({
  onPick,
  within,
}: {
  onPick: () => void;
  /** The header's menu (button and panel): a press outside it closes the panel. */
  within: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!within.current?.contains(e.target as Node)) onPick();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [onPick, within]);
  return (
    <div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 xl:grid-cols-3">
        {TRADE_MENU.map(({ slug, label, line, icon }) => (
          <li key={slug}>
            <SiteLink
              to={`/for/${slug}`}
              onClick={onPick}
              className="group flex items-start gap-3 rounded-inner px-3 py-2 hover:bg-surface-2 focus-visible:bg-surface-2"
              activeClassName="bg-surface-2"
            >
              <span
                aria-hidden
                className={cn(iconBox, "group-hover:bg-kb-yellow group-hover:text-kb-black")}
              >
                <Glyph nodes={icon} className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-small font-semibold text-text-1">{label}</span>
                <span className="mt-0.5 block text-label text-text-2">{line}</span>
              </span>
            </SiteLink>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-4 border-t border-line px-3 pt-4">
        <p className="text-small text-text-2">
          Every page shows what Kabsi does for that kind of business.
        </p>
        <SiteLink to={ALL_BUSINESSES.to} onClick={onPick} className={allLinkCls}>
          {ALL_BUSINESSES.label}
          <Glyph nodes={ARROW} className="size-4 rtl:-scale-x-100" />
        </SiteLink>
      </div>
    </div>
  );
}

/** The phone menu's trade list: two columns of icon and name, then "All businesses". */
function TradePhoneList({ onPick }: { onPick: () => void }) {
  return (
    <div className="pb-4">
      <ul className="grid grid-cols-1 gap-1 min-[360px]:grid-cols-2">
        {TRADE_MENU.map(({ slug, label, icon }) => (
          <li key={slug}>
            <SiteLink
              to={`/for/${slug}`}
              onClick={onPick}
              className="press flex min-h-12 items-center gap-2.5 rounded-inner px-2 text-small font-semibold text-text-1 hover:bg-surface-1"
            >
              <span aria-hidden className={cn(iconBox, "size-8 border border-line bg-surface-1")}>
                <Glyph nodes={icon} className="size-4" />
              </span>
              <span className="min-w-0 leading-tight">{label}</span>
            </SiteLink>
          </li>
        ))}
      </ul>
      <SiteLink to={ALL_BUSINESSES.to} onClick={onPick} className={cn(allLinkCls, "mt-2 px-2")}>
        {ALL_BUSINESSES.label}
        <Glyph nodes={ARROW} className="size-4 rtl:-scale-x-100" />
      </SiteLink>
    </div>
  );
}

/**
 * The phone menu's contents (SITE-6): "For your business", which opens the trades as a list in place, then How it works,
 * Pricing, Guides and Log in or Dashboard, then "Check my business free" with the trial line, then one quiet row: Ask
 * Nora, and WhatsApp only while WHATSAPP_ON. The sheet around it (site-header.tsx) traps focus, closes on Escape and
 * keeps the page behind still; this part puts focus on its first row once it is drawn.
 */
function PhoneMenuBody({
  close,
  account,
}: {
  close: () => void;
  /** The header's Log in or Dashboard row, passed in so this module never imports the header (one chunk less). */
  account: (rowCls: string, chevron: ReactNode) => ReactNode;
}) {
  const [trades, setTrades] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // Focus starts on the first row once the rows exist (the sheet traps it from there).
  useEffect(
    () => root.current?.querySelector<HTMLElement>("button,a")?.focus({ preventScroll: true }),
    [],
  );
  const rowCls =
    "press flex min-h-12 items-center justify-between gap-4 font-display text-title font-semibold text-text-1 focus-visible:outline-offset-0";
  const quietCls =
    "press inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-small font-semibold text-text-1 hover:bg-surface-2";
  const chevron = "size-5 text-text-3 rtl:-scale-x-100";
  return (
    <div
      ref={root}
      className="container-kb flex min-h-full flex-col pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <nav aria-label="Menu links">
        <ul className="divide-y divide-line border-b border-line">
          <li>
            <button
              type="button"
              aria-expanded={trades}
              aria-controls="phone-trades"
              onClick={() => setTrades((t) => !t)}
              className={cn(rowCls, "w-full text-start")}
            >
              <span>{TRADES_MENU_LABEL}</span>
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-5 text-text-3 transition-transform duration-200 ease-kb",
                  trades ? "-rotate-90" : "rotate-90",
                )}
              />
            </button>
            <div id="phone-trades" hidden={!trades}>
              {trades && <TradePhoneList onPick={close} />}
            </div>
          </li>
          {NAV_LINKS.map((n) => (
            <li key={n.to}>
              <SiteLink
                to={n.to}
                onClick={close}
                className={rowCls}
                activeClassName="[&>span]:underline [&>span]:decoration-2 [&>span]:underline-offset-8"
              >
                <span>{n.label}</span>
                <ChevronRight className={chevron} aria-hidden />
              </SiteLink>
            </li>
          ))}
          <li>{account(rowCls, <ChevronRight className={chevron} aria-hidden />)}</li>
        </ul>
      </nav>
      <div className="mt-6">
        <ButtonLink to="/scan" full onClick={close}>
          {MAIN_CTA}
        </ButtonLink>
        <TrialLine className="mt-2 text-center" />
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 border-t border-line pt-4">
        {/* Nora is always one tap away on a phone, even where the phone bar waits (Web 4 review). */}
        <button
          type="button"
          onClick={() => {
            close();
            window.dispatchEvent(new CustomEvent("kabsi:open-nora"));
          }}
          className={quietCls}
        >
          <MessageCircle className="size-5" aria-hidden />
          Ask Nora
        </button>
        {WHATSAPP_ON && (
          <>
            <span aria-hidden className="h-5 w-px bg-line-strong" />
            {/* The glyph labels the channel beside the word, on a link that opens Kabsi's WhatsApp (Meta's rules). */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              onClick={close}
              className={quietCls}
            >
              <WhatsAppGlyph className="size-5" />
              WhatsApp
            </a>
          </>
        )}
      </div>
    </div>
  );
}

type PanelProps = Parameters<typeof TradeMenuPanel>[0];
type PhoneProps = Parameters<typeof PhoneMenuBody>[0];

/** The one export the header loads (one lazy wrapper in the first-load code, not two). */
export default function HeaderPart(
  p: ({ phone: true } & PhoneProps) | ({ phone?: false } & PanelProps),
) {
  return p.phone ? <PhoneMenuBody {...p} /> : <TradeMenuPanel {...p} />;
}

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExampleBadge } from "./ui";
import { MAP_CREDIT, MAP_LEGEND, MapGrid, MapLegend } from "./map";
import {
  NEARBY_SAMPLE,
  SALON_CHECK,
  countLine,
  ordinal,
  positionLine,
  rankBand,
  type NearbyCheck,
  type NearbyPlace,
  type RankBand,
} from "./map-data";

/*
 * The nearby check (master plan 30.15 section 2, brief section 14.6): three checked places as cards (the place, your
 * position, who came first), one count from every checked place, the search, the date and the sample line. A, B and
 * C link each card to a small drawing (30.16 section 5). The 7 by 7 dots wait behind "Detailed results".
 *
 * One component for the website (`variant="page"`) and for the image Kabsi sends on WhatsApp (`variant="image"`).
 * Design 3 builds the 1080 px WhatsApp image from the image variant. It always sits on its own light ground.
 */

const letterFill: Record<RankBand, { fill: string; text: string; ring?: string }> = {
  top: { fill: "var(--map-rank-top)", text: "var(--kb-white)" },
  mid: { fill: "var(--map-rank-mid)", text: "var(--kb-ink)" },
  low: { fill: "var(--map-rank-low)", text: "var(--kb-ink)", ring: "var(--kb-amber)" },
  none: { fill: "var(--map-rank-none)", text: "var(--kb-white)" },
};

const chipCls: Record<RankBand, string> = {
  top: "bg-map-top text-kb-white",
  mid: "bg-map-mid text-kb-ink",
  low: "bg-map-low text-kb-ink ring-2 ring-inset ring-kb-amber",
  none: "bg-map-none text-kb-white",
};

/** Grid point (0 to 48) to a spot in the drawing. */
function xy(point: number) {
  const r = Math.floor(point / 7);
  const c = point % 7;
  return { x: 28 + c * 37.33, y: 16 + r * 20 };
}

/** A small drawing of our own, never a real street plan: the business, the three places, a station and a park. */
export function NearbySketch({
  check = SALON_CHECK,
  className,
}: {
  check?: NearbyCheck | undefined;
  className?: string | undefined;
}) {
  const home = xy(24);
  const station = check.landmarks?.station;
  const park = check.landmarks?.park;
  const label = `A small drawing of the places Kabsi checked. ${check.places
    .map((p) => `${p.letter}, ${p.name.toLowerCase()}, ${p.where}`)
    .join(". ")}.`;
  return (
    <svg
      viewBox="0 0 280 152"
      role="img"
      aria-label={label}
      className={cn("block w-full", className)}
    >
      <rect width="280" height="152" fill="var(--map-ground)" />
      {park !== undefined && (
        <rect
          x={xy(park).x - 34}
          y={xy(park).y - 26}
          width="68"
          height="40"
          rx="10"
          fill="var(--map-rank-mid)"
          opacity="0.28"
        />
      )}
      <g stroke="var(--map-street)" strokeLinecap="round" fill="none">
        <path d="M0 76 C 80 70, 180 82, 280 74" strokeWidth="9" />
        <path d="M140 0 C 132 50, 150 104, 138 152" strokeWidth="7" />
        <path d="M0 34 L280 38" strokeWidth="4" />
        <path d="M0 116 L280 112" strokeWidth="4" />
        <path d="M66 0 L70 152" strokeWidth="4" />
        <path d="M212 0 L208 152" strokeWidth="4" />
      </g>
      {station !== undefined && (
        <g aria-hidden="true">
          <path
            d={`M${xy(station).x + 18} 0 L${xy(station).x + 18} 152`}
            stroke="var(--kb-stone)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <rect
            x={xy(station).x + 10}
            y={xy(station).y - 30}
            width="16"
            height="12"
            rx="3"
            fill="var(--kb-stone)"
          />
        </g>
      )}
      {/* A dotted line from the business to each other place: the same search, from a different spot. */}
      {check.places
        .filter((p) => p.point !== 24)
        .map((p) => (
          <path
            key={p.letter}
            d={`M${home.x} ${home.y} L${xy(p.point).x} ${xy(p.point).y}`}
            stroke="var(--kb-stone)"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
        ))}
      {check.places.map((p) => {
        const s = xy(p.point);
        const f = letterFill[rankBand(p.rank)];
        return (
          <g key={p.letter}>
            <circle
              cx={s.x}
              cy={s.y}
              r="12"
              fill={f.fill}
              stroke={f.ring ?? "var(--kb-white)"}
              strokeWidth={f.ring ? 2.5 : 2}
            />
            <text
              x={s.x}
              y={s.y + 4.5}
              textAnchor="middle"
              fontSize="13"
              fontWeight="800"
              fill={f.text}
              className="font-sans"
            >
              {p.letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LetterDot({ place, small }: { place: NearbyPlace; small?: boolean | undefined }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-extrabold",
        small ? "size-6 text-chat-meta" : "size-8 text-small",
        chipCls[rankBand(place.rank)],
      )}
    >
      {place.letter}
    </span>
  );
}

function RankChip({ rank, small }: { rank: number; small?: boolean | undefined }) {
  const band = rankBand(rank);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-extrabold tabular-nums",
        small ? "h-6 min-w-9 px-2 text-chat-meta" : "h-8 min-w-12 px-3 text-small",
        chipCls[band],
      )}
    >
      {band === "none" ? "20+" : ordinal(rank)}
    </span>
  );
}

function PlaceRow({
  place,
  business,
  small,
}: {
  place: NearbyPlace;
  business: string;
  small?: boolean | undefined;
}) {
  const youFirst = place.first === business;
  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start border-t border-kb-ink/10",
        small ? "gap-2 py-2" : "gap-3 py-3.5",
      )}
    >
      <LetterDot place={place} small={small} />
      <div className={cn("min-w-0", small ? "text-chat" : "text-small")}>
        <p className="font-bold text-kb-ink">{place.name}</p>
        <p className="text-kb-ink">{youFirst ? "You came first." : positionLine(place.rank)}</p>
        {!youFirst && <p className="text-kb-stone">{place.first} came first.</p>}
      </div>
      <RankChip rank={place.rank} small={small} />
    </li>
  );
}

/** The nearby check. `page` on the website, `image` inside a WhatsApp bubble (and Design 3's 1080 px image). */
export function NearbyPlaces({
  check = SALON_CHECK,
  variant = "page",
  example = true,
  details = true,
  title = "h3",
  className,
  sketchClassName,
}: {
  check?: NearbyCheck | undefined;
  variant?: "page" | "image";
  /** Every product example carries the badge; a real check in kabsi-canvas does not. */
  example?: boolean | undefined;
  /** Show the 7 by 7 dots behind "Detailed results" (page only). */
  details?: boolean | undefined;
  title?: "h2" | "h3" | "p";
  className?: string | undefined;
  /** Hides or sizes the drawn map, for example "hidden sm:block" where a phone shows only the places (Design 6). */
  sketchClassName?: string | undefined;
}) {
  const img = variant === "image";
  const T = title;
  return (
    <figure
      className={cn(
        "bg-kb-white text-kb-ink",
        img ? "p-2.5" : "rounded-panel p-4 shadow-lift sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <T
            className={cn(
              "font-display font-bold text-kb-ink",
              img ? "text-chat leading-snug" : "text-title",
            )}
          >
            '{check.keyword}' around {check.business}
          </T>
          <p className={cn("mt-0.5 text-kb-stone", img ? "text-chat-meta" : "text-small")}>
            Searched on Google Maps, {check.date}
          </p>
        </div>
        {example && !img && <ExampleBadge className="shrink-0" />}
      </div>

      <NearbySketch
        check={check}
        className={cn(
          "overflow-hidden",
          img ? "mt-2 rounded-[0.25rem]" : "mt-4 rounded-inner",
          sketchClassName,
        )}
      />

      <ul className={cn(img ? "mt-1" : "mt-2")}>
        {check.places.map((p) => (
          <PlaceRow key={p.letter} place={p} business={check.business} small={img} />
        ))}
      </ul>

      <figcaption
        className={cn(
          "border-t border-kb-ink/10",
          img ? "pt-2 text-chat-meta leading-snug" : "pt-3.5",
        )}
      >
        <p className={cn("font-bold text-kb-ink", img ? "text-chat" : "text-body")}>
          {countLine(check.ranks)}
        </p>
        <p className={cn("text-kb-stone", img ? "mt-1" : "mt-1 text-small")}>{NEARBY_SAMPLE}</p>
        <p className={cn("font-semibold text-kb-stone", img ? "mt-0.5" : "mt-1 text-label")}>
          {MAP_CREDIT}
        </p>
      </figcaption>

      {!img && details && (
        <details className="group mt-3 border-t border-kb-ink/10 pt-1">
          <summary className="press flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-inner text-small font-bold text-kb-ink [&::-webkit-details-marker]:hidden">
            Detailed results
            <ChevronDown
              className="size-5 transition-transform duration-200 ease-kb group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="pt-2 pb-1">
            <MapGrid ranks={check.ranks} keyword={check.keyword} business={check.business} />
            <MapLegend className="mt-4" />
            <p className="mt-3 text-small text-kb-stone">{MAP_LEGEND}</p>
          </div>
        </details>
      )}
    </figure>
  );
}

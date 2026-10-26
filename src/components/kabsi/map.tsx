import { TrainFront } from "lucide-react";
import { cn } from "@/lib/utils";
import { KabsiMark } from "./ui";
import { BAND_LABEL, MAP_CENTER, MAP_RANKS, countBands, rankBand, type RankBand } from "./map-data";
import { useInView } from "./use-in-view";

export const MAP_LEGEND =
  "Each dot is a place near you where Kabsi searched like a customer. The number is where you came up. 1 is first.";
export const MAP_CREDIT = "Kabsi rank check, not provided by Google.";

const bandCls: Record<RankBand, string> = {
  top: "bg-map-top text-kb-white",
  mid: "bg-map-mid text-kb-ink",
  low: "bg-map-low text-kb-ink ring-2 ring-inset ring-kb-amber",
  none: "bg-map-none text-kb-white",
};

/** One dot. The rank is printed in every dot; colour is never the only signal. */
export function RankDot({
  rank,
  size = "md",
  className,
}: {
  rank: number;
  size?: "sm" | "md" | "xs" | "img";
  className?: string | undefined;
}) {
  const band = rankBand(rank);
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full font-sans font-extrabold tabular-nums leading-none",
        size === "md" && "size-7 text-label sm:size-9 sm:text-small",
        size === "md" && band === "none" && "tracking-[-0.04em] sm:text-label",
        size === "sm" && "size-5.5 text-[0.6875rem]",
        size === "xs" && "size-5 text-[0.625rem]",
        size === "img" && "size-5.5 text-[0.6875rem]",
        size !== "md" && band === "none" && "text-[0.5625rem] tracking-[-0.04em]",
        bandCls[band],
        className,
      )}
    >
      {band === "none" ? "20+" : rank}
    </span>
  );
}

/** Our own quiet street plan: blocks, two avenues, a canal and the station east of the shop. */
function Streets() {
  return (
    <svg
      viewBox="0 0 280 280"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <rect width="280" height="280" fill="var(--map-ground)" />
      <path
        d="M-10 236 C 60 222, 120 252, 190 238 S 290 226, 290 226 L290 290 L-10 290 Z"
        fill="var(--map-water)"
      />
      <g fill="var(--map-block)">
        {[0, 1, 2, 3, 4].map((r) =>
          [0, 1, 2, 3, 4].map((c) => (
            <rect key={`${r}-${c}`} x={6 + c * 56} y={6 + r * 46} width="44" height="36" rx="5" />
          )),
        )}
      </g>
      <g stroke="var(--map-street)" fill="none" strokeLinecap="round">
        <path d="M0 132 C 90 124, 180 146, 280 136" strokeWidth="10" />
        <path d="M150 0 C 140 80, 162 170, 148 280" strokeWidth="8" />
        <path d="M0 48 L280 52" strokeWidth="4" />
        <path d="M0 94 L280 90" strokeWidth="4" />
        <path d="M0 184 L280 180" strokeWidth="4" />
        <path d="M54 0 L58 280" strokeWidth="4" />
        <path d="M106 0 L102 280" strokeWidth="4" />
        <path d="M206 0 L210 280" strokeWidth="4" />
        <path d="M258 0 L254 280" strokeWidth="4" />
      </g>
    </svg>
  );
}

/**
 * The map: 7 by 7 places, always complete, the business in the middle as the Kabsi mark.
 * `play` fills it in dot by dot once (about 1.2 s). Without it the map shows complete.
 */
export function MapGrid({
  ranks = MAP_RANKS,
  keyword = "bakery",
  business = "Corner Bakery",
  size = "md",
  play = false,
  searching = false,
  className,
}: {
  ranks?: number[] | undefined;
  keyword?: string | undefined;
  business?: string | undefined;
  size?: "md" | "sm" | "xs" | "img";
  play?: boolean | undefined;
  searching?: boolean | undefined;
  className?: string | undefined;
}) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const c = countBands(ranks);
  const label = searching
    ? `Map of 49 places around ${business}. Kabsi is still searching.`
    : `Map of 49 places around ${business} for '${keyword}'. You came up in the top 3 from ${c.top} of them, 4 to 10 from ${c.mid}, 11 to 20 from ${c.low}, and not in the top 20 from ${c.none}.`;
  const small = size !== "md";
  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn(
        "relative aspect-square w-full overflow-hidden",
        small ? "rounded-inner" : "rounded-card",
        className,
      )}
    >
      <Streets />
      {!small && (
        <span
          aria-hidden
          className="absolute end-[14.28%] top-1/2 z-10 hidden size-6 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-kb-white text-kb-ink shadow-rest sm:grid rtl:-translate-x-1/2"
        >
          <TrainFront className="size-3.5" strokeWidth={2} />
        </span>
      )}
      <div
        className={cn(
          "relative grid size-full grid-cols-7 grid-rows-7",
          size === "img" ? "p-0.5" : small ? "p-1" : "p-1.5 sm:p-2",
        )}
      >
        {ranks.map((r, i) => (
          <span
            key={i}
            className={cn("grid place-items-center", play && !seen && "opacity-0")}
            style={
              play && seen
                ? { animation: `kb-pop 260ms ${i * 24}ms var(--ease-kb) both` }
                : undefined
            }
          >
            {i === MAP_CENTER ? (
              <KabsiMark
                ring
                className={cn(
                  size === "md" && "size-8 sm:size-10",
                  size === "sm" && "size-6",
                  size === "xs" && "size-5",
                  size === "img" && "size-6",
                )}
              />
            ) : searching ? (
              <span
                className={cn("rounded-full bg-kb-ink/15", size === "md" ? "size-3" : "size-1.5")}
                style={{
                  animation: `kb-dot 1.6s ${(i % 7) * 0.12 + Math.floor(i / 7) * 0.05}s var(--ease-kb) infinite`,
                }}
              />
            ) : (
              <RankDot rank={r} size={size} />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MapLegend({
  className,
  dark = false,
}: {
  className?: string | undefined;
  dark?: boolean;
}) {
  const sample: Record<RankBand, number> = { top: 1, mid: 6, low: 14, none: 0 };
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-2", className)}>
      {(Object.keys(sample) as RankBand[]).map((b) => (
        <li
          key={b}
          className={cn(
            "flex items-center gap-2 text-label font-semibold",
            dark ? "text-text-2" : "text-kb-stone",
          )}
        >
          <RankDot rank={sample[b]} size="sm" />
          {BAND_LABEL[b]}
        </li>
      ))}
    </ul>
  );
}

/** Map with its words: legend, explanation and credit. Always on its own light card. */
export function MapCard({
  ranks,
  keyword = "bakery",
  business = "Corner Bakery",
  play,
  searching,
  header,
  className,
}: {
  ranks?: number[] | undefined;
  keyword?: string | undefined;
  business?: string | undefined;
  play?: boolean | undefined;
  searching?: boolean | undefined;
  header?: React.ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <figure
      className={cn("rounded-panel bg-kb-white p-3 text-kb-ink shadow-lift sm:p-4", className)}
    >
      {header}
      <MapGrid
        ranks={ranks}
        keyword={keyword}
        business={business}
        play={play}
        searching={searching}
      />
      <figcaption className="px-1 pt-4 pb-1">
        {!searching && <MapLegend />}
        <p className="mt-3 text-small text-kb-stone">{MAP_LEGEND}</p>
        <p className="mt-1.5 text-label font-semibold text-kb-stone">{MAP_CREDIT}</p>
      </figcaption>
    </figure>
  );
}

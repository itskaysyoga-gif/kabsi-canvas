import type { DailyPoint } from "@/lib/insights";

// One simple chart style (dataviz): bars for a count per day, one colour, a single axis, no dual scale. The bars sit
// on a baseline with rounded tops; the highest day is named in the label, and the table below the charts has every
// value, so nothing is carried by the bars alone.
const W = 300;
const H = 72;
const GAP = 2;

export function DailyChart({
  title,
  points,
  pick,
}: {
  title: string;
  points: DailyPoint[];
  pick: (p: DailyPoint) => number;
}) {
  const values = points.map(pick);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const high = values.indexOf(Math.max(...values, 0));
  const bar = points.length ? (W - GAP * (points.length - 1)) / points.length : 0;
  return (
    <figure className="rounded-card bg-kb-sand p-4">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-kb-stone">{total} in all</span>
      </figcaption>
      {points.length === 0 ? (
        <p className="mt-2 text-sm text-kb-stone">No days to show yet.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-3 h-20 w-full"
          role="img"
          aria-label={`${title} each day. ${
            total === 0 ? "None in this period." : `Most on ${points[high]!.date}: ${values[high]}.`
          }`}
          preserveAspectRatio="none"
        >
          <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="stroke-kb-hairline" />
          {values.map((v, i) => {
            const h = v === 0 ? 0 : Math.max(2, (v / max) * (H - 4));
            return (
              <rect
                key={points[i]!.date}
                x={i * (bar + GAP)}
                y={H - 1 - h}
                width={bar}
                height={h}
                rx={Math.min(3, bar / 2)}
                className="fill-kb-black"
              />
            );
          })}
        </svg>
      )}
    </figure>
  );
}

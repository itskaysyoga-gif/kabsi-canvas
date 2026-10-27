import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthCells } from "@/lib/hours-format";

// A month of special hours and public holidays (P0.5-03). Owners see at a glance which days Google already shows
// different hours for, and which public holidays are coming. Plain dates in, no network.
export type CalendarEntry = {
  start: string;
  end: string;
  label: string;
};
export type CalendarHoliday = { date: string; name: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export function HoursCalendar({
  entries,
  holidays,
  today,
}: {
  entries: CalendarEntry[];
  holidays: CalendarHoliday[];
  today: string;
}) {
  const [y0, m0] = today.split("-").map(Number) as [number, number];
  const [view, setView] = useState({ year: y0, month: m0 - 1 });
  const [picked, setPicked] = useState<string | null>(null);
  const cells = monthCells(view.year, view.month);
  const move = (by: number) => {
    const d = new Date(view.year, view.month + by, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setPicked(null);
  };
  const special = (date: string) => entries.filter((e) => e.start <= date && date <= e.end);
  const holiday = (date: string) => holidays.filter((h) => h.date === date);
  const detail = picked
    ? [...special(picked).map((e) => e.label), ...holiday(picked).map((h) => h.name)]
    : [];

  return (
    <section className="mt-10" aria-label="Calendar">
      <div className="flex items-center justify-between">
        <h2 className="text-title font-bold">{MONTH.format(new Date(view.year, view.month, 1))}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => move(-1)}
            className="grid size-10 place-items-center rounded-card hover:bg-surface-2"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => move(1)}
            className="grid size-10 place-items-center rounded-card hover:bg-surface-2"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-label font-bold text-text-2">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const date = iso(view.year, view.month, d);
          const sp = special(date).length > 0,
            ho = holiday(date).length > 0;
          return (
            <button
              key={date}
              type="button"
              aria-pressed={picked === date}
              aria-label={`${d} ${MONTH.format(new Date(view.year, view.month, 1))}${sp ? ", special hours" : ""}${ho ? ", public holiday" : ""}`}
              onClick={() => setPicked(picked === date ? null : date)}
              className={`flex h-12 flex-col items-center justify-center rounded-card border text-small ${
                date === today ? "border-text-1" : "border-transparent"
              } ${picked === date ? "bg-surface-2" : "bg-surface-1"} shadow-rest`}
            >
              <span className={date === today ? "font-bold" : ""}>{d}</span>
              <span className="mt-0.5 flex h-1.5 gap-1" aria-hidden="true">
                {sp ? <span className="size-1.5 rounded-full bg-kb-black" /> : null}
                {ho ? <span className="size-1.5 rounded-full bg-warn" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 text-label text-text-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-kb-black" aria-hidden="true" /> Special hours
          set
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-warn" aria-hidden="true" /> Public holiday
        </span>
      </p>
      {picked ? (
        <p className="mt-3 rounded-card bg-surface-2 p-3 text-small" role="status">
          {detail.length ? detail.join(". ") : "Nothing special on this day."}
        </p>
      ) : null}
    </section>
  );
}

// Dates and times as the Hours screen shows them (P0.5-03). Local dates, never UTC: in the evening in the Americas UTC
// is already tomorrow.
import { fmtDay } from "@/lib/format";

export const fmt = (d: string) => fmtDay(d);
export const range = (r: { start_date: string; end_date: string }) =>
  r.start_date === r.end_date ? fmt(r.start_date) : `${fmt(r.start_date)} to ${fmt(r.end_date)}`;
// "18:00" becomes "6:00 PM" or "18:00", following the owner's own device settings.
export const clock = (t: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h ?? 0, m ?? 0).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};
export const times = (r: {
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
}) => (r.closed ? "Closed" : `${clock(r.open_time)} to ${clock(r.close_time)}`);

/** Today as a local date, not UTC: in the evening in the Americas UTC is already tomorrow. */
export const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

/** Days of the month as cells, Monday first: leading blanks, then 1 to the last day. */
export function monthCells(year: number, month: number): (number | null)[] {
  const first = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

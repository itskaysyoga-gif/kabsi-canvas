// One date style across the app: day, month name, year ("27 Sept 2026"). Month names are clear in every
// country, unlike 9/10/2026. Times follow the owner's device (12 or 24 hour).
const D = "en-GB";

export function fmtDate(value: string | number | Date | null | undefined, withYear = true) {
  if (value == null || value === "") return "";
  const d =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
  return d.toLocaleDateString(D, {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function fmtDay(value: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return d.toLocaleDateString(D, { weekday: "short", day: "numeric", month: "short" });
}

export function fmtDateTime(value: string | number | Date | null | undefined) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString(D, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time}`;
}

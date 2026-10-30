// The staff evidence log (master plan 30.19 section 3 item 3): one row per observation, with the business, the date, the source,
// a type and the owner's own words where there are some. Staff only; kept 24 months. This file holds the words of the choices and
// the CSV export.
export const EVIDENCE_SOURCES = [
  ["call", "Call"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
  ["nora", "Nora"],
  ["meeting", "Meeting"],
  ["other", "Other"],
] as const;

export const EVIDENCE_TYPES = [
  ["request", "Asked for something Kabsi does not do"],
  ["repeated_problem", "Repeated problem"],
  ["time_saved", "Time saved"],
  ["missed_enquiry", "Missed enquiry or sale"],
  ["support_given", "Support given"],
] as const;

export type EvidenceRow = {
  id: string;
  location_id: string | null;
  business_name: string | null;
  observed_on: string;
  source: string;
  type: string;
  words: string | null;
  created_at: string;
};

export const sourceLabel = (v: string) => EVIDENCE_SOURCES.find(([k]) => k === v)?.[1] ?? v;
export const typeLabel = (v: string) => EVIDENCE_TYPES.find(([k]) => k === v)?.[1] ?? v;

/** One CSV cell: quoted, quotes doubled, and a leading = + - @ tab or return neutralised so a spreadsheet never runs an owner's words. */
export function csvCell(value: string | null | undefined): string {
  let s = value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** The whole log as CSV (CRLF lines, with a header). `names` maps a business id to its name. */
export function evidenceCsv(rows: EvidenceRow[], names: Record<string, string>): string {
  const head = ["Date", "Business", "Source", "Type", "Owner's words", "Written on"];
  const lines = rows.map((r) =>
    [
      r.observed_on,
      r.business_name ?? (r.location_id ? (names[r.location_id] ?? "") : ""),
      sourceLabel(r.source),
      typeLabel(r.type),
      r.words ?? "",
      r.created_at.slice(0, 10),
    ]
      .map(csvCell)
      .join(","),
  );
  return [head.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}

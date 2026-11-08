// What every normalizer returns. A value is only ever "ok" when code checked it. A value that fails its check is
// "unknown" and carries no guess; two readings that cannot be told apart are "ambiguous" with every candidate listed.
export type Evidence = { raw: string; start: number; end: number };

export type Normalized<T> =
  | ({ status: "ok"; value: T; version: number } & Evidence)
  | { status: "ambiguous"; candidates: { value: T; raw: string; start: number; end: number }[]; version: number }
  | { status: "unknown"; reason: string; version: number };

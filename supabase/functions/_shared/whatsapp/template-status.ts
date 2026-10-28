// The stored status of Kabsi's templates (WhatsApp 2): the staff ops and the hourly health check write Meta's status by
// name to app_settings (templates.ts TEMPLATE_STATUS_KEY); the sender reads it here, with a short cache, to decide
// whether a v2 name may be used. Any failure reads as "nothing approved yet", so the first names stay the fallback.
import { TEMPLATE_STATUS_KEY } from "./templates.ts";

export { TEMPLATE_STATUS_KEY };
export type StatusMap = Record<string, string>;

const TTL_MS = 300_000;

export function parseStatuses(raw: string | null | undefined): StatusMap {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return Object.fromEntries(Object.entries(v && typeof v === "object" ? v : {}).filter(([, s]) => typeof s === "string")) as StatusMap;
  } catch {
    return {};
  }
}

/** A reader with a five minute cache. `read` returns the stored text (or null); `now` is injected for tests. */
export function statusLoader(read: () => Promise<string | null>, now: () => number = Date.now) {
  let cache: { at: number; map: StatusMap } | null = null;
  return async (): Promise<StatusMap> => {
    if (cache && now() - cache.at < TTL_MS) return cache.map;
    const map = await read().then(parseStatuses, () => ({} as StatusMap));
    cache = { at: now(), map };
    return map;
  };
}

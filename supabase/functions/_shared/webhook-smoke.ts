// Polish 4 part C (master plan 30.25 item 5): the smoke test's forged webhook calls (tests/e2e/smoke.spec.ts, "the doors
// that must stay shut stay shut") carry the header x-kabsi-smoke: 1. The header is a label for counting and nothing else:
// it never lets a call in, it never changes the answer. A refusal that carries it is counted as smoke_401 in
// public.webhook_rejections, and the staff alert on bad signatures ignores up to 20 of them an hour, so a smoke run no
// longer wakes the staff phone while a flood that only claims to be the smoke test still does.
// Pure: no database here; the limiter is passed in (rateLimit in kabsi.ts in production, a stub in the tests).

export const SMOKE_HEADER = "x-kabsi-smoke";
/** Smoke-tagged refusals an hour that the alert ignores; the 21st and every one after it count like any other. */
export const SMOKE_FREE_PER_HOUR = 20;
const HOUR = 3600;

/** True when the call says it is the smoke test. A label only: never trusted to let anything in. */
export function isSmoke(headers: Headers): boolean {
  return headers.get(SMOKE_HEADER)?.trim() === "1";
}

/** The reason stored in webhook_rejections (check ^[a-z0-9_]{1,40}$): smoke_401 for a tagged 401, status_<n> otherwise. */
export function rejectionReason(status: number, smoke: boolean): string {
  return smoke && status === 401 ? "smoke_401" : `status_${status}`;
}

/** The refusals in an hour that count toward the alert: every untagged one, and the tagged ones above 20. */
export function alertCount(untagged: number, smoke: number): number {
  return Math.max(0, untagged) + Math.max(0, smoke - SMOKE_FREE_PER_HOUR);
}

/** hit_rate_limit: counts one hit on the key and answers true while the hits in the window are at most max. */
export type Limit = (key: string, max: number, windowSeconds: number) => Promise<boolean>;

/**
 * One refused call: true when it should raise the staff alert (more than `max` counted refusals in the hour).
 * A tagged refusal first spends one of the 20 free smoke hits; while any are left it is not counted. Beyond them it
 * counts like an untagged one, so the alert fires when alertCount(untagged, smoke) passes `max`.
 */
export async function refusalAlertDue(
  smoke: boolean,
  limit: Limit,
  keys: { counted: string; smoke: string },
  max: number,
): Promise<boolean> {
  if (smoke && (await limit(keys.smoke, SMOKE_FREE_PER_HOUR, HOUR))) return false;
  return !(await limit(keys.counted, max, HOUR));
}

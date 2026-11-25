// FIX-5: the bot check never leaves a dead button. Framework free, so a test can prove each state.
//
// A button that needs a Cloudflare Turnstile token is never greyed out without a word. It is active as soon as the form
// is valid. If the token is not ready on the tap, the button says "Checking your connection" with a spinner and sends
// the moment the token arrives. If no token comes in 15 seconds, the form says so and offers Try again.

/** No token and no click asked for within this long means the check is not going to finish on its own. */
export const BOT_CHECK_WAIT_MS = 15_000;

/** The label of a button that is waiting for the check (COPY.md 41). */
export const CHECKING_LINE = "Checking your connection";
/** One line above Cloudflare's box when it needs a tap (COPY.md 41). */
export const INTERACTIVE_HINT = "Tap the box to confirm you are a person";
/** When no token arrived in 15 seconds; "Try again" is the button after it (COPY.md 41). */
export const SLOW_LINE = "This is taking longer than usual.";
/** When Cloudflare reported an error (the older line, COPY.md 39). */
export const ERROR_LINE = "We could not check your browser.";

export type BotCheckOutcome = "passed" | "interactive" | "failed" | "timed_out";
export type BotCheckSurface = "login" | "free_check" | "search_box" | "other";

/** Which outcome a finished check counts as. `interactive` wins over `passed` when the box had to be shown. */
export function botCheckOutcome(o: {
  token: boolean;
  wasInteractive: boolean;
  timedOut?: boolean;
}): BotCheckOutcome {
  if (o.token) return o.wasInteractive ? "interactive" : "passed";
  return o.timedOut ? "timed_out" : "failed";
}

/** Milliseconds from start to end, a whole number, never negative. */
export function elapsedMs(startMs: number, endMs: number): number {
  return Math.max(0, Math.round(endMs - startMs));
}

/** What the sign-in or free check button shows. It is never disabled without a label that says why. */
export type SendButtonState = {
  /** The button shows the spinner. A button with the spinner takes no second tap. */
  loading: boolean;
  /** The words on the button. */
  label: string;
  /** True only while the check is being waited for, for the screen reader line. */
  waiting: boolean;
};

export function sendButtonState(o: {
  /** The request is on its way. */
  busy: boolean;
  /** The visitor tapped and the token is not ready: send when it arrives. */
  waiting: boolean;
  /** The button's own words ("Send me a code"). */
  label: string;
}): SendButtonState {
  if (o.waiting && !o.busy) return { loading: true, label: CHECKING_LINE, waiting: true };
  return { loading: o.busy, label: o.label, waiting: false };
}

/**
 * Whether a tap should send now, wait, or be refused. `valid` is whether the form's own fields are right.
 *   - invalid: the form shows its own field error (the button was never dead, it answers).
 *   - ready: a token is in hand, send.
 *   - wait: no token yet, show "Checking your connection" and send when it arrives.
 */
export function tapAction(o: { valid: boolean; hasToken: boolean }): "invalid" | "ready" | "wait" {
  if (!o.valid) return "invalid";
  return o.hasToken ? "ready" : "wait";
}

/** Thrown when a call needs a token and none came in 15 seconds: the screen shows SLOW_LINE and Try again. */
export class BotCheckTimeout extends Error {
  constructor() {
    super(SLOW_LINE);
    this.name = "BotCheckTimeout";
  }
}

/** A token or the timeout. A call never goes out with an empty token it was going to be refused for. */
export function requireToken(token: string): string {
  if (!token) throw new BotCheckTimeout();
  return token;
}

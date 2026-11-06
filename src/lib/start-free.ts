// Launch 2 part C (master plan 30.36 item 8): one door to sign-up. "Start free" on Pricing and in the guides goes to sign
// in and then /start, where the business is chosen once (or arrives picked from a saved free check). A visitor goes to
// /login?next=/start; a signed-in owner without a business to /start; one with a business to /app (the rule /login already
// follows for a sign-in without next, App 4). While the account is not read yet the visitor's door is used.
export type StartFreeDoor = { to: "/login" | "/start" | "/app"; search?: { next: "/start" } };

export function startFreeDoor(
  state: "in" | "out" | "unknown",
  businesses: number | null,
): StartFreeDoor {
  if (state !== "in") return { to: "/login", search: { next: "/start" } };
  if (businesses === 0) return { to: "/start" };
  return { to: "/app" };
}

/** The door as one address, for plain links and tests. */
export const startFreeHref = (d: StartFreeDoor) =>
  d.search ? `${d.to}?next=${d.search.next}` : d.to;

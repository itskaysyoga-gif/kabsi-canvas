// What a delivery status from Meta does to the outbox row of that message (Ops 1). Pure: the webhook applies it.
// A held row is a message waiting for the person to write: its template went out (so Meta reports a status for that
// provider id) but the full text did not. Until Ops 1 the status turned the row into "sent", release() (which finds only
// rows in state held) never saw it again, and the full text of 18 staff alerts and digests never reached the staff phone.
// So a status touches only rows already sent, and only a failure changes them.
export type OutboxStatusUpdate = { set: { state: "failed"; error: string | null }; whereStates: string[] };

export function outboxStatusUpdate(status: string, error: string | null | undefined): OutboxStatusUpdate | null {
  if (status !== "failed") return null;
  return { set: { state: "failed", error: error ?? null }, whereStates: ["sent"] };
}

// Tidy 1 (R-143 item 3, master plan 30.47): card checkout is offered only to a business whose Google access works.
// "Works" is the one test private.start_trial uses before it starts a trial: a connection in state granted, Google shows
// the profile as verified (voice_of_merchant), the access time is set and the Google location is known. Pure, so the
// tests drive it with rows and billing.ts reads the rows. Nothing here touches Creem or the database.

export type AccessRow = {
  is_demo?: boolean | null;
  concierge?: boolean | null;
  google_location_id?: string | null;
  access_granted_at?: string | null;
  access_state?: string | null;
  voice_of_merchant?: boolean | null;
};

/** True when at least one of the business's locations has working Google access (a demo or concierge location never does). */
export function accessWorks(rows: readonly AccessRow[]): boolean {
  return rows.some(
    (r) =>
      !r.is_demo &&
      !r.concierge &&
      !!r.google_location_id &&
      !!r.access_granted_at &&
      r.access_state === "granted" &&
      r.voice_of_merchant === true,
  );
}

/** What an owner reads when they try to choose a plan before Kabsi's access works. */
export const ACCESS_FIRST_LINE =
  "You can choose a plan once Kabsi's access to your Google profile works. Nothing is charged before then.";

// Scan 2 (master plan 30.29 item B): the words and shapes "Send me this report" shares between the visibility engine
// (free-check.ts, which builds the parts) and the profile check (profile-snapshot.ts, which sends them). No imports, so
// the website's tests can load the profile check without the map engine.

/** A free check's code: 8 letters and digits from newCode's alphabet (no 0, O, 1, I or L). */
export const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/;
export const NOT_PART = "The nearby search and the AI answer were not part of this check.";

/** What a sent report carries beyond Google, in the page's own words. */
export type ReportParts = { nearby: string[]; ai: string[]; link: string };

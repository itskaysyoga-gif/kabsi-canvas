// Sync 2a (R-142 item 3, master plan 30.46): the two lines every billing message uses while card payments are closed.
// Keep PAY_TODAY_LINE equal to PAY_TODAY_LINE in src/lib/site.ts (tests/sync2a.test.ts checks it). No other file in
// supabase/functions types these sentences.
export const PAY_TODAY_LINE = "Nothing to pay today. Card payments in US dollars are coming.";
/** What a plan that ended, paused or was cancelled leaves behind: nothing is deleted on a timer. */
export const ACCOUNT_STAYS_LINE = "Your account and its history stay. Ask us any time to delete them.";

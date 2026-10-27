// What Kabsi says after an owner's Yes, as the public pages show it (the hero phone, Home's "Try it"). Master plan 30.15 3.1:
// nothing says "Published" the moment after a Yes. These are the real lines of supabase/functions/_shared/task-close.ts
// (tests/after-yes.test.ts checks them against it); the chip is the pause between them.
export const APPROVED_LINE = "Approved. It goes to Google in 10 seconds. Reply Undo to stop it.";
export const LATER_CHIP = "A few minutes later";
/** The closing line for a reply Kabsi has seen on Google (task-close.ts outcomeLine, state confirmed, no link). */
export const doneLine = (business: string) => `${business}: Your reply is on Google. Done.`;

// Who the internal /email/test route may send to (Ops 1 part B, master plan 30.4). It used to send to hello@kabsi.co
// only. The inbox test also needs a mail-tester.com address and the team's own Gmail and Outlook addresses, for that
// test only. The route is internal (cron secret) and the recipient is checked here: hello@kabsi.co, a mail-tester.com
// address, or an address listed in app_settings.email_test_recipients (comma separated, set for the test and removed
// after it). Anyone else is refused, so a real owner can never get one of these.
export const TEST_HOME = "hello@kabsi.co";

export function isAllowedTestRecipient(address: string, listed: string): boolean {
  const a = address.trim().toLowerCase();
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(a)) return false;
  if (a === TEST_HOME) return true;
  const domain = a.slice(a.lastIndexOf("@") + 1);
  if (domain === "mail-tester.com" || domain.endsWith(".mail-tester.com")) return true;
  return listed
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(a);
}

// QA 1: before the run, turn each one-time code in the environment into a saved session (once per account). Runs that
// need no sign-in (the public pages, the smoke subset) set no code and skip this.
import { QA, saveSession, verifyCode, type Who } from "./helpers/auth";

export default async function globalSetup() {
  for (const who of Object.keys(QA) as Who[]) {
    const code = process.env[QA[who].env];
    if (!code) continue;
    saveSession(who, await verifyCode(QA[who].email, code));
  }
}

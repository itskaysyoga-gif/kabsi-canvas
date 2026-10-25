// QA 1: before the run, turn each one-time code in the environment into a saved session (once per account). Runs that
// need no sign-in (the public pages, the smoke subset) set no code and skip this. A code works once: when the same code is
// passed again the saved session from the first run is kept (and used while it lasts).
import { QA, savedSession, saveSession, verifyCode, type Who } from "./helpers/auth";

export default async function globalSetup() {
  for (const who of Object.keys(QA) as Who[]) {
    const code = process.env[QA[who].env];
    if (!code) continue;
    try {
      saveSession(who, await verifyCode(QA[who].email, code));
    } catch (e) {
      if (!savedSession(who)) throw e;
      console.log(`${QA[who].env}: the code was used already, keeping the saved session`);
    }
  }
}

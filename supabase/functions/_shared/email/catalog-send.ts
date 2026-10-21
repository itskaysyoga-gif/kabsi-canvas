// Sends one of each email type to one address (P0.4-08), for the internal /email/test route. The address is fixed by
// the caller in code, never read from a request, and the route only answers the internal secret, so a real owner can
// never get one of these. Each email is sent as what it really is (its category, so its footer and unsubscribe link are
// real); the dedupe key carries the run time so a second run sends again.
import { notify } from "../notify.ts";
import { catalog } from "./catalog.ts";

export async function sendCatalogTo(address: string): Promise<{ kind: string; sent: number }[]> {
  const run = new Date().toISOString().slice(0, 16);
  const out: { kind: string; sent: number }[] = [];
  for (const entry of catalog()) {
    const r = await notify({
      category: entry.category, kind: `test_${entry.kind}`.slice(0, 60), key: `email_test:${run}:${entry.kind}`, to: [{ email: address, userId: null }],
      content: entry.content,
    });
    out.push({ kind: entry.kind, sent: r.sent });
  }
  return out;
}

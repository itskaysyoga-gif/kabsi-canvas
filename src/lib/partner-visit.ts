// Partners 2 (master plan 30.50 item 6): one visit through a partner link (?via=P-CODE), counted once per visit for the
// partner home. Loaded only when such a link is opened, so no other page carries it. Only the code goes to Kabsi.
import { anonHeaders, supabaseUrl } from "@/lib/supabase-config";

export async function countPartnerVisit(code: string): Promise<void> {
  if (!/^P-[A-Z0-9]{3,20}$/.test(code)) return;
  try {
    const key = `kabsi_visit_${code}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    await fetch(`${supabaseUrl}/functions/v1/programs/partner/visit`, {
      method: "POST",
      headers: { "content-type": "application/json", ...anonHeaders },
      body: JSON.stringify({ code }),
      keepalive: true,
    });
  } catch {
    /* a visit that is not counted changes nothing for the visitor */
  }
}

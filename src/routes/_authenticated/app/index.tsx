import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

// /app → the inbox. A partner with no business of their own goes to the partner workspace instead.
export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: async () => {
    try {
      const { data: loc } = await supabase.from("locations").select("id").limit(1).maybeSingle();
      if (!loc) {
        const { data: partnerId } = await supabase.rpc("claim_partner_membership");
        if (partnerId) throw redirect({ to: "/partner" });
      }
    } catch (e) {
      if (isRedirect(e)) throw e;
    }
    throw redirect({ to: "/app/inbox" });
  },
});

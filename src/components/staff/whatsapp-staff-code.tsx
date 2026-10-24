// Staff: the one-time staff code for the WhatsApp agent (session 13b part 1, master plan 29.7). The code binds the phone
// that sends it to Kabsi's WhatsApp number as the staff phone (staff_admin): the ops commands, partner approvals and
// payout approval. It is shown once, works for 15 minutes, and only a signed-in staff member can make one.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function WhatsappStaffCode() {
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const make = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("whatsapp_staff_code");
      if (error) throw new Error(error.message);
      return String((data as { code: string }).code);
    },
    onSuccess: (c) => {
      setErr("");
      setCode(c);
    },
    onError: () => setErr("Couldn't make a code. Please try again."),
  });
  return (
    <section className="mt-8 rounded-card border border-kb-hairline p-4" data-testid="whatsapp-staff-code">
      <h2 className="text-xl font-bold">WhatsApp staff phone</h2>
      <p className="mt-1 text-sm leading-6 text-kb-stone">
        Make a code, then send it from the staff phone to Kabsi&apos;s WhatsApp number. That phone
        gets the staff commands. The code works once, for 15 minutes.
      </p>
      <Button
        variant="outline"
        className="mt-3 min-h-11"
        onClick={() => make.mutate()}
        disabled={make.isPending}
      >
        Make a staff code
      </Button>
      {code ? (
        <p className="mt-3 text-sm leading-6">
          Send this exactly: <b className="font-mono">{code}</b>
        </p>
      ) : null}
      <p className="mt-2 min-h-6 text-sm text-kb-red" role="status">
        {err}
      </p>
    </section>
  );
}

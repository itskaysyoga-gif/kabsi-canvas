import { useState } from "react";
import { Link2 } from "lucide-react";
import { Panel } from "@/components/kabsi/d3-account";
import { Button } from "@/components/kabsi/ui";
import { CopyButton } from "@/components/shared/copy-button";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/onboarding";
import { track } from "@/lib/telemetry";

// Placement links (PROOF-2, blueprint section 4): one short link for each place the owner already puts a link in a message their
// own system sends to every customer. Each has its own tap count, so the owner and the reports see which places get tapped.
// Kabsi sends nothing to customers and keeps no customer detail: a tap is a count on a link, never a person. It is an ordinary
// review link on go.kabsi.co (s=m, a link in a message), so it opens Google's review page for everyone, with no filtering.

export const PLACEMENTS = [
  {
    id: "booking",
    title: "Booking confirmation",
    hint: "In the confirmation your booking tool already sends.",
  },
  { id: "receipt", title: "Receipt", hint: "On the receipt or invoice you already give or send." },
  {
    id: "email_signature",
    title: "Email signature",
    hint: "At the end of the emails you already send.",
  },
  { id: "social_bio", title: "Social bio", hint: "In the bio of your social media page." },
] as const;
export type PlacementId = (typeof PLACEMENTS)[number]["id"];

export type PlacementCard = { code: string; placement: string | null; status: string };
export type PlacementTap = { code: string };

const goLink = (code: string) => `https://go.kabsi.co/${code}?s=m`;

export function PlacementLinks({
  locationId,
  cards,
  taps,
  onChanged,
}: {
  locationId: string;
  cards: PlacementCard[];
  /** Real taps in the last 30 days, bots left out, this business only. */
  taps: PlacementTap[];
  onChanged: () => unknown;
}) {
  const [busy, setBusy] = useState<PlacementId | "">("");
  const [msg, setMsg] = useState("");
  async function make(id: PlacementId) {
    setBusy(id);
    setMsg("");
    const { error } = await supabase.rpc("create_placement_link", {
      p_location: locationId,
      p_placement: id,
    });
    setBusy("");
    if (error) {
      setMsg(friendlyError(error));
      return;
    }
    track("card_activated", { source: `placement_${id}` });
    onChanged();
  }
  return (
    <Panel title="Where to put your link" id="placements" className="lg:col-span-2">
      <p className="text-body text-text-2">
        Paste a link once into a message your own system already sends to every customer. Each place
        gets its own link, so you can see which places get tapped.
      </p>
      <p className="mt-2 text-small text-text-2">
        Kabsi sends nothing to your customers and never sees who taps. The same link goes to
        everyone, with no reward and no question about how their visit went.
      </p>
      <ul className="mt-4 divide-y divide-line">
        {PLACEMENTS.map((p) => {
          const card = cards.find((c) => c.placement === p.id);
          const n = card ? taps.filter((t) => t.code === card.code).length : 0;
          return (
            <li key={p.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{p.title}</p>
                  <p className="text-small text-text-2">{p.hint}</p>
                </div>
                {card ? (
                  <CopyButton text={goLink(card.code)} label="Copy link" />
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    loading={busy === p.id}
                    disabled={!!busy}
                    onClick={() => void make(p.id)}
                    icon={<Link2 className="size-4" aria-hidden />}
                  >
                    Make this link
                  </Button>
                )}
              </div>
              {card ? (
                <>
                  <p dir="auto" className="mt-1 break-all text-small text-text-2">
                    {goLink(card.code)}
                  </p>
                  <p className="mt-1 text-small font-semibold">
                    {n} {n === 1 ? "tap" : "taps"} in the last 30 days
                  </p>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-small text-text-2">A tap is not a review.</p>
      {msg ? (
        <p className="mt-3 text-small text-bad" role="alert">
          {msg}
        </p>
      ) : null}
    </Panel>
  );
}

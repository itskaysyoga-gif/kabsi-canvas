import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** The business's place link: its first active review link (go.kabsi.co/CODE), or null when it has none. */
export function usePlaceLink(locationId: string | undefined) {
  return useQuery({
    queryKey: ["place-link", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cards")
        .select("code")
        .eq("location_id", locationId!)
        .eq("kind", "link")
        .eq("status", "active")
        .order("activated_at")
        .limit(1);
      const code = (data?.[0] as { code: string } | undefined)?.code;
      return code ? `https://go.kabsi.co/${code}` : null;
    },
  });
}

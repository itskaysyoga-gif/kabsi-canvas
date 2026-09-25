import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// D235: while Google access is pending, every Google write is simulated. Say so plainly on every app page.
export function TestModeBanner() {
  const mode = useQuery({
    queryKey: ["google-mode"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("google_mode");
      return error ? "live" : (data as string);
    },
    staleTime: 10 * 60_000,
  });
  if (mode.data !== "mock") return null;
  return (
    <div role="status" className="bg-kb-black px-4 py-2 text-center text-sm text-kb-white">
      Test mode: Kabsi isn't connected to Google yet. Nothing you post or save is sent to Google.
    </div>
  );
}

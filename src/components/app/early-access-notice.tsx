import { CONCIERGE_COPY } from "@/lib/concierge-copy";

// Early access (D267): while a person handles the Google steps by hand, only replies are live.
export function EarlyAccessNotice({ what }: { what: string }) {
  return (
    <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
      <p className="font-bold">{what} start once Kabsi connects to Google.</p>
      <p className="mt-1 text-sm leading-6 text-kb-stone">
        {CONCIERGE_COPY.profile} {CONCIERGE_COPY.banner}
      </p>
    </div>
  );
}

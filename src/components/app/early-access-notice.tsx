import { CONCIERGE_COPY } from "@/lib/concierge-copy";

// Early access (D267): while a person handles the Google steps by hand, only replies are live.
export function EarlyAccessNotice({ what }: { what: string }) {
  return (
    <div className="mt-7 rounded-panel bg-surface-1 p-6 shadow-rest">
      <p className="font-bold">{what} start once Kabsi connects to Google.</p>
      <p className="mt-1 text-small leading-6 text-text-2">
        {CONCIERGE_COPY.profile} {CONCIERGE_COPY.banner}
      </p>
    </div>
  );
}

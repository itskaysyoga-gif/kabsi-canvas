// The result of the free Profile Check on the homepage, directly under the hero (lane R, 22 Oct 2026). Loaded only when
// there is a result, so the snapshot, checklist and sign-up code stay out of the first load.
import { useEffect, useRef } from "react";
import { Eyebrow, Section } from "@/components/marketing/parts";
import { SnapshotResult } from "@/components/profile-check/snapshot-result";
import type { Snapshot } from "@/lib/profile-check";

export default function HomeCheckResult({
  snapshot,
  onAnother,
}: {
  snapshot: Snapshot;
  onAnother: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);
  return (
    <Section id="check-result" tone="sand" rise={false}>
      <div ref={ref} className="mx-auto max-w-3xl scroll-mt-4">
        <Eyebrow>Your check</Eyebrow>
        <div className="mt-4">
          <SnapshotResult snapshot={snapshot} page="/" onAnother={onAnother} />
        </div>
      </div>
    </Section>
  );
}

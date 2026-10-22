import { STEP_CLIPS, type ClipKey } from "@/lib/onboarding-clips";

/** The step's 20-second clip (W3). Renders nothing until the clip exists; plays only when pressed, never with sound. */
export function StepClip({ clip, label }: { clip: ClipKey; label: string }) {
  const c = STEP_CLIPS[clip];
  if (!c) return null;
  return (
    <figure className="mb-5">
      <video
        controls
        muted
        playsInline
        preload="none"
        poster={c.poster}
        aria-label={label}
        className="w-full rounded-card bg-kb-sand"
      >
        <source src={c.src} type="video/mp4" />
      </video>
    </figure>
  );
}

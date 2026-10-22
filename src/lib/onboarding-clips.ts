// The 20-second clips for the onboarding steps (video plan W3, K-111). A clip shows only when it exists: until a file is
// published its slot is empty and nothing is rendered, so no screen carries a dead player. Add the file under
// public/help/clips and put its path here; nothing else changes. No clip plays before the owner presses play.
export type ClipKey = "access" | "verify" | "questions" | "confirm";
export const STEP_CLIPS: Record<ClipKey, { src: string; poster?: string } | null> = {
  access: null,
  verify: null,
  questions: null,
  confirm: null,
};

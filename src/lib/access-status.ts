// The live status under the Manager guide (K-93, K-141): what the pill says for each access state. Pure, so the words
// are tested. Before Gate A a person accepts the invitation by hand, so the pill promises an email, not a 30 second check.
import type { AccessState } from "@/lib/onboarding";

export type AccessPill = {
  tone: "green" | "amber" | "grey";
  text: string;
  /** A second line under the pill. */
  detail?: string;
  /** Access works: the screen moves on by itself. */
  connected: boolean;
};

export function accessPill(i: {
  state: AccessState;
  consented: boolean;
  /** google_mode() is live and a person is not accepting invitations by hand. */
  live: boolean;
}): AccessPill | null {
  if (i.state === "granted")
    return { tone: "green", text: "Invitation received. You're connected", connected: true };
  if (i.state === "lost" || i.state === "error")
    return {
      tone: "amber",
      text: "Kabsi can't reach your profile",
      detail: "Check that the Kabsi group is still a Manager in People and access.",
      connected: false,
    };
  if (!i.consented) return null;
  if (i.live)
    return {
      tone: "grey",
      text: "Waiting for your invitation. We check every 30 seconds.",
      connected: false,
    };
  return {
    tone: "grey",
    text: "We'll email you when access is ready",
    detail:
      "During early access a person on the Kabsi team accepts the invitation. You can close this page.",
    connected: false,
  };
}

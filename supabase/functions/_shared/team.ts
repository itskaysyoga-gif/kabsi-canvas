// Team invites (K-16, P0.3-06). The owner invites a manager or a staff member by email in Settings; the database keeps
// the invite (public.team_invites) and offers the team_invite_email job; this file builds that email and runs the job,
// with no database import so its tests run without credentials. The invite is used when that address signs in.
import { esc } from "./email-layout.ts";

export type TeamInvite = {
  email: string;
  role: "manager" | "staff";
  business: string;
  invited_by: string | null;
  open: boolean;
  expires_at: string;
};

const ROLE_WORDS: Record<TeamInvite["role"], { name: string; can: string }> = {
  manager: { name: "a manager", can: "see the reviews, replies, posts and profile, and approve what the owner allows" },
  staff: { name: "a staff member", can: "add photos and share the review link" },
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function teamInviteEmail(i: TeamInvite, appUrl: string) {
  const r = ROLE_WORDS[i.role];
  const who = i.invited_by ? `${i.invited_by} added you` : "You were added";
  const p = (s: string) => `<p style="margin:0 0 16px 0;">${s}</p>`;
  return {
    subject: `${i.business}: you're invited to Kabsi`,
    preheader: `Join ${i.business} on Kabsi as ${r.name}.`,
    title: `Join ${i.business} on Kabsi`,
    bodyHtml: p(`${esc(who)} as ${r.name} of <strong>${esc(i.business)}</strong> on Kabsi. You can ${r.can}.`)
      + p(`Sign in with this email address, ${esc(i.email)}, to accept. The invitation works until ${day(i.expires_at)}.`)
      + p("Kabsi never asks for your Google password or a verification code."),
    text: `${who} as ${r.name} of ${i.business} on Kabsi. You can ${r.can}.\n\nSign in with this email address, ${i.email}, to accept. The invitation works until ${day(i.expires_at)}.\n\nKabsi never asks for your Google password or a verification code.\n\nSign in: ${appUrl}/login`,
    button: { label: "Sign in to Kabsi", url: `${appUrl}/login` },
    note: "If you did not expect this, you can ignore this email. Nothing happens until you sign in.",
  };
}

// The team_invite_email job: read the invite, and send only while it is still open.
export async function sendTeamInvite(
  inviteId: string,
  deps: { read: (id: string) => Promise<TeamInvite | null>; send: (i: TeamInvite) => Promise<void> },
): Promise<"sent" | "closed"> {
  const i = await deps.read(inviteId);
  if (!i || !i.open) return "closed";
  await deps.send(i);
  return "sent";
}

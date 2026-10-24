// Team and approval policies (K-16, P0.3-06). Roles are enforced in the database (RLS and the RPCs); these calls only
// read and ask. The owner manages the team; managers and staff see what their role allows.
import { supabase } from "@/lib/supabase";

export type Role = "owner" | "manager" | "staff";
export type ApprovalKind = "review_reply" | "post" | "photo" | "profile_change" | "hours";
export type Policy = "owner" | "owner_and_managers";
export type Member = { user_id: string; email: string; role: Role; you: boolean };
export type Invite = {
  id: string;
  email: string;
  role: Exclude<Role, "owner">;
  created_at: string;
  expires_at: string;
};
export type Team = { members: Member[]; invites: Invite[]; policies: Record<ApprovalKind, Policy> };
export type Access = {
  role: Role;
  approve: Record<ApprovalKind, boolean>;
  approve_high_risk: boolean;
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};
export const ROLE_HINT: Record<Role, string> = {
  owner: "Sees everything, approves everything, manages the team, billing and Google access.",
  manager: "Sees everything except billing. Approves only what you allow below.",
  staff: "Adds photos and shares the review link. Approves nothing.",
};
export const KIND_LABEL: Record<ApprovalKind, string> = {
  review_reply: "Review replies",
  post: "Google posts",
  photo: "Photos",
  hours: "Hours",
  profile_change: "Profile changes",
};

const FRIENDLY: Record<string, string> = {
  already_member: "This person is already on your team.",
  bad_email: "Enter a valid email address.",
  last_owner: "Your business needs at least one owner.",
  forbidden: "Only the owner can do this.",
};
function friendly(message: string) {
  const key = Object.keys(FRIENDLY).find((k) => message.includes(k));
  return new Error(key ? FRIENDLY[key] : "Something went wrong. Please try again.");
}
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw friendly(error.message);
  return data as T;
}

export const myAccess = (locationId: string) =>
  rpc<Access>("my_access", { p_location: locationId });
export const loadTeam = (locationId: string) => rpc<Team>("list_team", { p_location: locationId });
export const inviteMember = (locationId: string, email: string, role: Exclude<Role, "owner">) =>
  rpc<string>("invite_team_member", { p_location: locationId, p_email: email, p_role: role });
export const cancelInvite = (inviteId: string) =>
  rpc<null>("cancel_team_invite", { p_invite: inviteId });
export const setMemberRole = (locationId: string, userId: string, role: Role) =>
  rpc<null>("set_member_role", { p_location: locationId, p_user: userId, p_role: role });
export const removeMember = (locationId: string, userId: string) =>
  rpc<null>("remove_member", { p_location: locationId, p_user: userId });
export const setPolicy = (locationId: string, kind: ApprovalKind, managersToo: boolean) =>
  rpc<unknown>("set_approval_policy", {
    p_location: locationId,
    p_kind: kind,
    p_policy: managersToo ? "owner_and_managers" : "owner",
  });

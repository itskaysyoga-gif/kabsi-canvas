// One WhatsApp agent for every kind of person (master plan 29.7). Every phone resolves to its roles in Supabase
// (phone_roles, read through whatsapp_resolve) before anything else happens; Kapso is only the transport. Each role gets
// only its own tools and its own Nora voice. A phone with two kinds of role is asked once which one a message is for,
// and every reply says which role and business it acts for. Pure: no database, network or environment access here.

export type BusinessRole = {
  kind: "business"; role: "owner" | "manager" | "staff"; user_id: string; location_id: string; business: string;
  time_zone: string | null; country: string | null; status: string; pro: boolean;
};
export type Role =
  | BusinessRole
  | { kind: "staff_admin"; role: "staff_admin"; user_id: string }
  | { kind: "partner"; role: "partner"; partner_id: string }
  | { kind: "prospect"; role: "prospect" };

export type Conversation = {
  phone: string;
  active_role: Domain | null;
  active_location_id: string | null;
  open_question: OpenQuestion | null;
  language: string | null;
  last_task: { type: "review"; review_id: string; location_id: string } | null;
  window_expires_at: string | null;
  stopped_at: string | null;
  handoff_at: string | null;
  abuse_notice_at: string | null;
  scan_code: string | null;
  partner_code: string | null;
};

export type OpenQuestion =
  | { type: "role"; pending: string | null; options: Domain[] }
  | { type: "business"; pending: string | null; options: { id: string; name: string }[] }
  | { type: "which"; options: { token: string; label: string }[] }
  | { type: "digest"; ids: number[] }
  | { type: "hours"; pending: string; location_id: string }
  | { type: "keyword"; location_id: string; suggested: string | null }
  // V3: the monthly "anything new?" question (answered within 3 days) and the category menu under a photo's Edit.
  | { type: "update"; location_id: string; at: string }
  | { type: "photo_category"; photo_id: string; location_id: string }
  // V4: the first message back during onboarding ("Can Kabsi send your setup steps and approvals here?").
  | { type: "setup"; location_id: string };

export type Who = { phone: string; roles: Role[]; conversation: Conversation | null };

// What a message can be about. "business" is the owner, manager and staff side; "staff" is Kabsi's own staff phone.
export type Domain = "business" | "partner" | "staff";

/** The tools each role may use (29.7). The router refuses anything outside the list, so a partner never reaches owner
 *  tools and an owner never reaches partner tools; staff_admin's ops commands answer only staff_admin. */
export const TOOLS = {
  unknown: ["help", "question", "scan", "prices", "trial", "partner_program", "person"],
  prospect: ["help", "question", "scan", "send_map", "prices", "trial", "partner_program", "person"],
  owner: ["help", "question", "switch", "stats", "review_link", "qr", "approve", "undo", "edit_draft", "exact_reply", "photo", "contact",
    "hours", "post", "billing", "voice", "ask_customer", "person"],
  manager: ["help", "question", "switch", "stats", "review_link", "qr", "approve", "undo", "edit_draft", "exact_reply", "photo", "contact",
    "hours", "post", "voice", "ask_customer", "person"],
  staff: ["help", "question", "switch", "photo", "voice", "ask_customer", "person"],
  partner: ["help", "question", "switch", "partner_tool", "person"],
  staff_admin: ["help", "switch", "staff_status", "staff_waiting", "staff_today", "staff_pause", "staff_partners", "staff_payouts", "person"],
} as const;
export type RoleName = keyof typeof TOOLS;
export type Tool = (typeof TOOLS)[RoleName][number];

export function may(role: RoleName, tool: string): boolean {
  return (TOOLS[role] as readonly string[]).includes(tool);
}

/** The kinds of role a phone has, in a fixed order. */
export function domains(who: Who): Domain[] {
  const d: Domain[] = [];
  if (who.roles.some((r) => r.kind === "business")) d.push("business");
  if (who.roles.some((r) => r.kind === "partner")) d.push("partner");
  if (who.roles.some((r) => r.kind === "staff_admin")) d.push("staff");
  return d;
}

export const businesses = (who: Who): BusinessRole[] => who.roles.filter((r): r is BusinessRole => r.kind === "business");
export const isProspect = (who: Who) => who.roles.some((r) => r.kind === "prospect") || !!who.conversation?.scan_code || !!who.conversation?.partner_code;

/** The domain a tool belongs to; null for the shared ones (help, switch, person, yes, free text). */
export function domainOf(tool: string): Domain | null {
  if (tool.startsWith("staff_")) return "staff";
  if (tool === "partner_tool") return "partner";
  if (["help", "greet", "show", "switch", "person", "free", "yes", "no", "number", "question"].includes(tool)) return null;
  if (["scan", "send_map", "prices", "trial", "partner_program"].includes(tool)) return null;
  return "business";
}

/** The business a message acts for, when it can be told without asking: the only one, or the active one. */
export function pickBusiness(who: Who): BusinessRole | null {
  const list = businesses(who);
  if (list.length === 1) return list[0];
  const active = who.conversation?.active_location_id;
  return list.find((b) => b.location_id === active) ?? null;
}

/** The role name for one domain (and business): drives the tool list and the voice. */
export function roleFor(who: Who, domain: Domain | null, business: BusinessRole | null): RoleName {
  if (domain === "staff") return "staff_admin";
  if (domain === "partner") return "partner";
  if (domain === "business" && business) return business.role;
  if (domain === "business") {
    const list = businesses(who);
    return list.some((b) => b.role === "owner") ? "owner" : list.some((b) => b.role === "manager") ? "manager" : "staff";
  }
  return isProspect(who) ? "prospect" : "unknown";
}

/** The head line of every reply to a bound phone: which role and which business it acts for (29.7). */
export function head(who: Who, domain: Domain | null, business: BusinessRole | null): string | null {
  if (domain === "staff") return "Kabsi staff";
  if (domain === "partner") return "Your partner tools";
  if (domain === "business" && business) return `${business.business} (${business.role})`;
  return null;
}

/** When a message could mean either of the phone's roles and none is chosen yet, the one question to ask. */
export function needsRoleChoice(who: Who, toolDomain: Domain | null): Domain[] | null {
  const d = domains(who);
  if (d.length < 2 || toolDomain) return null;
  const active = who.conversation?.active_role;
  if (active && d.includes(active)) return null;
  return d;
}

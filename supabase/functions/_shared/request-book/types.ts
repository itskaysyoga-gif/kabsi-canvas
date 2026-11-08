// The request book's shared vocabulary (KABSI 3.0, docs/kabsi-3/build-decisions.md). One workflow, three kinds, and the
// words an owner reads come from a pack, never from here. These lists mirror the database checks of PR A and PR B
// (supabase/migrations/20261108174647_request_book_core.sql) so code and database cannot drift unnoticed: the tests
// compare them. Pure: no database, network or environment access in this folder.

export const KINDS = ["enquiry", "appointment", "job"] as const;
export type Kind = (typeof KINDS)[number];

/** Who may be acting. Every actor is a member of the business (the database checks it). */
export const ROLES = ["owner", "manager", "staff"] as const;
export type Role = (typeof ROLES)[number];

/** The open statuses of each kind. A closed request has status "closed" and an outcome. */
export const OPEN_STATUSES: Record<Kind, readonly string[]> = {
  enquiry: ["new", "contacted"],
  appointment: ["requested"],
  job: ["waiting", "active", "ready"],
};

/** How each kind closes. "voided" is only ever written by Undo. */
export const OUTCOMES: Record<Kind, readonly string[]> = {
  enquiry: ["converted", "lost", "voided"],
  appointment: ["attended", "no_show", "cancelled", "voided"],
  job: ["completed", "cancelled", "no_show", "voided"],
};

/** Every status key a pack must give a word for, for one kind. */
export const statusKeys = (kind: Kind): string[] => [...OPEN_STATUSES[kind], ...OUTCOMES[kind]];

export const INTAKE_SOURCES = ["typed", "form", "forward", "voice", "screenshot", "import", "integration"] as const;
export type IntakeSource = (typeof INTAKE_SOURCES)[number];

export const ORIGIN_CHANNELS = [
  "whatsapp", "instagram", "facebook", "phone", "walk_in", "google", "website", "referral", "booking_system", "other", "unknown",
] as const;
export type OriginChannel = (typeof ORIGIN_CHANNELS)[number];

/** A request as the read functions return it (private.rb_row): no personal values beyond the customer's display name. */
export type RequestRow = {
  request_id: string;
  number: number;
  kind: Kind;
  status: string;
  outcome: string | null;
  summary: string;
  customer_id: string;
  customer_name: string | null;
  requested_window_text: string | null;
  starts_at: string | null;
  staff_confirmed: boolean;
  customer_confirmed: boolean;
  next_action: string | null;
  next_action_due_at: string | null;
  follow_up_user_id: string | null;
  created_at: string;
};

/** The reason codes the database functions return when they refuse, and the extra values they carry. */
export type Refusal = { ok: false; reason: string; flags?: string[]; field?: string; reopen_to?: string | null; row_version?: number };

/** What a write function returns on success (private.rb_result). */
export type WriteResult = {
  ok: true; request_id: string; number: number; kind: Kind; status: string; outcome: string | null;
  row_version: number; activity_id: string; flags: string[];
};

/** A time in a business: its IANA zone and ISO country, from the location, never from the message. */
export type LocationContext = { timeZone: string; country: string | null };

/** What a reply is: words, and at most three buttons. Button messages stay under 1,024 characters. */
export type Reply = { body: string; buttons?: string[] };

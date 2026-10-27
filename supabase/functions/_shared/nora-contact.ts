// Nora's save_contact tool (assistant function) and what she is told about a saved contact (Sec 1). Pure.
// A visitor is anonymous, so the email Nora saves is only what someone typed. Three rules keep one visitor from reaching
// another person's contact row through her:
//   1. the lookup is the exact address (case aside): % and _ are not patterns, so "%@%.com" finds no one;
//   2. a row this chat did not create, and that is not the signed-in person's own address, is linked for the reply email
//      but never changed (no name, no phone, no news consent);
//   3. Nora's context shows a saved contact's name and business only when it is this chat's own row or the signed-in
//      person's, so typing someone's address never reads their details back.

/** The address as an exact ILIKE pattern: backslash, % and _ escaped. */
export const exactEmailPattern = (email: string) => email.replace(/[\\%_]/g, (c) => `\\${c}`);

export type ContactRow = { id: string; email: string; name?: string | null; business_name?: string | null; conversation_id?: string | null };

/** Is this row this visitor's own: made in this chat, or the address they are signed in with? */
export function ownsContact(row: Pick<ContactRow, "email" | "conversation_id">, o: { conversationId: string; signedInEmail?: string | null }): boolean {
  if (row.conversation_id && row.conversation_id === o.conversationId) return true;
  return !!o.signedInEmail && row.email.trim().toLowerCase() === o.signedInEmail.trim().toLowerCase();
}

/** The context line about the saved contact. */
export function contactContextLine(row: ContactRow, o: { conversationId: string; signedInEmail?: string | null }): string {
  if (!ownsContact(row, o)) return "Contact already saved for this chat.";
  return `Contact already saved: ${[row.name, row.email, row.business_name].filter(Boolean).join(", ")}`;
}

/** Sec 2: news consent counts only for an address its owner proved. When Nora hears "yes, send me news", the consent
 *  is stored at once only if the address is the one the visitor is signed in with (Supabase verified it); for any
 *  other address only the request is kept (news_requested_at) and marketing_consent stays as it was, until a
 *  confirmation from that inbox (LATER row: the confirmation email). Typing someone else's address can never sign
 *  them up. */
export function newsConsent(o: { asked: boolean; email: string; signedInEmail?: string | null; current: boolean | null }, now = new Date()):
  { marketing_consent: boolean; news_requested_at?: string } {
  const current = o.current === true;
  if (!o.asked) return { marketing_consent: current };
  const proven = !!o.signedInEmail && o.signedInEmail.trim().toLowerCase() === o.email.trim().toLowerCase();
  return proven ? { marketing_consent: true } : { marketing_consent: current, news_requested_at: now.toISOString() };
}

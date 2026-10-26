// Every task closes (master plan 30.15 section 3.1, V4 item 3). The owner sees one of four states for anything Kabsi sends to
// Google: approved, sent to Google, confirmed on Google (with a link), or failed with what happens next. "Published" and "on
// Google" are said only after Kabsi has read it back on Google (the publication's verified state, publish.ts); a reply Google
// has not shown yet is "sent", never "published". Pure: the WhatsApp tick and the website both read these words.
import { noun, type TargetType } from "./publish.ts";

export type PubState = "approved" | "publishing" | "published" | "checking" | "verifying" | "verified" | "rejected" | "failed" | "cancelled";
export type OwnerState = "approved" | "sent" | "confirmed" | "failed" | "undone";

export const OWNER_LABEL: Record<OwnerState, string> = {
  approved: "Approved",
  sent: "Sent to Google",
  confirmed: "On Google",
  failed: "Did not go through",
  undone: "Undone",
};

export function ownerState(s: PubState): OwnerState {
  switch (s) {
    case "approved":
      return "approved";
    case "publishing":
    case "published":
    case "checking":
    case "verifying":
      return "sent";
    case "verified":
      return "confirmed";
    case "cancelled":
      return "undone";
    default:
      return "failed";
  }
}

type Kind = TargetType | "listing_edit";
const nounOf = (t: Kind) => (t === "listing_edit" ? "change to your profile" : noun(t));

/**
 * Where the owner can see it on Google. A post's own link when Google gave one (only a Google address is trusted), else the
 * business's reviews page for a reply, else the business on Google Maps. Null without a place ID: the message then has no link.
 */
export function googleLink(o: { target_type: Kind; place_id: string | null; response?: unknown }): string | null {
  if (o.target_type === "local_post") {
    const url = (o.response as { searchUrl?: unknown } | null)?.searchUrl;
    if (typeof url === "string" && /^https:\/\/(www\.|local\.|posts\.)?google\.[a-z.]+\//.test(url)) return url;
  }
  if (!o.place_id || !/^[A-Za-z0-9_-]{10,300}$/.test(o.place_id)) return null;
  const id = encodeURIComponent(o.place_id);
  if (o.target_type === "review_reply") return `https://search.google.com/local/reviews?placeid=${id}`;
  return `https://www.google.com/maps/place/?q=place_id:${id}`;
}

/** docs/COPY.md 20, after Yes: "Approved. It goes to Google in 10 seconds. Reply Undo to stop it." */
export const APPROVED_LINE = "Approved. It goes to Google in 10 seconds. Reply Undo to stop it.";

/** The one WhatsApp line for a state the owner has not been told yet, or null when there is nothing new to say. */
export function outcomeLine(o: { business: string; target_type: Kind; state: PubState; reason: string | null; link: string | null }): string | null {
  const what = nounOf(o.target_type);
  const s = ownerState(o.state);
  if (s === "confirmed") {
    const your = what.startsWith("change") ? `The ${what}` : `Your ${what}`;
    return o.link ? `${o.business}: ${your} is on Google: ${o.link}. Done.` : `${o.business}: ${your} is on Google. Done.`;
  }
  if (s === "sent") {
    return `${o.business}: your yes is saved. I have not seen the ${what} on Google yet. Nothing else is needed from you. I will tell you when it shows.`;
  }
  if (s === "failed") {
    // The pipeline's reason already says what failed and what happens next (publish.ts rejectionReason, record_publication).
    const why = (o.reason ?? "").trim() || `Google did not take this ${what}. Nothing changed on Google.`;
    return `${o.business}: the ${what} did not go through. ${why}`;
  }
  return null;
}

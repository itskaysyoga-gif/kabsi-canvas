// "Report this review" (P0.8-11, K-139, Pro): a helper for a review the owner believes breaks Google's rules. It shows
// Google's categories in plain words, an evidence checklist, a link to Google's Reviews Management Tool, and tracks what
// the owner reports back (reported, Google answered, still showing, removed, one appeal). No model is called, nothing is
// sent to Google by Kabsi, and Kabsi never says a review will be removed: only Google decides.
import { supabase } from "@/lib/supabase";

/** Where the category list and the steps below were read, and when (Google's own help pages). */
export const GOOGLE_CHECKED = "21 Oct 2026";
export const GOOGLE_POLICY_URL = "https://support.google.com/contributionpolicy/answer/7400114";
export const GOOGLE_REPORT_HELP_URL = "https://support.google.com/business/answer/4596773";
/** Google's Reviews Management Tool: report a review, check a report and appeal. */
export const REVIEWS_TOOL_URL = "https://support.google.com/business/workflow/9945796";

export type Category = { key: string; name: string; plain: string };
export type CategoryGroup = { title: string; items: Category[] };

/** Google's prohibited and restricted content categories for reviews, in Google's order, with a plain line for each. */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: "Fake and misleading",
    items: [
      {
        key: "fake_content",
        name: "Fake and misleading content",
        plain: "It does not describe a real experience at your business.",
      },
      {
        key: "fake_engagement",
        name: "Fake engagement",
        plain: "Paid or rewarded reviews, several accounts, or reviews not based on a real visit.",
      },
      {
        key: "rating_manipulation",
        name: "Rating manipulation",
        plain: "A sudden run of reviews, or a review from someone with a conflict of interest.",
      },
      {
        key: "impersonation",
        name: "Impersonation",
        plain: "Someone posing as another person, group or organisation.",
      },
      {
        key: "misrepresentation",
        name: "Misrepresentation",
        plain: "False claims about what you sell or do, or tricking people into sharing data.",
      },
    ],
  },
  {
    title: "Inappropriate",
    items: [
      {
        key: "harassment",
        name: "Harassment",
        plain: "Threats, sharing someone's details to target them, or sexualising a person.",
      },
      {
        key: "hate_speech",
        name: "Hate speech",
        plain: "Attacks on people for who they are, or calls for violence against a group.",
      },
      {
        key: "offensive_content",
        name: "Offensive content",
        plain: "Attacks on people or groups, or accusations of crime with nothing to back them up.",
      },
      {
        key: "personal_information",
        name: "Personal information",
        plain: "Someone's personal details posted without their consent.",
      },
      {
        key: "obscenity_profanity",
        name: "Obscenity and profanity",
        plain: "Swearing or obscene words used to offend.",
      },
      {
        key: "sexually_explicit",
        name: "Sexually explicit or adult content",
        plain: "Explicit or adult material.",
      },
      {
        key: "violence_gore",
        name: "Violence and gore",
        plain: "Graphic violence against people or animals.",
      },
    ],
  },
  {
    title: "Other",
    items: [
      {
        key: "off_topic",
        name: "Off-topic",
        plain:
          "Not about an experience at your business: politics, social comment or a personal rant.",
      },
      {
        key: "advertising",
        name: "Advertising and solicitation",
        plain: "Promotions, contact details or links in a review.",
      },
      {
        key: "unclear_repetitive",
        name: "Unclear or repetitive content",
        plain: "Text that means nothing, or the same text posted again.",
      },
      {
        key: "restricted_content",
        name: "Restricted content",
        plain: "Offers to sell regulated goods or services, such as alcohol, gambling or tobacco.",
      },
      {
        key: "dangerous_content",
        name: "Dangerous content",
        plain: "Content that encourages serious harm or dangerous activity.",
      },
      {
        key: "child_safety",
        name: "Child safety",
        plain: "Anything that sexualises or endangers children.",
      },
      {
        key: "terrorist_content",
        name: "Terrorist content",
        plain: "Content that supports or praises terrorist acts.",
      },
    ],
  },
];
export const CATEGORIES: Category[] = CATEGORY_GROUPS.flatMap((g) => g.items);

export type EvidenceItem = { key: string; label: string };
/** What helps Google's reviewers, and what the owner keeps themselves. Kabsi stores which boxes were ticked, nothing more. */
export const EVIDENCE: EvidenceItem[] = [
  {
    key: "own_words",
    label: "Why you think it breaks Google's rules, in one or two plain sentences",
  },
  {
    key: "dates",
    label: "The dates: when it was posted, and when this person could have visited, if ever",
  },
  {
    key: "not_a_customer",
    label:
      "What shows this person was not a customer: no booking, order or receipt under that name",
  },
  {
    key: "screenshots",
    label:
      "Screenshots of the review and of any related messages. You keep these; Kabsi does not store them",
  },
  {
    key: "related",
    label: "Other reviews that look related: the same wording, the same day or the same account",
  },
  {
    key: "conflict",
    label:
      "Anything you know about a conflict of interest, such as a competitor or a former employee",
  },
];

export const REPORT_STEPS = [
  "Open Google's Reviews Management Tool and confirm the account that manages your business.",
  "Choose your business, then Continue.",
  "Choose Report a new review for removal, then Continue.",
  "Next to the review, choose Report, pick the reason that fits and Submit.",
];
export const APPEAL_STEPS = [
  "Open Google's Reviews Management Tool, confirm your account and choose your business.",
  "Choose Check the status of a review I reported previously and appeal options, then Continue.",
  "At the bottom, choose Appeal eligible reviews.",
  "Select the review, then Continue, then Submit an appeal.",
  "Fill in the form that opens and Submit. Google emails you its answer.",
];

export type ReportState = "reported" | "answered" | "still_showing" | "removed" | "appealed";
export const STATE_LABEL: Record<ReportState, string> = {
  reported: "Reported to Google",
  answered: "Google answered",
  still_showing: "Still showing",
  removed: "Removed",
  appealed: "Appeal sent",
};
export type ReviewReport = {
  id: string;
  review_id: string;
  category: string;
  evidence: string[];
  state: ReportState;
  reported_at: string;
  step_at: string;
  appeal_started_at: string | null;
  closed_at: string | null;
  reminder_due: boolean;
};

/** The next steps the owner can record from a state, in the only order the database allows. */
export function nextSteps(r: Pick<ReviewReport, "state" | "appeal_started_at">): ReportState[] {
  if (r.state === "reported") return ["answered"];
  if (r.state === "answered" || r.state === "appealed") return ["removed", "still_showing"];
  if (r.state === "still_showing" && !r.appeal_started_at) return ["appealed"];
  return [];
}

const FRIENDLY: Record<string, string> = {
  pro_required: "Reporting help is part of Pro.",
  already_reported: "You already told Kabsi you reported this review.",
  bad_step: "That step does not come next.",
  forbidden: "Only an owner or manager can do this.",
};
function friendly(message: string) {
  const key = Object.keys(FRIENDLY).find((k) => message.includes(k));
  return new Error(key ? FRIENDLY[key] : "Something went wrong. Please try again.");
}

export async function loadReports(locationId: string): Promise<ReviewReport[]> {
  const { data, error } = await supabase.rpc("list_review_reports", { p_location: locationId });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReviewReport[];
}
export async function startReport(reviewId: string, category: string, evidence: string[]) {
  const { error } = await supabase.rpc("start_review_report", {
    p_review: reviewId,
    p_category: category,
    p_evidence: evidence,
  });
  if (error) throw friendly(error.message);
}
export async function advanceReport(reportId: string, to: ReportState) {
  const { error } = await supabase.rpc("advance_review_report", { p_report: reportId, p_to: to });
  if (error) throw friendly(error.message);
}

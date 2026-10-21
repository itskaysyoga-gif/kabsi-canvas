// The retention table shown on /privacy, in plain words (K-40). One row per data_class in the database table
// `retention_policies`, which the daily retention job reads. tests/retention-page.test.ts fails when a class or a
// number here drifts from the migration, so the page cannot promise something the job does not do.

export type RetentionRow = {
  dataClass: string;
  /** The same number as retention_policies.keep_days (null where the class follows another rule). */
  keepDays: number | null;
  data: string;
  kept: string;
  why: string;
};

export const RETENTION_ROWS: RetentionRow[] = [
  {
    dataClass: "review_content",
    keepDays: 30,
    data: "Review text and reviewer name",
    kept: "30 days after Google last sent it to us",
    why: "Google's API policy",
  },
  {
    dataClass: "review_metadata",
    keepDays: null,
    data: "Review id, star rating, dates and reply state",
    kept: "While you use Kabsi",
    why: "Needed to run the reply workflow",
  },
  {
    dataClass: "google_profile_values",
    keepDays: 30,
    data: "Details of your profile that Google shows, as Kabsi read them",
    kept: "30 days",
    why: "Google's API policy",
  },
  {
    dataClass: "owner_values",
    keepDays: null,
    data: "Facts and values you approved",
    kept: "While you use Kabsi; deleted when you delete the business",
    why: "They are your own data",
  },
  {
    dataClass: "google_performance",
    keepDays: 30,
    data: "Google's performance figures, such as rating snapshots",
    kept: "30 days; fetched again when needed. The calls, clicks, views and search terms in Insights are read when you open the screen and are not stored",
    why: "Google's API policy",
  },
  {
    dataClass: "drafts_and_payloads",
    keepDays: null,
    data: "Reply drafts and the exact text sent to Google",
    kept: "Cleared together with their review",
    why: "They are linked to Google content",
  },
  {
    dataClass: "uploaded_photos",
    keepDays: 30,
    data: "Photos you upload to Kabsi",
    kept: "The file is deleted 30 days after the photo is on Google, or soon after you skip it",
    why: "Not needed once Google has it",
  },
  {
    dataClass: "audit_log",
    keepDays: 731,
    data: "The record of approvals and changes (who did what and when)",
    kept: "24 months; the details are blanked as in the rows above",
    why: "Proof of what you approved",
  },
  {
    dataClass: "email_log",
    keepDays: 366,
    data: "The log of emails we sent you",
    kept: "12 months",
    why: "Settling delivery disputes",
  },
  {
    dataClass: "nora_chats",
    keepDays: 366,
    data: "Conversations with Nora, the assistant",
    kept: "12 months",
    why: "Support",
  },
  {
    dataClass: "google_data_after_access_lost",
    keepDays: 30,
    data: "Google data of a business whose access was removed",
    kept: "Deleted after 30 days, unless access comes back",
    why: "Google's API policy",
  },
];

// The notification categories on the Settings screen (K-46 as amended by K-57, K-118). A copy of
// supabase/functions/_shared/notify-categories.ts, which the engine reads; tests/notifications.test.ts keeps the two
// equal (ids, order, defaults, what can be switched off).

export type EmailDefault = "instant" | "daily_digest" | "by_hours";
export type CategoryGroup =
  "Daily work" | "Weekly and monthly" | "Google access" | "Trial and billing" | "Account and help";

export type Category = {
  id: string;
  label: string;
  description: string;
  group: CategoryGroup;
  switchable: boolean;
  emailDefault: EmailDefault;
  quietExempt: boolean;
  inApp: boolean;
};

export const CATEGORIES: readonly Category[] = [
  {
    id: "review_high_risk",
    label: "Reviews that need extra care",
    group: "Daily work",
    switchable: true,
    emailDefault: "instant",
    quietExempt: false,
    inApp: true,
    description: "A review where a reply needs a careful look. Kabsi tells you at once.",
  },
  {
    id: "review_new",
    label: "New reviews",
    group: "Daily work",
    switchable: true,
    emailDefault: "by_hours",
    quietExempt: false,
    inApp: true,
    description:
      "A new review with a reply ready. At once while you are open, in the daily email outside your opening hours.",
  },
  {
    id: "profile_urgent",
    label: "Urgent profile changes",
    group: "Daily work",
    switchable: false,
    emailDefault: "instant",
    quietExempt: true,
    inApp: true,
    description:
      "Your name, address, phone, main category, hours or open status changed on Google. This one always stays on.",
  },
  {
    id: "profile_issue",
    label: "Other profile changes",
    group: "Daily work",
    switchable: true,
    emailDefault: "daily_digest",
    quietExempt: false,
    inApp: true,
    description: "A smaller change on Google, a reply Google refused, or a broken link.",
  },
  {
    id: "approval_needed",
    label: "Posts, photos and hours to approve",
    group: "Weekly and monthly",
    switchable: true,
    emailDefault: "daily_digest",
    quietExempt: false,
    inApp: true,
    description:
      "A post or photo Kabsi prepared, or a question about your hours before a holiday. Nothing goes on Google until you approve it.",
  },
  {
    id: "weekly_report",
    label: "Weekly Care Report",
    group: "Weekly and monthly",
    switchable: true,
    emailDefault: "instant",
    quietExempt: false,
    inApp: true,
    description: "What Kabsi watched, prepared and published, once a week.",
  },
  {
    id: "access",
    label: "Google access",
    group: "Google access",
    switchable: false,
    emailDefault: "instant",
    quietExempt: false,
    inApp: true,
    description:
      "A change to who can manage your Google profile, and what to do if Kabsi loses access. This one always stays on.",
  },
  {
    id: "billing",
    label: "Billing and plan",
    group: "Trial and billing",
    switchable: false,
    emailDefault: "instant",
    quietExempt: false,
    inApp: true,
    description:
      "Payments, plan changes, and what happens when your trial ends. This one always stays on.",
  },
  {
    id: "trial",
    label: "Trial tips",
    group: "Trial and billing",
    switchable: true,
    emailDefault: "instant",
    quietExempt: false,
    inApp: false,
    description:
      "A few short emails while you try Kabsi: your first win, your week, the days left.",
  },
  {
    id: "account",
    label: "Your account",
    group: "Account and help",
    switchable: false,
    emailDefault: "instant",
    quietExempt: false,
    inApp: false,
    description: "Welcome, team invitations, deleting a business. This one always stays on.",
  },
  {
    id: "help",
    label: "Help from a person",
    group: "Account and help",
    switchable: false,
    emailDefault: "instant",
    quietExempt: false,
    inApp: false,
    description: "A reply from the Kabsi team to a question you asked. This one always stays on.",
  },
];

export const DEFAULT_LINE: Record<EmailDefault, string> = {
  instant: "At once",
  daily_digest: "In the daily email",
  by_hours: "At once while you are open, in the daily email after hours",
};

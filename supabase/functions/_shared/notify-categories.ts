// The notification categories (K-46 as amended by K-57, K-118 "Every email Kabsi sends"). One list, read by the engine
// (notify-rules.ts), the database check in 20261021090000_notification_engine.sql and, copied, the Settings screen
// (src/lib/notification-categories.ts; tests/notifications.test.ts keeps the copy equal). No imports, so it can be
// tested and reused anywhere.
//
// emailDefault is the K-46 default for the email channel:
//   instant        sent at once (held until 08:00 local during quiet hours, 22:00 to 08:00, unless quietExempt)
//   daily_digest   grouped with the rest of the day's items and sent at the business's digest hour
//   by_hours       instant while the business is open, daily digest outside its opening hours (normal reviews)
// switchable is false for what the owner cannot turn off (K-118 "Can be switched off": No, and urgent changes).

export type EmailDefault = "instant" | "daily_digest" | "by_hours";

export type Category = {
  id: string;
  label: string;
  description: string;
  group: "Daily work" | "Weekly and monthly" | "Google access" | "Trial and billing" | "Account and help";
  switchable: boolean;
  emailDefault: EmailDefault;
  quietExempt: boolean;
  /** Shown in the bell on Home. */
  inApp: boolean;
  /** How the digest counts it: "2 new reviews", "1 profile change". */
  noun: [singular: string, plural: string];
  /** The footer line "Why you got this" when an email does not say more. */
  why: string;
};

export const CATEGORIES = [
  {
    id: "review_high_risk", why: "A review for your business needs a careful look.", label: "Reviews that need extra care", group: "Daily work", switchable: true, emailDefault: "instant",
    quietExempt: false, inApp: true, noun: ["review that needs extra care", "reviews that need extra care"],
    description: "A review where a reply needs a careful look. Kabsi tells you at once.",
  },
  {
    id: "review_new", why: "A new review arrived for your business.", label: "New reviews", group: "Daily work", switchable: true, emailDefault: "by_hours",
    quietExempt: false, inApp: true, noun: ["new review", "new reviews"],
    description: "A new review with a reply ready. At once while you are open, in the daily email outside your opening hours.",
  },
  {
    id: "profile_urgent", why: "A detail customers rely on changed on your Google profile.", label: "Urgent profile changes", group: "Daily work", switchable: false, emailDefault: "instant",
    quietExempt: true, inApp: true, noun: ["urgent profile change", "urgent profile changes"],
    description: "Your name, address, phone, main category, hours or open status changed on Google. This one always stays on.",
  },
  {
    id: "profile_issue", why: "Something changed on your Google profile.", label: "Other profile changes", group: "Daily work", switchable: true, emailDefault: "daily_digest",
    quietExempt: false, inApp: true, noun: ["profile change", "profile changes"],
    description: "A smaller change on Google, a reply Google refused, or a broken link.",
  },
  {
    id: "approval_needed", why: "Kabsi prepared a post, photos or a question about your hours for you to approve.", label: "Posts, photos and hours to approve", group: "Weekly and monthly", switchable: true, emailDefault: "daily_digest",
    quietExempt: false, inApp: true, noun: ["post or photo to approve", "posts and photos to approve"],
    description: "A post or photo Kabsi prepared, or a question about your hours before a holiday. Nothing goes on Google until you approve it.",
  },
  {
    id: "weekly_report", why: "Your Weekly Care Report is sent once a week.", label: "Weekly Care Report", group: "Weekly and monthly", switchable: true, emailDefault: "instant",
    quietExempt: false, inApp: true, noun: ["Weekly Care Report", "Weekly Care Reports"],
    description: "What Kabsi watched, prepared and published, once a week.",
  },
  {
    id: "access", why: "This is Kabsi's own notice of a change to your Google access.", label: "Google access", group: "Google access", switchable: false, emailDefault: "instant",
    quietExempt: false, inApp: true, noun: ["Google access notice", "Google access notices"],
    description: "A change to who can manage your Google profile, and what to do if Kabsi loses access. This one always stays on.",
  },
  {
    id: "billing", why: "This is about your Kabsi plan or a payment.", label: "Billing and plan", group: "Trial and billing", switchable: false, emailDefault: "instant",
    quietExempt: false, inApp: true, noun: ["billing notice", "billing notices"],
    description: "Payments, plan changes, and what happens when your trial ends. This one always stays on.",
  },
  {
    id: "trial", why: "You are setting up or trying Kabsi, and these short emails help you get the most from it.", label: "Trial tips", group: "Trial and billing", switchable: true, emailDefault: "instant",
    quietExempt: false, inApp: false, noun: ["trial tip", "trial tips"],
    description: "A few short emails while you set up and try Kabsi: a nudge if Google has not finished verifying your profile or answering your request for access, your first win, your week, the days left.",
  },
  {
    id: "account", why: "This is about your Kabsi account.", label: "Your account", group: "Account and help", switchable: false, emailDefault: "instant",
    quietExempt: false, inApp: false, noun: ["account notice", "account notices"],
    description: "Welcome, team invitations, deleting a business. This one always stays on.",
  },
  {
    id: "help", why: "You asked Kabsi a question and a person replied.", label: "Help from a person", group: "Account and help", switchable: false, emailDefault: "instant",
    quietExempt: false, inApp: false, noun: ["reply from the team", "replies from the team"],
    description: "A reply from the Kabsi team to a question you asked. This one always stays on.",
  },
] as const satisfies readonly Category[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];

/** Mail that is not a notification to a member: sent because the person just asked, or to the Kabsi team. No preferences. */
export const SYSTEM_CATEGORIES = ["direct", "internal"] as const;
export type SystemCategory = (typeof SYSTEM_CATEGORIES)[number];

export const FREQUENCIES = ["default", "instant", "daily_digest", "off"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const CHANNELS = ["email", "in_app"] as const;
export type Channel = (typeof CHANNELS)[number];

/** "Why you got this" for mail that is not a notification to a member. Each email of these says more itself. */
export const SYSTEM_WHY: Record<SystemCategory, string> = {
  direct: "You asked for this email.",
  internal: "This is a notice for the Kabsi team.",
};

/** Mail for the Kabsi team, not for a customer: it gets the plain staff footer (P0.8-02b). */
export const isStaffCategory = (id: string) => id === "internal";

export const categoryOf = (id: string): Category | undefined => (CATEGORIES as readonly Category[]).find((c) => c.id === id);

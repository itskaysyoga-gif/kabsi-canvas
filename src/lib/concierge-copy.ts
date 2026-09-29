// The words owners see during early access (D267). Keep in step with supabase/functions/_shared/concierge.ts.
export const CONCIERGE_COPY = {
  banner: "Early access: a person on our team posts what you approve, within one working day.",
  posted: "Approved. A person on our team posts it on Google within one working day.",
  waiting: "Want to change it? Email hello@kabsi.co before it's posted.",
  profile:
    "During early access our team handles replies by hand. Posts, photos and hours start once Kabsi connects to Google.",
  setup: "Our team accepts your invitation by hand, within one working day.",
  plan: "Early access: no charge until our team posts your first approved reply.",
} as const;

// The free check's words live in one module shared with the Edge Functions (Launch 1, master plan 30.35 item 4): the
// result page and the emailed and WhatsApp report read the same lines. Import from here in the website.
export * from "../../supabase/functions/_shared/visibility/scan-words.ts";

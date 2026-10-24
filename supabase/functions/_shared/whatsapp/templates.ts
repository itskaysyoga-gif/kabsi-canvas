// The utility templates Kabsi submits through Kapso's API (master plan 9.1 point 4, 9.4, 9.5): plain wording, the
// category they really are (UTILITY, never marketing to owners), no shortened or tracking links, no promotion. Each one
// only says that something is waiting and asks the person to reply; the reply opens the 24-hour window and the full
// message (with its buttons) follows inside it. Named parameters, with examples, as Meta requires.

export type TemplateDef = { name: string; body: string; example: Record<string, string>; button: string };
export type TemplateRef = { name: string; params: Record<string, string> };

export const TEMPLATE_LANGUAGE = "en";

export const TEMPLATES = {
  review_waiting: {
    name: "kabsi_review_waiting",
    body: "{{business}}: a new {{stars}}-star review is waiting for your reply. Reply here to see the draft.",
    example: { business: "Smile Dental", stars: "4" },
    button: "Show me",
  },
  post_ready: {
    name: "kabsi_post_ready",
    body: "{{business}}: a post is ready for your approval. Reply here to see it.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  listing_change: {
    name: "kabsi_listing_change",
    body: "{{business}}: your {{field}} changed on Google. Reply here to see the change and choose what to do.",
    example: { business: "Smile Dental", field: "opening hours" },
    button: "Show me",
  },
  google_action: {
    name: "kabsi_google_action",
    body: "{{business}}: Google is asking for action on your Business Profile. Reply here for the steps.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  updates_waiting: {
    name: "kabsi_updates_waiting",
    body: "{{business}}: you have {{count}} updates from Kabsi waiting. Reply here to see them.",
    example: { business: "Smile Dental", count: "3" },
    button: "Show me",
  },
  holiday_question: {
    name: "kabsi_holiday_question",
    body: "{{business}}: {{holiday}} is on {{date}}. Reply here to tell Kabsi your hours for that day.",
    example: { business: "Smile Dental", holiday: "Thanksgiving", date: "26 November" },
    button: "Show me",
  },
  access_lost: {
    name: "kabsi_access_lost",
    body: "{{business}}: Kabsi can no longer reach your Business Profile. Reply here for the steps to fix it.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  map_ready: {
    name: "kabsi_map_ready",
    body: "{{business}}: your Visibility Map is ready. Reply here to see it.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  staff_alert: {
    name: "kabsi_staff_alert",
    body: "Kabsi staff alert: {{summary}}. Reply here for the details.",
    example: { summary: "2 jobs failed in the last hour" },
    button: "Show me",
  },
} as const satisfies Record<string, TemplateDef>;

export type TemplateKey = keyof typeof TEMPLATES;

export function ref(key: TemplateKey, params: Record<string, string>): TemplateRef {
  const def = TEMPLATES[key];
  const out: Record<string, string> = {};
  for (const name of Object.keys(def.example)) out[name] = clip(params[name] ?? def.example[name as keyof typeof def.example]);
  return { name: def.name, params: out };
}
// Meta refuses parameters with new lines, tabs or more than four spaces in a row.
const clip = (v: string) => v.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 120) || "-";

/** The request body for Meta's message_templates endpoint (through Kapso's proxy). */
export function submission(def: TemplateDef) {
  return {
    name: def.name,
    language: TEMPLATE_LANGUAGE,
    category: "UTILITY",
    parameter_format: "NAMED",
    components: [
      {
        type: "BODY",
        text: def.body,
        example: { body_text_named_params: Object.entries(def.example).map(([param_name, example]) => ({ param_name, example })) },
      },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: def.button }] },
    ],
  };
}

// The utility templates Kabsi submits through Kapso's API (master plan 9.1 point 4, 9.4, 9.5): plain wording, the
// category they really are (UTILITY, never marketing to owners), no shortened or tracking links, no promotion. Each one
// only says that something is waiting and asks the person to reply; the reply opens the 24-hour window and the full
// message (with its buttons) follows inside it. Named parameters in lower snake case, each with an example, as Meta
// requires; a body never starts or ends with a variable (Meta refuses it), so each one opens with "Kabsi here."

export type TemplateDef = { name: string; body: string; example: Record<string, string>; button: string };
export type TemplateRef = { name: string; params: Record<string, string> };

export const TEMPLATE_LANGUAGE = "en";

/** The access notice template (master plan 19, 30.10): its name lives here, not in a secret. */
export const ACCESS_CHANGE_TEMPLATE = "kabsi_access_change";

export const TEMPLATES = {
  review_waiting: {
    name: "kabsi_review_waiting",
    body: "Kabsi here. A new {{stars}}-star review for {{business}} is waiting for your reply. Reply here to see the draft.",
    example: { business: "Smile Dental", stars: "4" },
    button: "Show me",
  },
  post_ready: {
    name: "kabsi_post_ready",
    body: "Kabsi here. A post for {{business}} is ready for your approval. Reply here to see it.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  listing_change: {
    name: "kabsi_listing_change",
    body: "Kabsi here. The {{field}} of {{business}} changed on Google. Reply here to see the change and choose what to do.",
    example: { business: "Smile Dental", field: "opening hours" },
    button: "Show me",
  },
  google_action: {
    name: "kabsi_google_action",
    body: "Kabsi here. Google is asking for action on the Business Profile of {{business}}. Reply here for the steps.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  updates_waiting: {
    name: "kabsi_updates_waiting",
    body: "Kabsi here. You have {{count}} updates waiting for {{business}}. Reply here to see them.",
    example: { business: "Smile Dental", count: "3" },
    button: "Show me",
  },
  holiday_question: {
    name: "kabsi_holiday_question",
    body: "Kabsi here. {{holiday}} is on {{date}}. Reply here to tell Kabsi the hours of {{business}} for that day.",
    example: { business: "Smile Dental", holiday: "Thanksgiving", date: "26 November" },
    button: "Show me",
  },
  access_lost: {
    name: "kabsi_access_lost",
    body: "Kabsi here. Kabsi can no longer reach the Business Profile of {{business}}. Reply here for the steps to fix it.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  map_ready: {
    name: "kabsi_map_ready",
    body: "Kabsi here. The Visibility Map of {{business}} is ready. Reply here to see it.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  access_change: {
    name: ACCESS_CHANGE_TEMPLATE,
    body: "Kabsi here. Access to the Business Profile of {{business}} has changed. Reply here to see what changed.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  // 13b part 2: billing notices (session 10, master plan 10.2.9) reach the owner outside the 24-hour window.
  billing_notice: {
    name: "kabsi_billing_notice",
    body: "Kabsi here. There is an update about the Kabsi plan of {{business}}. Reply here to read it.",
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

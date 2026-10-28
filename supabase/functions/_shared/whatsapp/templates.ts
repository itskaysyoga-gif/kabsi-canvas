// The utility templates Kabsi submits through Kapso's API (master plan 9.1 point 4, 9.4, 9.5): plain wording, the
// category they really are (UTILITY, never marketing to owners), no shortened or tracking links, no promotion. Each one
// only says that something is waiting and asks the person to reply; the reply opens the 24-hour window and the full
// message (with its buttons) follows inside it. Named parameters in lower snake case, each with an example, as Meta
// requires; a body never starts or ends with a variable (Meta refuses it), so each one opens with "Kabsi here."
//
// WhatsApp 2 (28 Oct 2026): Meta put nine of the first eleven in Marketing, which it does not deliver to US numbers,
// caps per person and prices higher. A notice about the owner's own account, approvals or Google profile must be Utility,
// so each of those has a `v2`: the same parameters, new wording that names the owner's own setup or account as the reason
// for the message (no offer, no promotion, no "free"), submitted as a new name. The sender uses the v2 name only once the
// stored status reads APPROVED (see sendName); until then the first name is the fallback.

export type TemplateV2 = { name: string; body: string };
export type TemplateDef = { name: string; body: string; example: Record<string, string>; button: string; v2?: TemplateV2 };
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
    v2: {
      name: "kabsi_listing_change_v2",
      body: "Kabsi here. You asked Kabsi to watch the Business Profile of {{business}}, and its {{field}} changed on Google. Reply here to see the change and choose what to do.",
    },
  },
  google_action: {
    name: "kabsi_google_action",
    body: "Kabsi here. Google is asking for action on the Business Profile of {{business}}. Reply here for the steps.",
    example: { business: "Smile Dental" },
    button: "Show me",
    v2: {
      name: "kabsi_google_action_v2",
      body: "Kabsi here. Google is asking for action on the Business Profile of {{business}}, which you connected to Kabsi. Reply here for the steps.",
    },
  },
  updates_waiting: {
    name: "kabsi_updates_waiting",
    body: "Kabsi here. You have {{count}} updates waiting for {{business}}. Reply here to see them.",
    example: { business: "Smile Dental", count: "3" },
    button: "Show me",
    v2: {
      name: "kabsi_updates_waiting_v2",
      body: "Kabsi here. Kabsi has prepared {{count}} items for {{business}}, and each one needs your approval before anything changes on Google. Reply here to review them.",
    },
  },
  holiday_question: {
    name: "kabsi_holiday_question",
    body: "Kabsi here. {{holiday}} is on {{date}}. Reply here to tell Kabsi the hours of {{business}} for that day.",
    example: { business: "Smile Dental", holiday: "Thanksgiving", date: "26 November" },
    button: "Show me",
    v2: {
      name: "kabsi_holiday_question_v2",
      body: "Kabsi here. {{holiday}} is on {{date}}, and Kabsi needs the opening hours of {{business}} for that day to keep its Business Profile right. Reply here with the hours.",
    },
  },
  access_lost: {
    name: "kabsi_access_lost",
    body: "Kabsi here. Kabsi can no longer reach the Business Profile of {{business}}. Reply here for the steps to fix it.",
    example: { business: "Smile Dental" },
    button: "Show me",
    v2: {
      name: "kabsi_access_lost_v2",
      body: "Kabsi here. The access you gave Kabsi to the Business Profile of {{business}} has been lost, so Kabsi cannot work on it. Reply here for the steps to fix it.",
    },
  },
  map_ready: {
    name: "kabsi_map_ready",
    body: "Kabsi here. The Visibility Map of {{business}} is ready. Reply here to see it.",
    example: { business: "Smile Dental" },
    button: "Show me",
    v2: {
      name: "kabsi_map_ready_v2",
      body: "Kabsi here. The Visibility Map of {{business}} from your Kabsi account is ready. Reply here to see it.",
    },
  },
  access_change: {
    name: ACCESS_CHANGE_TEMPLATE,
    body: "Kabsi here. Access to the Business Profile of {{business}} has changed. Reply here to see what changed.",
    example: { business: "Smile Dental" },
    button: "Show me",
    v2: {
      name: "kabsi_access_change_v2",
      body: "Kabsi here. Access for Kabsi to the Business Profile of {{business}} has changed. Reply here to see what changed.",
    },
  },
  // 13b part 2: billing notices (session 10, master plan 10.2.9) reach the owner outside the 24-hour window.
  billing_notice: {
    name: "kabsi_billing_notice",
    body: "Kabsi here. There is an update about the Kabsi plan of {{business}}. Reply here to read it.",
    example: { business: "Smile Dental" },
    button: "Show me",
    // v2 was filed under Marketing by Meta on 28 Oct (pending), so the replacement is a new, more specific wording: v3.
    v2: {
      name: "kabsi_billing_notice_v3",
      body: "Kabsi here. Your Kabsi account for {{business}} has a billing update: a payment, receipt, trial date or plan change. Reply here to read the details.",
    },
  },
  // V3 (30.15 sections 3.3 and 3.4): a photo ready to approve (it can reach the owner outside the window when staff sent it), and the
  // monthly question. WhatsApp 2: submitted as Utility under these names; until approved they are held.
  photo_ready: {
    name: "kabsi_photo_ready",
    body: "Kabsi here. A photo for {{business}} is ready for your approval, and nothing goes on Google until you say yes. Reply here to see it.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  business_update: {
    name: "kabsi_business_update",
    body: "Kabsi here. Once a month Kabsi asks what is new at {{business}}, so its Business Profile stays right: any new services, prices or opening times? Reply here to answer.",
    example: { business: "Smile Dental" },
    button: "Show me",
    // Meta filed the first name under Marketing on 28 Oct (pending), so there is a v2 with no services or prices to read as an offer.
    v2: {
      name: "kabsi_business_update_v2",
      body: "Kabsi here. This is the monthly check on {{business}} that you set up with Kabsi: has anything changed, like opening times, services or contact details? Reply here to answer.",
    },
  },
  // V4 (30.16 section 3, 30.15 3.1): the next setup step during onboarding, and news about something the owner approved (on
  // Google, still on its way, or what failed). WhatsApp 2: submitted as Utility under these names; until approved they are held.
  setup_step: {
    name: "kabsi_setup_step",
    body: "Kabsi here. You started setting up Kabsi for {{business}}, and the next step is ready. Reply here to see it.",
    example: { business: "Smile Dental" },
    button: "Show me",
  },
  work_update: {
    name: "kabsi_work_update",
    body: "Kabsi here. There is news about a change you approved for {{business}}: it is on Google, still on its way, or needs another try. Reply here to read it.",
    example: { business: "Smile Dental" },
    button: "Show me",
    v2: {
      name: "kabsi_work_update_v2",
      body: "Kabsi here. The status of a change you approved for {{business}} has been updated: it is live on Google, in progress, or did not go through. Reply here to read the details.",
    },
  },
  staff_alert: {
    name: "kabsi_staff_alert",
    body: "Kabsi staff alert: {{summary}}. Reply here for the details.",
    example: { summary: "2 jobs failed in the last hour" },
    button: "Show me",
    // v2 was filed under Marketing by Meta on 28 Oct (pending), so the replacement is v3.
    v2: {
      name: "kabsi_staff_alert_v3",
      body: "Kabsi here. This is a service alert for your Kabsi staff account: {{summary}}. Reply here for the details.",
    },
  },
} as const satisfies Record<string, TemplateDef>;

export type TemplateKey = keyof typeof TEMPLATES;

/** Every template Kabsi submits: the first names, then the v2 names (same parameters, example and button). All UTILITY. */
export function allDefs(): TemplateDef[] {
  const out: TemplateDef[] = [];
  for (const def of Object.values(TEMPLATES) as TemplateDef[]) {
    out.push(def);
    if (def.v2) out.push({ name: def.v2.name, body: def.v2.body, example: def.example, button: def.button });
  }
  return out;
}

/** Where the last read of Meta's template statuses is kept (app_settings, JSON of name to status). */
export const TEMPLATE_STATUS_KEY = "whatsapp_template_status";

/** True for a replacement name (a v2 or later) from the table above. */
export const isReplacement = (name: string) => (Object.values(TEMPLATES) as TemplateDef[]).some((d) => d.v2?.name === name);

/** The name to send: the replacement name when its stored status reads APPROVED, else the name the code was given (the fallback).
 *  statusMap stores NOT_UTILITY for a replacement Meta filed under any other category, so it is never chosen. */
export function sendName(name: string, statuses: Record<string, string>): string {
  const def = (Object.values(TEMPLATES) as TemplateDef[]).find((d) => d.name === name);
  return def?.v2 && statuses[def.v2.name] === "APPROVED" ? def.v2.name : name;
}

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

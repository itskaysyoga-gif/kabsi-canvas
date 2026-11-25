// scripts/app-shots fixtures for the staff page (/staff, state "staff-admin"). Invented businesses and people only.
// Values or (ctx) => value; ctx.state is the route's state.
// Only `location` comes from fixtures.mjs, and only inside functions: fixtures.mjs imports this file, so its constants
// are not ready while this file's top level runs.
import { location } from "./fixtures.mjs";

const ORG_ID = "00000000-0000-4000-8000-0000000000bb";
const ago = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const ahead = (n) => ago(-n);

const staff = (c) => c.state === "staff-admin";
const LOC_B = "00000000-0000-4000-8000-0000000000a2";
const LOC_C = "00000000-0000-4000-8000-0000000000a3";
const ORG_B = "00000000-0000-4000-8000-0000000000b2";
const month = (n) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 1)).toISOString().slice(0, 10);
};

export const tables = {
  locations: (c) =>
    staff(c)
      ? [
          { ...location(c.state), concierge: false },
          {
            ...location(c.state),
            id: LOC_B,
            name: "Cedar Corner Bakery",
            organization_id: ORG_B,
            status: "active",
            country: "AE",
            created_at: ago(9),
            access_granted_at: ago(8),
          },
          {
            ...location(c.state),
            id: LOC_C,
            name: "Harbour Smiles Dental",
            organization_id: "00000000-0000-4000-8000-0000000000b3",
            status: "onboarding",
            onboarding_step: "access",
            country: "GB",
            created_at: ago(2),
            access_granted_at: null,
            concierge: true,
          },
        ]
      : undefined,
  staff_followups: [
    {
      id: "f1",
      kind: "whatsapp_nudge",
      location_name: "Harbour Smiles Dental",
      detail: "The phone number is in Staff, Contacts.",
      due_at: ago(1),
      created_at: ago(2),
    },
  ],
  provider_spend: [
    { provider: "dataforseo", month: month(0), calls: 412, micros: 2_470_000 },
    { provider: "ai_visibility", month: month(0), calls: 96, micros: 1_150_000 },
    { provider: "dataforseo", month: month(1), calls: 288, micros: 1_730_000 },
    { provider: "ai_visibility", month: month(1), calls: 40, micros: 480_000 },
  ],
  // Only the staff page's costs; other areas answer their own runs (fixtures.mjs hands undefined on).
  ai_visibility_runs: (c) =>
    staff(c)
      ? [
          ...Array.from({ length: 31 }, () => ({ provider: "chatgpt", cost_micros: 12_000 })),
          ...Array.from({ length: 22 }, () => ({ provider: "perplexity", cost_micros: 9_000 })),
        ]
      : undefined,
};

export const rpc = {
  google_mode: (c) => (staff(c) ? "mock" : null),
  save_signup_attribution: (c) => (staff(c) ? null : undefined),
  staff_founding_overview: {
    places: {
      total: 25,
      left: 23,
      open_to_any: false,
      by_trade: {
        beauty_hair: { cap: 10, taken: 1 },
        food: { cap: 5, taken: 1 },
        health: { cap: 5, taken: 0 },
        other: { cap: 5, taken: 0 },
      },
    },
    applications: [
      {
        id: "a1",
        created_at: ago(1),
        business_name: "Juniper Nail Studio",
        country: "AE",
        trade: "beauty_hair",
        business_kind: "Nail salon",
        whatsapp: "+971 50 000 0101",
        why_now: "We opened in the spring and nobody answers our reviews yet.",
        case_study: "anonymous",
        status: "new",
        decided_at: null,
        decision_note: null,
        organization_id: null,
        linked_at: null,
      },
      {
        id: "a2",
        created_at: ago(12),
        business_name: "Maple Street Salon",
        country: "AE",
        trade: "beauty_hair",
        business_kind: "Hair salon",
        whatsapp: "+971 50 000 0102",
        why_now: "Too many reviews waiting.",
        case_study: "named",
        status: "accepted",
        decided_at: ago(11),
        decision_note: null,
        organization_id: ORG_ID,
        linked_at: ago(10),
      },
      {
        id: "a3",
        created_at: ago(10),
        business_name: "Cedar Corner Bakery",
        country: "AE",
        trade: "food",
        business_kind: "Bakery",
        whatsapp: "+971 50 000 0103",
        why_now: "Our hours are wrong on Google every holiday.",
        case_study: "anonymous",
        status: "accepted",
        decided_at: ago(9),
        decision_note: null,
        organization_id: ORG_B,
        linked_at: ago(8),
      },
    ],
    members: [
      {
        application_id: "a2",
        business: "Maple Street Salon",
        trade: "beauty_hair",
        started_at: ago(10),
        ends_at: ahead(80),
        day: 11,
        approvals_7d: 6,
        weeks_with_approval: 2,
        weeks: 2,
        paying: false,
      },
      {
        application_id: "a3",
        business: "Cedar Corner Bakery",
        trade: "food",
        started_at: ago(8),
        ends_at: ahead(82),
        day: 9,
        approvals_7d: 2,
        weeks_with_approval: 1,
        weeks: 2,
        paying: false,
      },
    ],
    kill_gate: {
      program_day: 11,
      gate_day: 45,
      gate_on: ahead(34),
      weekly_approvers: 2,
      linked: 2,
      needed: 10,
      below: true,
    },
  },
  // App 5: the Today page's caps and the provider refusals of the last 24 hours.
  staff_today: (c) =>
    c.state === "staff-clear"
      ? { checked_at: ago(0), caps: { dataforseo_usd: 10, ai_visibility_usd: 5 }, refusals_24h: [] }
      : {
          checked_at: ago(0),
          caps: { dataforseo_usd: 10, ai_visibility_usd: 5 },
          trials_ending_3d: 2,
          refusals_24h: [
            {
              title:
                "DataForSEO refused the nearby check: no balance left. Kabsi tries again later on its own",
              at: ago(0.2),
            },
          ],
        },
  staff_founding_checklist: (c) => {
    const loc = c.body?.p_location;
    const food = loc === LOC_B;
    return {
      business: food ? "Cedar Corner Bakery" : "Maple Street Salon",
      items: [
        { item: "old_reviews", label: "Old reviews with no reply", found: food ? 3 : 7 },
        {
          item: "wrong_details",
          label: "Details on Google that differ from the owner's",
          found: food ? 1 : 0,
        },
        { item: "booking_link", label: "Booking link on the profile", found: food ? 1 : 0 },
        {
          item: "menu_link",
          label: "Menu link on the profile (food and drink)",
          found: food ? 1 : 0,
          applies: food,
        },
      ],
      done: food
        ? {}
        : {
            old_reviews: { done_at: ago(9), note: "Nadia approved all 7 on WhatsApp." },
            booking_link: { done_at: ago(9), note: null },
          },
    };
  },
  staff_founding_check: null,
  staff_concierge_queue: {
    count: 1,
    cap: 30,
    tasks: [
      {
        id: "t1",
        kind: "invite",
        created_at: ago(1),
        location_id: LOC_C,
        business: "Harbour Smiles Dental",
        address: "4 Quay Street, Bristol",
        consented: true,
        claimed_by: null,
        claimed_at: null,
        review: null,
        reply_text: null,
        approved_at: null,
      },
    ],
    businesses: [
      {
        id: LOC_C,
        name: "Harbour Smiles Dental",
        status: "onboarding",
        access: false,
        first_post_at: null,
        checked_today: false,
      },
    ],
  },
  staff_chats: [
    {
      id: "c1",
      updated_at: ago(0),
      surface: "site",
      status: "reported",
      first_page: "/pricing",
      country: "AE",
      language: "en",
      device: "phone",
      category: "pricing",
      intent: "buyer",
      lead_temperature: "warm",
      sentiment: "positive",
      business_type: "Cafe",
      summary: "Asked what the trial includes and how to cancel.",
      next_step: "Send the pricing page.",
      message_count: 6,
      email: null,
      name: "Omar K.",
      business_name: "Example Cafe",
      phone: null,
      signed_in_business: null,
    },
    {
      id: "c2",
      updated_at: ago(0.05),
      surface: "site",
      status: "handoff",
      first_page: "/pricing",
      country: "US",
      language: "en",
      device: "computer",
      category: "billing",
      intent: "existing_customer",
      lead_temperature: "hot",
      sentiment: "neutral",
      business_type: "Dentist",
      summary: "Wants a call about a second location.",
      next_step: "Call back today.",
      message_count: 4,
      email: "frontdesk@example.com",
      name: "Dana R.",
      business_name: null,
      phone: null,
      signed_in_business: "Harbour Smiles Dental",
    },
    {
      id: "c3",
      updated_at: ago(1.2),
      surface: "app",
      status: "closed",
      first_page: "/app/reviews",
      country: "US",
      language: "en",
      device: "phone",
      category: "reviews_help",
      intent: "existing_customer",
      lead_temperature: "cold",
      sentiment: "positive",
      business_type: "Bakery",
      summary: "Asked where to approve a reply.",
      next_step: null,
      message_count: 2,
      email: null,
      name: null,
      business_name: null,
      phone: null,
      signed_in_business: "Cedar Corner Bakery",
    },
  ],
  staff_chat_last: [
    {
      conversation_id: "c1",
      role: "user",
      content: "Thanks. And if I cancel before day 14, nothing is charged?",
      created_at: ago(0),
    },
    {
      conversation_id: "c2",
      role: "user",
      content: "Can someone call me about adding Kabsi to my second location?",
      created_at: ago(0.05),
    },
    {
      conversation_id: "c3",
      role: "assistant",
      content: "Your reply is waiting for your yes in Kabsi. Tap Approve and it goes to Google.",
      created_at: ago(1.2),
    },
  ],
  staff_chat_thread: [
    { id: 1, role: "user", content: "Hi. What does the trial include?", created_at: ago(0.01) },
    {
      id: 2,
      role: "assistant",
      content:
        "Everything Kabsi does: a reply ready for every review, your details watched every day, up to 2 posts a month and your weekly report. Nothing goes on Google without your yes.",
      created_at: ago(0.01),
    },
    { id: 3, role: "user", content: "Do I need a card?", created_at: ago(0.008) },
    {
      id: 4,
      role: "assistant",
      content:
        "Yes. 14 days free. Then 29 US dollars a month until you cancel. A card is needed to start. Cancel before day 14 and you pay nothing.",
      created_at: ago(0.008),
    },
    {
      id: 5,
      role: "user",
      content: "Thanks. And if I cancel before day 14, nothing is charged?",
      created_at: ago(0),
    },
  ],
  staff_chat_stats: [
    { dimension: "country", value: "AE", conversations: 4 },
    { dimension: "country", value: "GB", conversations: 2 },
    { dimension: "category", value: "pricing", conversations: 3 },
    { dimension: "intent", value: "buyer", conversations: 3 },
    { dimension: "temperature", value: "warm", conversations: 2 },
  ],
  staff_partners_overview: {
    places: { founding_total: 25, founding_left: 24 },
    partners: [],
    payouts: [],
    next_run_on: ahead(4).slice(0, 10),
  },
  // Sec 2: the operations view (public.staff_operations), invented rows.
  staff_operations: {
    checked_at: ago(0),
    google_writes: "on",
    stuck: [
      {
        id: "00000000-0000-4000-8000-0000000000d1",
        business: "Cedar Corner Bakery",
        what: "review_reply",
        state: "approved",
        since: ago(0.02),
        todo: "Not sent yet. Check the publish job under Jobs; if it is dead, the owner approves again.",
      },
    ],
    access_stopped: [
      {
        business: "Harbour Smiles Dental",
        location_id: LOC_C,
        state: "removed",
        since: ago(2),
        todo: "Kabsi was removed as Manager. The owner was emailed; follow up once on WhatsApp.",
      },
    ],
    failed_publications: [
      {
        id: "00000000-0000-4000-8000-0000000000d4",
        business: "Cedar Corner Bakery",
        what: "local_post",
        state: "rejected",
        at: ago(0.5),
        error: "INVALID_ARGUMENT: callToAction.url",
        todo: "Google refused it. Read the error; the owner was told and can edit and approve again.",
      },
    ],
    jobs: [
      {
        id: 4812,
        kind: "send_email",
        state: "dead",
        business: null,
        attempts: 5,
        at: ago(1),
        error: "resend 422: invalid to [email]",
        todo: "Stopped after its tries. Read the error, fix the cause, then queue it again from Job health.",
      },
    ],
    webhooks_rejected: [
      {
        source: "creem",
        reason: "status_401",
        count: 3,
        last_at: ago(0.1),
        todo: "A few refusals are normal (scanners). Nothing to do unless real events stop arriving.",
      },
    ],
  },
  staff_job_health: {
    schedules: [
      {
        name: "kabsi_sync_reviews",
        schedule: "*/15 * * * *",
        active: true,
        last_start: ago(0),
        last_status: "succeeded",
        last_message: null,
        failed_24h: 0,
      },
      {
        name: "kabsi_ai_visibility_tick",
        schedule: "*/15 * * * *",
        active: true,
        last_start: ago(0),
        last_status: "succeeded",
        last_message: null,
        failed_24h: 0,
      },
    ],
    jobs: [{ job: "sync_reviews", runs_7d: 640, fails_7d: 0, last_at: ago(0), last_fail_at: null }],
    recent_failures: [],
    queue: { pending: 2, running: 0, retrying: 0, due_late: 0, dead_7d: 0, failed_7d: 0 },
    stopped_jobs: [],
    http_errors_24h: 0,
    http_calls_24h: 214,
    emails_failed_24h: 0,
    emails_sent_24h: 9,
    publications_failed_7d: 0,
    reviews_blocked: 1,
    google_mode: "mock",
    email_from: "hello@kabsi.co",
    checked_at: ago(0),
  },
  staff_system_health: {
    checked_at: ago(0),
    google: {
      mode: "mock",
      breaker: { state: "closed", opened_at: null, open_until: null, failures_in_window: 0 },
      errors_24h: [],
      rate: [{ bucket: "business_profile", calls_last_minute: 3 }],
      places: { daily_cap: 500, calls_today: 41 },
    },
    sync: { connected: 2, late: 0, worst: [] },
    access_problems: [],
    queue: { pending: 2, running: 0, retrying: 0, due_late: 0, oldest_due_seconds: 20, dead: 0 },
    dead_jobs: [],
    publications: { failed_7d: 0, stuck: [], failed: [] },
    photos: { failed_7d: 0, stuck_checking: 0, recent: [] },
    delivery: {
      emails_failed_24h: 0,
      emails_sent_24h: 9,
      emails_queued_late: 0,
      notices_failed_24h: 0,
      notices_sending_late: 0,
      alerts_unsent: 0,
      alerts_oldest_unsent_minutes: 0,
      recent_failures: [],
    },
  },
};

export const functions = {};

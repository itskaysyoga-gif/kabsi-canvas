// Partners 2 (master plan 30.50 items 4 to 7, 30.51 item 6): the browser side of kabsi.co/partners/join and
// kabsi.co/partner. Every call goes to the programs Edge Function with the signed-in session; the browser writes no table.
// The words are docs/COPY.md, Partners 2.
import { supabase } from "@/lib/supabase";

/** Keep equal to PARTNER_KINDS and PARTNER_KIND_LABEL in supabase/functions/_shared/programs.ts (tests/partners2-web.test.ts). */
export const PARTNER_KIND_OPTIONS = [
  ["card_seller", "Review card seller"],
  ["agency", "Freelancer or small agency"],
  ["creator", "Creator"],
  ["accountant", "Consultant or accountant"],
  ["reseller", "POS or booking reseller"],
  ["customer", "Kabsi customer"],
] as const;
export type PartnerKind = (typeof PARTNER_KIND_OPTIONS)[number][0];

/** The countries the form lists, named in English by the browser. */
export const PARTNER_COUNTRIES = [
  "AE",
  "GB",
  "US",
  "SA",
  "QA",
  "KW",
  "BH",
  "OM",
  "IE",
  "CA",
  "AU",
  "NZ",
  "DE",
  "FR",
  "NL",
  "ES",
  "IT",
  "IN",
  "PK",
  "EG",
  "JO",
  "ZA",
  "NG",
  "KE",
] as const;
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const PAYOUT_OPTIONS = [
  ["paypal", "PayPal"],
  ["usdt", "USDT"],
  ["usdc", "USDC"],
] as const;
export type PayoutMethod = (typeof PAYOUT_OPTIONS)[number][0];
export const payoutLabel = (m: string | null | undefined) =>
  PAYOUT_OPTIONS.find(([k]) => k === m)?.[1] ?? m ?? "";

/** Keep equal to PARTNER_TERMS_VERSION in supabase/functions/_shared/programs.ts (tests/partners2-web.test.ts). */
export const PARTNER_TERMS_VERSION = "2026-11-11.1";

export const PARTNER_SITE = "https://kabsi.co";
export const partnerLink = (code: string) => `${PARTNER_SITE}/?via=${code}`;

export type PartnerHome = {
  result: "ok" | "not_partner";
  partner?: {
    code: string;
    name: string;
    kind: PartnerKind;
    country: string | null;
    status: string;
    founding_partner: boolean;
    reviewed: boolean;
    joined_at: string;
    terms_version: string;
    payout_method: PayoutMethod | null;
    payout_last4: string | null;
  };
  numbers?: {
    visits: number;
    visits_30d: number;
    trials: number;
    paying: number;
    cancelled: number;
    earned_cents: number;
    pending_cents: number;
    cleared_cents: number;
    paid_cents: number;
    test_cents: number;
    next_payout_on: string;
  };
  payout_ask?: boolean;
  businesses?: {
    trade: string | null;
    area: string | null;
    state: "joined" | "trial" | "paying" | "stopped";
    since: string;
  }[];
};

export class PartnerError extends Error {
  constructor(
    public code: string,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

const TRY_AGAIN = "Something went wrong. Please try again in a minute.";

async function call<T>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(`programs/${path}`, {
    method,
    ...(body ? { body } : {}),
  });
  if (error) {
    const j = (await (error as { context?: Response }).context?.json?.().catch(() => null)) as {
      error?: string;
      message?: string;
      field?: string;
    } | null;
    throw new PartnerError(j?.error ?? "failed", j?.message ?? TRY_AGAIN, j?.field);
  }
  return data as T;
}

export type JoinForm = {
  name: string;
  email: string;
  kind: PartnerKind | "";
  country: string;
  reach: string;
  uae_permit: string;
  uae_private: boolean;
  terms: boolean;
};

export const joinPartner = (f: JoinForm) =>
  call<{ ok: true; code: string; joined: boolean }>("partners/join", "POST", f);
export const partnerHome = () => call<PartnerHome>("partner", "GET");
export const askPayoutChange = (method: PayoutMethod, detail: string) =>
  call<{ ok: true; id: string; channel: "whatsapp" | "email" }>("partner/payout", "POST", {
    method,
    detail,
  });
export const confirmPayoutCode = (id: string, code: string) =>
  call<{ ok: true; method: PayoutMethod; last4: string }>("partner/payout/confirm", "POST", {
    id,
    code,
  });

export const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export function longDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Lines of docs/COPY.md, Partners 2. */
export const PARTNER_COPY = {
  joinTitle: "Join Kabsi Partners",
  joinMark: "Kabsi Partners",
  joinLead:
    "Sign in, answer five short questions, and your partner link is ready at once. There is no application.",
  signInFirst: "Sign in first. The same steps create your account.",
  kind: "What kind of partner are you?",
  country: "Your country",
  reach: "How will you share Kabsi?",
  reachHint: "For example: with the review cards I sell, or with my bookkeeping clients.",
  email: "Email for payouts and partner news",
  name: "Your name",
  uaePermit: "Your advertiser permit number",
  uaeHint: "UAE rules: share Kabsi in public only with an advertiser permit.",
  uaePrivate: "I will only share privately",
  terms: "I agree to the partner terms",
  termsVersion: (v: string) => `Version ${v}`,
  join: "Join and get my link",
  homeTitle: "Your partner home",
  homeMark: "partner home",
  linkLabel: "Your link",
  qrLabel: "Your QR code",
  copy: "Copy the link",
  copied: "Link copied",
  numbersTitle: "Your numbers so far",
  visits: "Visits",
  trials: "Trials",
  paying: "Paying businesses",
  earned: "Earned",
  pending: "Pending (30 days)",
  nextPayout: "Next payout",
  numbersNote:
    "From Kabsi's own ledger. A payment earns 25 percent once its 30 days have passed. A refund in that time cancels it.",
  testLine: (amount: string) => `Test mode: ${amount}, never paid.`,
  businessesTitle: "Businesses you brought",
  businessesNote: "You see the trade and area only, never the business's name or data.",
  noBusinesses: "None yet. Share your link with an owner you know.",
  state: {
    joined: "Joined",
    trial: "On the free trial",
    paying: "Paying",
    stopped: "Stopped",
  } as Record<string, string>,
  payoutTitle: "How you are paid",
  payoutNotYet: "Kabsi asks how you want to be paid once 50 US dollars has cleared.",
  payoutNow: (name: string) =>
    `${name}. Kabsi pays on the 5th of each month once 25 US dollars has cleared.`,
  payoutAsk: "Add how you want to be paid",
  payoutChange: "Change how you are paid",
  payoutMethod: "Paid by",
  paypalDetail: "Your PayPal email",
  walletDetail: "Your wallet address",
  payoutSend: "Confirm the change",
  waitWhatsApp: "Open WhatsApp and tap Yes, it's me. The change is saved only after that tap.",
  waitEmail: "We sent a 6-digit code to your email. Enter it here to save the change.",
  tapped: "I tapped it",
  code: "6-digit code",
  codeSend: "Save the change",
  saved: (name: string) => `Saved: ${name}.`,
  rulesTitle: "The rules",
  rules: [
    "Say on every post or message that you are a paid partner.",
    "Never say or suggest Kabsi works with Google, and never promise rankings, reviews or customers.",
    "Follow Google's review rules: no gating, no rewards for reviews, no fake reviews.",
    "No bulk or unsolicited messages, no ads on the Kabsi name, no coupon sites.",
    "Your own business, or one you run, earns nothing.",
  ],
  rulesLink: "Read the partner terms",
  review: "Kabsi reviews each partner before the first payout.",
  founding: "Founding Partner",
  notPartner: "You are not a Kabsi partner yet.",
  joinLink: "Join in two minutes",
} as const;

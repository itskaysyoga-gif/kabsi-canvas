// What the WhatsApp agent asks the onboarding side (V4, 30.16 section 3). Types only, so the agent's tests can pass fakes; the
// database side is onboarding/db.ts.
export type FirstBack = {
  location_id: string;
  business: string;
  name: string | null;
  /** The free check this business came from: the search, its date and one factual line. */
  check: { term: string; date: string; fact: string } | null;
};
export interface OnboardingHooks {
  /** After an owner's phone is connected: the business to welcome, while it is still before stage 4. */
  afterBind(userId: string, locationIds: string[], scanCode?: string | null): Promise<FirstBack | null>;
  /** The owner's Yes to setup messages on WhatsApp; the search to suggest (from the free check) unless one is set. */
  setupYes(locationId: string, userId: string): Promise<{ ok: boolean; suggested: string | null; hasKeyword: boolean }>;
  /** The owner asked for help: the staff phone gets the request and a draft for Rashid to send himself. */
  founderHelp(locationId: string, userId: string, phone: string): Promise<void>;
  claim(locationId: string, kind: string): Promise<boolean>;
  skipFirst(locationId: string): Promise<void>;
  /** The monthly answer's new services and prices, kept as "needs your OK" facts; how many were new. */
  proposeFacts(locationId: string, items: { key: "service" | "price_note"; text: string }[], month: string): Promise<number>;
  confirmFacts(locationId: string, userId: string, month: string): Promise<number>;
}

<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 18. Appendix B: decisions carried forward from the old spec

These older decisions are not contradicted by the six documents and still hold. Everything else in the old spec (D200 to D308) is retired.

| Old | Still true |
|---|---|
| D201, D205 | Stack: React frontend (TanStack Start, hosted on Vercel; built in Lovable until P0.1-03), Supabase (Postgres, Auth, Edge Functions, pg_cron, Storage), Cloudflare Worker, Resend, Anthropic, Sentry, PostHog, GitHub. Lovable Cloud was never enabled. |
| D202 | Every Google write needs an approval record in `publications`; no autopilot (now inside R-05's pipeline). |
| D203 (as amended by K-92, K-113) | One central Kabsi Google credential in secrets; no per-owner tokens, ever. |
| D206, D226 | The browser never writes tables directly; database-only steps are membership-checked RPCs, tested; Edge Functions are for external APIs and schedules. |
| D212, D213, D227, D231, D271 (cards are no longer sold, K-125; the redirects and the Worker stay) | Card codes from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, every tap goes straight to Google's review page, logging with `ctx.waitUntil`, KV write-through with no expiry, taps deduplicated without storing IPs, the Worker deployed on its own. |
| D225 (amended by K-91) | Email sign-in is a 6-digit code only, never a link. |
| D232 (as tightened by K-14, K-116.4) | Replies: 2 to 4 short sentences, no emoji or slang spellings, gender-neutral, no invented plans or promises, reviewer's language; Franco-Arabic gets simple English with at most one Lebanese word. |
| D235 | Mock mode is visible: a "Test mode" banner while `google_mode` is mock (concierge businesses see the early-access note). |
| D244 | No em or en dashes and no exclamation marks; AI output cleaned by `noDashes()` and the `clean_ai_text` trigger. |
| D251 | Owner-requested deletion of a business with 7 days to cancel. |
| D263 | Slack is the operations hub through the `ops_events` outbox; money is confirmed only on /staff. |
| D265, D266 | Server-side ownership checks on every conversation and session lookup; Sentry and logs scrubbed; ambiguous Google failures never auto-retried. |
| D267 (cap from K-88) | Concierge mode until live access, at most 20 businesses; never billed until a person has posted a real approved reply. |
| D270, D293 | Manager invitations accepted only for the Manager role and a matching consented business; owners invite the "Kabsi Clients" group by ID. |
| D274 (with K-32, K-106) **Retired 21 Oct 2026 (K-127)** | Partner economics: 30 percent commission for 12 months (40 percent for the first 10 partners), resale at $8 per business a month ($6 founding); partners never promise reviews, ratings or rankings. |
| D290 (with R-20) | The site never claims a company, licence or registration Kabsi does not have. |
| D292 **Retired 21 Oct 2026 (K-125, K-127; outreach follows the `kabsi-outreach` skill)** | Rashid may message Instagram accounts that sell NFC review cards, by hand, at most 20 a day; no outreach to business owners. |
| D295, D304 | `supabase/config.toml` is the single source of `verify_jwt`; deploys run from GitHub on push to `main`. |
| D307 | Turnstile on public forms with server-side checks. |

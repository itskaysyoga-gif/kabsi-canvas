# Region-aware NFC card wording

## Scope
Show Lebanon-only NFC card prices, included-card wording, bundles, and shipping copy only when the visitor or business is identified as Lebanese. Keep all plan prices unchanged, preserve the FAQ shipping answer and JSON-LD, and make no unrelated changes.

## Implementation
1. Add `src/lib/region.ts` with:
   - `isLebanonTimeZone()`, returning true only for the `Asia/Beirut` browser time zone.
   - `useIsLebanon(country?)`, hydration-safe by returning false on the server and first browser render, then checking the time zone, a browser language ending in `-LB`, or an already-loaded location country of `LB`.
2. Update public card wording in:
   - `src/routes/pricing.tsx`
   - `src/routes/index.tsx`
   - `src/routes/how-it-works.tsx`
   - `src/routes/partners.tsx`, card-related lines only
   Lebanese visitors retain the existing card copy and prices. Other visitors see: “Your review link and QR code are free in every country.”
3. Update signed-in plan wording in:
   - `src/components/onboarding/steps.tsx`, passing the location country already loaded by onboarding.
   - `src/routes/_authenticated/app/plan.tsx`, using its existing current-location data so card-included wording follows the business country without a new request.
4. Make the shared `CardShippingNote` in `src/components/marketing/parts.tsx` region-aware so its existing uses remain consistent without duplicating logic.
5. Leave the shipping FAQ and all JSON-LD untouched. Public page metadata remains unchanged because region detection is intentionally client-only and hydration-safe.

## Verification
- Search all named areas for remaining unconditional `$20`, card-included, extra-card, bundle, and Lebanon shipping copy.
- Run the project type-check.
- Check public pages at 390 px and 1440 px with a non-Lebanon browser locale/time zone, then with `Asia/Beirut`, confirming the correct text and no layout overflow.
- Check onboarding and the signed-in plan screen using their existing location data, with no added data request.
